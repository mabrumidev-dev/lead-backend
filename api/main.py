import sys
import os
import json
import uuid
import threading
import asyncio
import re
import logging
import time
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel

# Load .env file from project root (not api/)
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
except ImportError:
    pass

logging.basicConfig(level=logging.WARNING, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)
logger.warning("[MAIN] FastAPI starting up...")

sys.path.insert(0, os.path.dirname(__file__))
from scraper_engine import ScraperEngine, lookup_cnpj, search_social_media, check_health_plan, check_employee_count

# ── OpenAPI Tags ──
TAGS_METADATA = [
    {"name": "Health", "description": "Health check e status do servidor"},
    {"name": "Scraper", "description": "Google Maps scraping com SSE streaming"},
    {"name": "Enrichment", "description": "Enriquecimento de leads: CNPJ, redes sociais, plano de saude, colaboradores"},
    {"name": "CNPJ", "description": "Busca de empresas via CNPJ microservice (endereco, socio, filtros avancados)"},
    {"name": "WhatsApp", "description": "Envio de mensagens WhatsApp (placeholder)"},
    {"name": "Vision", "description": "Extracao de dados de imagens via IA"},
]

app = FastAPI(
    title="Mabrumi CRM Pro - API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    openapi_tags=TAGS_METADATA,
    description="Mabrumi CRM Pro - Backend API for lead scraping, enrichment, and CNPJ lookup",
)

ALLOWED_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory job store ──
jobs: dict[str, dict] = {}
jobs_lock = threading.Lock()

# ── TTL Cache for CNPJ lookups (thread-safe, LRU eviction) ──
class TTLCache:
    def __init__(self, maxsize: int = 500, ttl: int = 3600):
        self._cache: dict[str, tuple[dict, float]] = {}
        self._maxsize = maxsize
        self._ttl = ttl
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[dict]:
        with self._lock:
            if key in self._cache:
                value, ts = self._cache[key]
                if time.time() - ts < self._ttl:
                    return value
                else:
                    del self._cache[key]
        return None

    def set(self, key: str, value: dict):
        with self._lock:
            if len(self._cache) >= self._maxsize:
                oldest_key = min(self._cache, key=lambda k: self._cache[k][1])
                del self._cache[oldest_key]
            self._cache[key] = (value, time.time())

_cnpj_cache = TTLCache(maxsize=500, ttl=3600)  # 1h TTL, 500 entries max


class ScrapeRequest(BaseModel):
    query: str
    limit: int = 0

@app.get("/api/health", tags=["Health"])
async def health():
    """Health check do servidor."""
    return {"status": "ok", "version": "1.0.0"}

