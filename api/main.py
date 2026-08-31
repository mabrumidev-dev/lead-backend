import sys
import os
import json
import uuid
import threading
import asyncio
import re
import logging
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel

logging.basicConfig(level=logging.WARNING, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)
logger.warning("[MAIN] FastAPI starting up...")

sys.path.insert(0, os.path.dirname(__file__))
from scraper_engine import ScraperEngine, lookup_cnpj, search_social_media, check_health_plan, check_employee_count

app = FastAPI(title="Mabrumi Scraper API", version="1.0.0")

ALLOWED_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

jobs: dict[str, dict] = {}
jobs_lock = threading.Lock()

class ScrapeRequest(BaseModel):
    query: str
    limit: int = 0

@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.post("/api/scrape")
async def start_scrape(req: ScrapeRequest):
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

@app.get("/api/scrape/{job_id}/stream")
async def stream_scrape(job_id: str):
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

@app.post("/api/vision/analyze")
async def analyze_vision(file: UploadFile = File(...)):
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

@app.post("/api/enrich")
async def enrich_lead(data: dict):
    import logging
    import concurrent.futures
    log = logging.getLogger("enrich")
    from scraper_engine import _fallback_google_search, _normalize_phone
    website, business_name, city, phone = data.get("website", ""), data.get("name", ""), data.get("city", ""), data.get("phone", "")
    log.warning(f"[ENRICH] Called: website={website} name={business_name} city={city} phone={phone}")
    try:
        loop = asyncio.get_event_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(None, lookup_cnpj, website, business_name, city, phone),
            timeout=30.0,
        )
        log.warning(f"[ENRICH] Result: {'FOUND' if result else 'EMPTY'} cnpj={result.get('cnpj','') if result else ''}")
        if result:
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
            return {
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
    except Exception as e:
        log.error(f"[ENRICH] Fallback error: {type(e).__name__}: {e}")
    return {"responsavel": "", "socios": "", "cnpj": "", "razao_social": "", "nome_fantasia": "", "situacao_cadastral": "", "natureza_juridica": "", "porte": "", "capital_social": "", "atividade_principal": "", "cnae_fiscal": "", "cnaes_secundarios": [], "opcao_simples": None, "opcao_mei": None, "regime_tributario": [], "situacao_especial": "", "data_inicio_atividade": "", "identificador_matriz_filial": "", "cep": "", "uf": "", "municipio": "", "bairro": "", "endereco_completo": "", "telefone_1": "", "telefone_2": "", "fax": "", "email": "", "qsa": [], "entidade_federativa": "", "codigo_municipio_ibge": "", "data_opcao_simples": "", "data_situacao_cadastral": "", "motivo_situacao": ""}

@app.post("/api/social-search")
async def social_search(data: dict):
    name, company, city = data.get("name", ""), data.get("company", ""), data.get("city", "")
    business_name, website = data.get("business_name", ""), data.get("website", "")
    if not name and not business_name and not website: return {"error": "Nome, negocio ou site obrigatorio"}
    return search_social_media(name=name, company=company, city=city, business_name=business_name, website=website)

@app.post("/api/health-plan-check")
def health_plan_check(data: dict):
    return check_health_plan(cnpj=data.get("cnpj", ""), name=data.get("name", ""), porte=data.get("porte", ""), qtd_funcionarios=data.get("qtd_funcionarios", ""), capital_social=data.get("capital_social", ""), cnae=data.get("cnae", ""))

@app.post("/api/employee-count")
def employee_count(data: dict):
    return check_employee_count(name=data.get("name", ""), cnpj=data.get("cnpj", ""), porte=data.get("porte", ""), capital_social=data.get("capital_social", ""), cnae=data.get("cnae", ""))

@app.get("/api/scrape/{job_id}")
async def get_scrape_status(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
        if not job: return {"error": "Job nao encontrado"}
        return {"status": job["status"], "progress": job["progress"], "total_results": len(job["results"]), "messages": job["messages"]}

@app.delete("/api/scrape/{job_id}")
async def cancel_scrape(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
        if not job: return {"error": "Job nao encontrado"}
        job["status"] = "cancelled"
    return {"status": "cancelled"}

DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "dist")
if os.path.isdir(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
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