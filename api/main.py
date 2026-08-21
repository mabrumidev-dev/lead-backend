"""
FastAPI backend for Google Maps Scraper integration.
Serves both API endpoints and the built React frontend.
"""

import sys
import os
import json
import uuid
import threading
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(__file__))
from scraper_engine import ScraperEngine, lookup_cnpj, search_social_media, check_health_plan, check_employee_count

app = FastAPI(title="Mabrumi Scraper API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        jobs[job_id] = {
            "status": "starting",
            "messages": [],
            "screenshots": [],
            "results": [],
            "progress": 0,
        }

    def on_progress(message: str, progress: int, screenshot_b64: str = ""):
        with jobs_lock:
            if progress == -2 and screenshot_b64:
                jobs[job_id]["screenshots"].append(screenshot_b64)
            else:
                if message:
                    jobs[job_id]["messages"].append(message)
                if progress >= 0:
                    jobs[job_id]["progress"] = progress

    def run_scraper():
        engine = ScraperEngine(
            search_query=req.query,
            limit=req.limit,
            on_progress=on_progress,
        )
        results = engine.scrape()
        with jobs_lock:
            jobs[job_id]["status"] = "done"
            jobs[job_id]["results"] = results
            jobs[job_id]["progress"] = 100
            jobs[job_id]["messages"].append(f"Concluido! {len(results)} registros coletados.")

    thread = threading.Thread(target=run_scraper, daemon=True)
    thread.start()

    with jobs_lock:
        jobs[job_id]["thread"] = thread

    return {"job_id": job_id, "status": "started"}


@app.get("/api/scrape/{job_id}/stream")
async def stream_scrape(job_id: str):
    async def event_generator():
        last_msg_idx = 0
        last_screenshot_idx = 0
        while True:
            with jobs_lock:
                job = jobs.get(job_id)
                if not job:
                    yield {"event": "error", "data": json.dumps({"message": "Job nao encontrado"})}
                    return

                status = job["status"]
                messages = job["messages"]
                screenshots = job["screenshots"]
                progress = job["progress"]
                results = job["results"]

            while last_msg_idx < len(messages):
                yield {
                    "event": "progress",
                    "data": json.dumps({
                        "message": messages[last_msg_idx],
                        "progress": progress,
                    }),
                }
                last_msg_idx += 1

            while last_screenshot_idx < len(screenshots):
                yield {
                    "event": "screenshot",
                    "data": json.dumps({
                        "image": screenshots[last_screenshot_idx],
                    }),
                }
                last_screenshot_idx += 1

            if status == "done":
                yield {
                    "event": "done",
                    "data": json.dumps({
                        "results": results,
                        "total": len(results),
                        "progress": 100,
                    }),
                }
                return

            if status == "cancelled":
                yield {"event": "error", "data": json.dumps({"message": "Cancelado"})}
                return

            await asyncio.sleep(0.5)

    from sse_starlette.sse import EventSourceResponse
    return EventSourceResponse(event_generator())


@app.post("/api/enrich")
async def enrich_lead(data: dict):
    website = data.get("website", "")
    business_name = data.get("name", "")
    city = data.get("city", "")
    result = lookup_cnpj(website, business_name, city)
    if result:
        return result
    return {
        "responsavel": "", "socios": "", "cnpj": "", "razao_social": "",
        "nome_fantasia": "", "situacao_cadastral": "", "natureza_juridica": "",
        "porte": "", "capital_social": "", "atividade_principal": "",
        "cnae_fiscal": "", "cnaes_secundarios": [], "opcao_simples": None,
        "opcao_mei": None, "regime_tributario": [], "situacao_especial": "",
        "data_inicio_atividade": "", "identificador_matriz_filial": "",
        "cep": "", "uf": "", "municipio": "", "bairro": "",
        "endereco_completo": "", "telefone_1": "", "telefone_2": "",
        "fax": "", "email": "", "responsavel": "", "socios": "",
        "qsa": [], "entidade_federativa": "", "codigo_municipio_ibge": "",
        "data_opcao_simples": "", "data_situacao_cadastral": "",
        "motivo_situacao": "",
    }


@app.post("/api/social-search")
async def social_search(data: dict):
    name = data.get("name", "")
    company = data.get("company", "")
    city = data.get("city", "")
    business_name = data.get("business_name", "")
    website = data.get("website", "")
    if not name and not business_name and not website:
        return {"error": "Nome, negocio ou site obrigatorio"}
    result = search_social_media(name=name, company=company, city=city, business_name=business_name, website=website)
    return result


@app.post("/api/health-plan-check")
def health_plan_check(data: dict):
    cnpj = data.get("cnpj", "")
    name = data.get("name", "")
    porte = data.get("porte", "")
    qtd_funcionarios = data.get("qtd_funcionarios", "")
    capital_social = data.get("capital_social", "")
    cnae = data.get("cnae", "")
    result = check_health_plan(cnpj=cnpj, name=name, porte=porte, qtd_funcionarios=qtd_funcionarios, capital_social=capital_social, cnae=cnae)
    return result


@app.post("/api/employee-count")
def employee_count(data: dict):
    name = data.get("name", "")
    cnpj = data.get("cnpj", "")
    porte = data.get("porte", "")
    capital_social = data.get("capital_social", "")
    cnae = data.get("cnae", "")
    result = check_employee_count(name=name, cnpj=cnpj, porte=porte,
                                   capital_social=capital_social, cnae=cnae)
    return result


@app.get("/api/scrape/{job_id}")
async def get_scrape_status(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            return {"error": "Job nao encontrado"}
        return {
            "status": job["status"],
            "progress": job["progress"],
            "total_results": len(job["results"]),
            "messages": job["messages"],
        }


@app.delete("/api/scrape/{job_id}")
async def cancel_scrape(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            return {"error": "Job nao encontrado"}
        job["status"] = "cancelled"
    return {"status": "cancelled"}


DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "dist")

if os.path.isdir(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(DIST_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        html_path = os.path.join(DIST_DIR, "index.html")
        with open(html_path, "r") as f:
            html = f.read()
        supabase_url = os.environ.get("VITE_SUPABASE_URL", "")
        supabase_key = os.environ.get("VITE_SUPABASE_ANON_KEY", "")
        api_url = os.environ.get("VITE_API_URL", "")
        config_script = f"<script>window.__SUPABASE_CONFIG__={{url:'{supabase_url}',anonKey:'{supabase_key}'}};window.__API_URL__='{api_url}';</script>"
        html = html.replace("<head>", f"<head>{config_script}", 1)
        return HTMLResponse(content=html)