@app.post("/api/scrape", tags=["Scraper"])
async def start_scrape(req: ScrapeRequest):
    """Inicia um job de scraping do Google Maps. Retorna job_id para acompanhar via SSE em /api/scrape/{job_id}/stream."""
    job_id = str(uuid.uuid4())[:8]
    with jobs_lock:
        jobs[job_id] = {"status": "starting", "messages": [], "screenshots": [], "results": [], "progress": 0}
    def on_progress(message: str, progress: int, screenshot_b64: str = ""):
        with jobs_lock:
            if progress == -2 and screenshot_b64:
                jobs[job_id]["screenshots"].append(screenshot_b64)
            else:
                if message: jobs[job_id]["messages"].append(message)
                if progress >= 0: jobs[job_id]["progress"] = progress
    def run_scraper():
        import asyncio
        import sys
        import logging
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        log = logging.getLogger("scraper")
        log.warning(f"[SCRAPE] Thread started for job={job_id}")
        try:
            log.warning(f"[SCRAPE] Starting scrape for '{req.query}' limit={req.limit} job={job_id}")
            log.warning(f"[SCRAPE] Importing ScraperEngine...")
            from scraper_engine import ScraperEngine
            log.warning(f"[SCRAPE] Creating engine...")
            engine = ScraperEngine(search_query=req.query, limit=req.limit, on_progress=on_progress)
            log.warning(f"[SCRAPE] Engine created. Starting scrape...")
            results = engine.scrape()
            log.warning(f"[SCRAPE] Finished job {job_id}: {len(results)} results")
            with jobs_lock:
                jobs[job_id]["status"] = "done"
                jobs[job_id]["results"] = results
                jobs[job_id]["progress"] = 100
                jobs[job_id]["messages"].append(f"Concluido! {len(results)} registros coletados.")
        except Exception as e:
            log.error(f"[SCRAPE] CRASHED job {job_id}: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            with jobs_lock:
                jobs[job_id]["status"] = "done"
                jobs[job_id]["results"] = []
                jobs[job_id]["progress"] = 100
                jobs[job_id]["messages"].append(f"Erro no scraper: {type(e).__name__}: {str(e)[:200]}")
    thread = threading.Thread(target=run_scraper, daemon=True)
    thread.start()
    with jobs_lock:
        jobs[job_id]["thread"] = thread
    return {"job_id": job_id, "status": "started"}

@app.get("/api/scrape/{job_id}/stream", tags=["Scraper"])
async def stream_scrape(job_id: str):
    """SSE stream de progresso do scraping. Conecta via EventSource no frontend."""
    from sse_starlette.sse import EventSourceResponse
    async def event_generator():
        import logging
        log = logging.getLogger("sse")
        last_msg_idx, last_screenshot_idx = 0, 0
        heartbeat_count = 0
        log.warning(f"[SSE] Client connected for job {job_id}")
        while True:
            with jobs_lock:
                job = jobs.get(job_id)
                if not job:
                    yield {"event": "error", "data": json.dumps({"message": "Job nao encontrado"})}
                    return
                status, messages, screenshots, progress, results = job["status"], job["messages"], job["screenshots"], job["progress"], job["results"]
            while last_msg_idx < len(messages):
                yield {"event": "progress", "data": json.dumps({"message": messages[last_msg_idx], "progress": progress})}
                last_msg_idx += 1
            while last_screenshot_idx < len(screenshots):
                yield {"event": "screenshot", "data": json.dumps({"image": screenshots[last_screenshot_idx]})}
                last_screenshot_idx += 1
            if status == "done":
                log.warning(f"[SSE] Sending done event for job {job_id}: {len(results)} results")
                yield {"event": "done", "data": json.dumps({"results": results, "total": len(results), "progress": 100})}
                return
            if status == "cancelled":
                yield {"event": "error", "data": json.dumps({"message": "Cancelado"})}
                return
            heartbeat_count += 1
            if heartbeat_count % 10 == 0:
                yield {"event": "heartbeat", "data": json.dumps({"t": heartbeat_count})}
            await asyncio.sleep(0.5)
    return EventSourceResponse(event_generator())

@app.post("/api/vision/analyze", tags=["Vision"])
async def analyze_vision(file: UploadFile = File(...)):
    """Extrai dados de contato de uma imagem usando IA (Mimo v2.5 Pro)."""
    import httpx
    import base64
    import json
    import os
    contents = await file.read()
    base64_image = base64.b64encode(contents).decode('utf-8')
    api_key = os.environ.get("MIMO_API_KEY")
    if not api_key:
        raise Exception("MIMO_API_KEY não configurada no ambiente")
    mimo_base = os.environ.get("MIMO_BASE_URL", "https://token-plan-sgp.xiaomimimo.com/v1")
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{mimo_base}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "mimo-v2.5-pro",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract all contact data from this image. Return ONLY a valid JSON object with these exact keys: name, website, city, cnpj, email. Do not include any markdown or explanation."},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                        ]
                    }
                ],
                "max_tokens": 4096
            },
            timeout=60.0
        )
    if response.status_code != 200:
        raise Exception(f"Erro na IA: {response.text}")
    res_json = response.json()
    try:
        content_text = res_json['choices'][0]['message']['content']
        # Strip thinking/reasoning blocks if present in reasoning models (like Qwen)
        content_text = re.sub(r'<think>.*?</think>', '', content_text, flags=re.DOTALL).strip()
        match = re.search(r'\{.*\}', content_text, re.DOTALL)
        clean_json = match.group(0) if match else content_text.replace('```json', '').replace('```', '').strip()
        return json.loads(clean_json)
    except Exception as e:
        raise Exception(f"Erro ao parsear JSON da IA: {str(e)} | Resposta bruta: {res_json}")

# CNPJ microservice URL (local PostgreSQL + trigram)
CNPJ_SERVICE_URL = os.environ.get('CNPJ_SERVICE_URL', '') or 'http://localhost:8003'

# In-memory cache for CNPJ lookups (avoids re-querying same business)
_cnpj_cache: dict[str, dict] = {}


def _try_cnpj_service(website: str, business_name: str, city: str, phone: str) -> Optional[dict]:
    """Try CNPJ microservice first (local DB with trigram search)."""
    if not CNPJ_SERVICE_URL:
        return None
    try:
        import httpx
        with httpx.Client(timeout=5.0) as client:
            resp = client.post(f"{CNPJ_SERVICE_URL}/api/cnpj/enrich", json={
                'website': website,
                'name': business_name,
                'city': city,
                'phone': phone,
            })
            if resp.status_code == 200:
                data = resp.json()
                if data.get('cnpj'):
                    return data
    except Exception:
        pass
    return None


# ── CNPJ Search Endpoints (proxy to CNPJ microservice) ──

CNAE_CATEGORIAS = {
    'saude': {'label': 'Saúde', 'descricao': 'Hospitais, clínicas, laboratórios, farmácias'},
    'odontologia': {'label': 'Odontologia', 'descricao': 'Dentistas e clínicas odontológicas'},
    'farmacia': {'label': 'Farmácia', 'descricao': 'Farmácias e drogarias'},
    'clinica': {'label': 'Clínica', 'descricao': 'Clínicas médicas e especializadas'},
    'hospital': {'label': 'Hospital', 'descricao': 'Hospitais e pronto-socorros'},
    'laboratorio': {'label': 'Laboratório', 'descricao': 'Laboratórios de análises'},
    'comercio': {'label': 'Comércio', 'descricao': 'Comércio varejista e atacadista'},
    'restaurante': {'label': 'Restaurante', 'descricao': 'Restaurantes, bares e lanchonetes'},
    'alimentacao': {'label': 'Alimentação', 'descricao': 'Setor alimentício completo'},
    'advocacia': {'label': 'Advocacia', 'descricao': 'Escritórios de advocacia'},
    'contabilidade': {'label': 'Contabilidade', 'descricao': 'Contadores e escritórios contábeis'},
    'consultoria': {'label': 'Consultoria', 'descricao': 'Consultoria empresarial'},
    'imobiliaria': {'label': 'Imobiliária', 'descricao': 'Imobiliárias e gestão de imóveis'},
    'construcao': {'label': 'Construção', 'descricao': 'Construção civil'},
    'educacao': {'label': 'Educação', 'descricao': 'Escolas, faculdades, cursos'},
    'escola': {'label': 'Escola', 'descricao': 'Escolas de ensino fundamental e médio'},
    'academia': {'label': 'Academia', 'descricao': 'Academias e atividades físicas'},
    'petshop': {'label': 'Pet Shop', 'descricao': 'Pet shops e cuidados animais'},
    'salao': {'label': 'Salão', 'descricao': 'Salões de beleza e barbearias'},
    'tecnologia': {'label': 'Tecnologia', 'descricao': 'TI, software, dados'},
    'ti': {'label': 'TI', 'descricao': 'Tecnologia da informação'},
    'software': {'label': 'Software', 'descricao': 'Desenvolvimento de software'},
    'marketing': {'label': 'Marketing', 'descricao': 'Agências de marketing e publicidade'},
    'transporte': {'label': 'Transporte', 'descricao': 'Transporte de passageiros e carga'},
    'logistica': {'label': 'Logística', 'descricao': 'Logística e armazenagem'},
    'industria': {'label': 'Indústria', 'descricao': 'Indústria de transformação'},
    'automotivo': {'label': 'Automotivo', 'descricao': 'Concessionárias, oficinas, peças'},
    'seguros': {'label': 'Seguros', 'descricao': 'Seguros, corretoras, previdência'},
    'corretora': {'label': 'Corretora', 'descricao': 'Corretoras de seguros e títulos'},
    'financeiro': {'label': 'Financeiro', 'descricao': 'Bancos, financeiras, investimentos'},
    'hotel': {'label': 'Hotel', 'descricao': 'Hotéis e hospedagens'},
    'turismo': {'label': 'Turismo', 'descricao': 'Agências de turismo'},
    'eventos': {'label': 'Eventos', 'descricao': 'Eventos e entretenimento'},
    'beleza': {'label': 'Beleza', 'descricao': 'Cosméticos e tratamentos estéticos'},
}


def _proxy_to_cnpj_service(endpoint: str, params: dict = None) -> Optional[dict]:
    """Proxy request to CNPJ microservice if available."""
    if not CNPJ_SERVICE_URL:
        return None
    try:
        import httpx
        with httpx.Client(timeout=httpx.Timeout(connect=3.0, read=10.0, write=5.0, pool=5.0)) as client:
            resp = client.get(f"{CNPJ_SERVICE_URL}{endpoint}", params=params)
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        logger.warning(f"[CNPJ PROXY] Error calling {endpoint}: {e}")
    return None


@app.get("/api/cnpj/lookup", tags=["CNPJ"])
async def cnpj_lookup(
    cnpj: str = Query(..., description="CNPJ para consultar (com ou sem pontuacao)"),
):
    """Consulta dados de uma empresa pelo CNPJ.

    Retorna todos os dados disponiveis: razao social, nome fantasia, situacao cadastral,
    porte, capital social, CNAE, QSA (socios), endereco, telefone, email, etc.

    Fonte: API Minha Receita (gratuita).
    """
    import re as _re
    from scraper_engine import _lookup_cnpj_api, _is_valid_cnpj

    # Clean CNPJ - remove formatting
    cnpj_digits = _re.sub(r'\D', '', cnpj)

    if len(cnpj_digits) != 14:
        return {"error": "CNPJ deve ter 14 digitos", "received": cnpj}

    if not _is_valid_cnpj(cnpj_digits):
        return {"error": "CNPJ invalido (digitos verificadores incorretos)", "cnpj": cnpj_digits}

    # Try CNPJ microservice first (local DB)
    if CNPJ_SERVICE_URL:
        try:
            import httpx
            formatted = f"{cnpj_digits[:2]}.{cnpj_digits[2:5]}.{cnpj_digits[5:8]}/{cnpj_digits[8:12]}-{cnpj_digits[12:14]}"
            with httpx.Client(timeout=5.0) as client:
                resp = client.get(f"{CNPJ_SERVICE_URL}/api/cnpj/busca-endereco", params={"cep": "", "limit": 1})
                # If microservice is up, try direct lookup
                if resp.status_code == 200:
                    resp2 = client.get(f"{CNPJ_SERVICE_URL}/api/cnpj/enrich", params={"cnpj": cnpj_digits})
                    if resp2.status_code == 200:
                        data = resp2.json()
                        if data.get("cnpj"):
                            return data
        except Exception:
            pass

    # Fallback: Minha Receita API
    try:
        loop = asyncio.get_event_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(None, _lookup_cnpj_api, cnpj_digits),
            timeout=15.0,
        )
        if result:
            return result
        return {"error": "CNPJ nao encontrado", "cnpj": cnpj_digits}
    except asyncio.TimeoutError:
        return {"error": "Timeout ao consultar CNPJ", "cnpj": cnpj_digits}
    except Exception as e:
        return {"error": f"Erro ao consultar: {str(e)}", "cnpj": cnpj_digits}


@app.get("/api/cnpj/busca-endereco", tags=["CNPJ"])
async def busca_endereco(
    cep: str = "",
    logradouro: str = "",
    bairro: str = "",
    municipio: str = "",
    uf: str = "",
    cnae: str = "",
    cnae_categoria: str = "",
    porte: str = "",
    situacao: str = "02",
    limit: int = 20
):
    """Busca empresas por endereço. Proxy to CNPJ microservice."""
    result = _proxy_to_cnpj_service("/api/cnpj/busca-endereco", {
        "cep": cep, "logradouro": logradouro, "bairro": bairro,
        "municipio": municipio, "uf": uf, "cnae": cnae,
        "cnae_categoria": cnae_categoria, "porte": porte,
        "situacao": situacao, "limit": limit
    })
    if result:
        return result
    return {"total": 0, "filtros": {}, "results": [], "error": "CNPJ microservice não configurado. Funciona apenas em modo local (Docker)."}


@app.get("/api/cnpj/busca-socio", tags=["CNPJ"])
async def busca_socio(
    nome: str = Query("", min_length=3, description="Nome do socio (min. 3 caracteres)"),
    uf: str = "",
    municipio: str = "",
    limit: int = 20
):
    """Busca empresas por sócio. Proxy to CNPJ microservice."""
    if not nome or len(nome) < 3:
        return {"total": 0, "results": [], "error": "Nome do sócio obrigatório (mín. 3 chars)"}
    result = _proxy_to_cnpj_service("/api/cnpj/busca-socio", {
        "nome": nome, "uf": uf, "municipio": municipio, "limit": limit
    })
    if result:
        return result
    return {"total": 0, "results": [], "error": "CNPJ microservice não configurado. Funciona apenas em modo local (Docker)."}


@app.get("/api/cnpj/busca-avancada", tags=["CNPJ"])
async def busca_avancada(
    uf: str = "",
    municipio: str = "",
    bairro: str = "",
    cep: str = "",
    cnae: str = "",
    cnae_categoria: str = "",
    porte: str = "",
    capital_min: float = 0,
    capital_max: float = 0,
    idade_min: int = 0,
    idade_max: int = 0,
    apenas_matriz: bool = False,
    tem_telefone: bool = False,
    tem_simples: bool = False,
    prospect_score_min: int = 0,
    situacao: str = "02",
    order_by: str = "score",
    limit: int = 20
):
    """Busca avançada com filtros inteligentes. Proxy to CNPJ microservice."""
    result = _proxy_to_cnpj_service("/api/cnpj/busca-avancada", {
        "uf": uf, "municipio": municipio, "bairro": bairro, "cep": cep,
        "cnae": cnae, "cnae_categoria": cnae_categoria, "porte": porte,
        "capital_min": capital_min, "capital_max": capital_max,
        "idade_min": idade_min, "idade_max": idade_max,
        "apenas_matriz": apenas_matriz, "tem_telefone": tem_telefone,
        "tem_simples": tem_simples, "prospect_score_min": prospect_score_min,
        "situacao": situacao, "order_by": order_by, "limit": limit
    })
    if result:
        return result
    return {"total": 0, "filtros": {}, "results": [], "error": "CNPJ microservice não configurado. Funciona apenas em modo local (Docker)."}


@app.get("/api/cnpj/cnae/categorias", tags=["CNPJ"])
async def listar_categorias_cnae():
    """Lista as 34 categorias CNAE predefinidas (funciona sem microservice)."""
    return {"categorias": CNAE_CATEGORIAS}


@app.post("/api/whatsapp/send", tags=["WhatsApp"])
async def whatsapp_send(data: dict):
    """Envia mensagem WhatsApp. ATUALMENTE: placeholder (nao envia de verdade).

    TODO: Integrar com Evolution API, Z-API, ou WhatsApp Business API.
    """
    phone = data.get("phone", "")
    message = data.get("message", "")
    if not phone or not message:
        return {"error": "phone and message required"}
    logger.warning(f"[WHATSAPP] Would send to {phone}: {message[:50]}...")
    return {"status": "placeholder", "phone": phone, "message_preview": message[:100], "note": "Endpoint placeholder - integracao WhatsApp pendente"}


@app.post("/api/enrich", tags=["Enrichment"])
async def enrich_lead(data: dict):
    """Enriquece um lead com dados do CNPJ, responsavel, socios, etc.

    Prioridade: CNPJ microservice (local DB) -> lookup_cnpj (multi-source) -> fallback Google.
    Resultado fica em cache por 1 hora (max 500 entradas).
    """
    log = logging.getLogger("enrich")
    from scraper_engine import _fallback_google_search, _normalize_phone
    website, business_name, city, phone = data.get("website", ""), data.get("name", ""), data.get("city", ""), data.get("phone", "")
    log.warning(f"[ENRICH] Called: website={website} name={business_name} city={city} phone={phone}")

    # Cache check
    phone_digits = re.sub(r'\D', '', phone) if phone else ""
    cache_key = phone_digits or business_name.lower().strip()
    if cache_key:
        cached = _cnpj_cache.get(cache_key)
        if cached:
            log.warning(f"[ENRICH] Cache HIT for '{cache_key}'")
            return cached

    # Priority 1: Try CNPJ microservice (local DB, instant)
    if CNPJ_SERVICE_URL:
        log.warning(f"[ENRICH] Trying CNPJ microservice...")
        try:
            loop = asyncio.get_event_loop()
            cnpj_result = await asyncio.wait_for(
                loop.run_in_executor(None, _try_cnpj_service, website, business_name, city, phone),
                timeout=8.0,
            )
            if cnpj_result:
                log.warning(f"[ENRICH] CNPJ service found: {cnpj_result.get('cnpj', '')}")
                if cache_key:
                    _cnpj_cache.set(cache_key, cnpj_result)
                return cnpj_result
        except asyncio.TimeoutError:
            log.warning("[ENRICH] CNPJ service timeout, falling back...")
        except Exception as e:
            log.warning(f"[ENRICH] CNPJ service error: {e}")

    try:
        loop = asyncio.get_event_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(None, lookup_cnpj, website, business_name, city, phone),
            timeout=30.0,
        )
        log.warning(f"[ENRICH] Result: {'FOUND' if result else 'EMPTY'} cnpj={result.get('cnpj','') if result else ''}")
        if result:
            # Cache the result
            if cache_key:
                _cnpj_cache.set(cache_key, result)
            return result
    except asyncio.TimeoutError:
        log.error(f"[ENRICH] TIMEOUT after 30s for name={business_name}")
    except Exception as e:
        log.error(f"[ENRICH] Error: {type(e).__name__}: {e}")
    
    log.warning(f"[ENRICH] CNPJ lookup failed, trying fallback Google Search...")
    try:
        state = ""
        if city:
            state_match = re.search(r'([A-Z]{2})', city)
            if state_match:
                state = state_match.group(1)
        fallback_result = await asyncio.wait_for(
            loop.run_in_executor(None, _fallback_google_search, business_name, city, state),
            timeout=12.0,
        )
        if fallback_result:
            log.warning(f"[ENRICH] Fallback found CNPJ: {fallback_result.get('cnpj','')}")
            result = {
                "responsavel": fallback_result.get("responsavel", ""),
                "socios": fallback_result.get("socios", ""),
                "cnpj": fallback_result.get("cnpj", ""),
                "razao_social": fallback_result.get("razao_social", ""),
                "nome_fantasia": fallback_result.get("nome_fantasia", ""),
                "situacao_cadastral": fallback_result.get("situacao_cadastral", ""),
                "natureza_juridica": fallback_result.get("natureza_juridica", ""),
                "porte": fallback_result.get("porte", ""),
                "capital_social": fallback_result.get("capital_social", ""),
                "atividade_principal": fallback_result.get("atividade_principal", ""),
                "cnae_fiscal": fallback_result.get("cnae_fiscal", ""),
                "cnaes_secundarios": fallback_result.get("cnaes_secundarios", []),
                "opcao_simples": fallback_result.get("opcao_simples"),
                "opcao_mei": fallback_result.get("opcao_mei"),
                "regime_tributario": fallback_result.get("regime_tributario", []),
                "situacao_especial": fallback_result.get("situacao_especial", ""),
                "data_inicio_atividade": fallback_result.get("data_inicio_atividade", ""),
                "identificador_matriz_filial": fallback_result.get("identificador_matriz_filial", ""),
                "cep": fallback_result.get("cep", ""),
                "uf": fallback_result.get("uf", ""),
                "municipio": fallback_result.get("municipio", ""),
                "bairro": fallback_result.get("bairro", ""),
                "endereco_completo": fallback_result.get("endereco_completo", ""),
                "telefone_1": fallback_result.get("telefone_1", ""),
                "telefone_2": fallback_result.get("telefone_2", ""),
                "fax": fallback_result.get("fax", ""),
                "email": fallback_result.get("email", ""),
                "qsa": fallback_result.get("qsa", []),
                "entidade_federativa": fallback_result.get("entidade_federativa", ""),
                "codigo_municipio_ibge": fallback_result.get("codigo_municipio_ibge", ""),
                "data_opcao_simples": fallback_result.get("data_opcao_simples", ""),
                "data_situacao_cadastral": fallback_result.get("data_situacao_cadastral", ""),
                "motivo_situacao": fallback_result.get("motivo_situacao", ""),
            }
            if cache_key:
                _cnpj_cache.set(cache_key, result)
            return result
    except Exception as e:
        log.error(f"[ENRICH] Fallback error: {type(e).__name__}: {e}")
    return {"responsavel": "", "socios": "", "cnpj": "", "razao_social": "", "nome_fantasia": "", "situacao_cadastral": "", "natureza_juridica": "", "porte": "", "capital_social": "", "atividade_principal": "", "cnae_fiscal": "", "cnaes_secundarios": [], "opcao_simples": None, "opcao_mei": None, "regime_tributario": [], "situacao_especial": "", "data_inicio_atividade": "", "identificador_matriz_filial": "", "cep": "", "uf": "", "municipio": "", "bairro": "", "endereco_completo": "", "telefone_1": "", "telefone_2": "", "fax": "", "email": "", "qsa": [], "entidade_federativa": "", "codigo_municipio_ibge": "", "data_opcao_simples": "", "data_situacao_cadastral": "", "motivo_situacao": ""}

@app.post("/api/social-search", tags=["Enrichment"])
async def social_search(data: dict):
    """Busca redes sociais (LinkedIn, Instagram, Facebook, Twitter/X) para um responsavel/negocio."""
    name, company, city = data.get("name", ""), data.get("company", ""), data.get("city", "")
    business_name, website = data.get("business_name", ""), data.get("website", "")
    if not name and not business_name and not website: return {"error": "Nome, negocio ou site obrigatorio"}
    return search_social_media(name=name, company=company, city=city, business_name=business_name, website=website)

@app.post("/api/health-plan-check", tags=["Enrichment"])
def health_plan_check(data: dict):
    """Verifica se uma empresa provavelmente tem plano de saude corporativo."""
    return check_health_plan(cnpj=data.get("cnpj", ""), name=data.get("name", ""), porte=data.get("porte", ""), qtd_funcionarios=data.get("qtd_funcionarios", ""), capital_social=data.get("capital_social", ""), cnae=data.get("cnae", ""))

@app.post("/api/employee-count", tags=["Enrichment"])
def employee_count(data: dict):
    """Estima quantidade de colaboradores via Wikipedia, Bing, LinkedIn, ou CNAE+porte."""
    return check_employee_count(name=data.get("name", ""), cnpj=data.get("cnpj", ""), porte=data.get("porte", ""), capital_social=data.get("capital_social", ""), cnae=data.get("cnae", ""))

@app.get("/api/scrape/{job_id}", tags=["Scraper"])
async def get_scrape_status(job_id: str):
    """Retorna status e progresso de um job de scraping."""
    with jobs_lock:
        job = jobs.get(job_id)
        if not job: return {"error": "Job nao encontrado"}
        return {"status": job["status"], "progress": job["progress"], "total_results": len(job["results"]), "messages": job["messages"]}

@app.delete("/api/scrape/{job_id}", tags=["Scraper"])
async def cancel_scrape(job_id: str):
    """Cancela um job de scraping em andamento."""
    with jobs_lock:
        job = jobs.get(job_id)
        if not job: return {"error": "Job nao encontrado"}
        job["status"] = "cancelled"
    return {"status": "cancelled"}

DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "dist")
if os.path.isdir(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")
    # SPA catch-all - exclude API docs and static files
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        """Serve React SPA. Excludes /docs, /redoc, /openapi.json, /api/."""
        # Don't serve SPA for API docs or API routes
        if full_path.startswith(("docs", "redoc", "openapi.json", "api/")):
            return HTMLResponse(content="Not Found", status_code=404)
        
        file_path = os.path.join(DIST_DIR, full_path)
        if os.path.isfile(file_path): return FileResponse(file_path)
        html_path = os.path.join(DIST_DIR, "index.html")
        with open(html_path, "r") as f:
            html = f.read()
        supabase_url = os.environ.get("VITE_SUPABASE_URL", "")
        supabase_key = os.environ.get("VITE_SUPABASE_ANON_KEY", "")
        api_url = os.environ.get("VITE_API_URL", "")
        config_script = f"<script>window.__SUPABASE_CONFIG__={{url:'{supabase_url}',anonKey:'{supabase_key}'}};window.__API_URL__='{api_url}';</script>"
        html = html.replace("<head>", f"<head>{config_script}", 1)
        return HTMLResponse(content=html)