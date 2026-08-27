"""
Scraper engine with live screenshot support and lead limit.
"""

import sys
import os

from bs4 import BeautifulSoup
from time import sleep
import time
import re
import random
import base64
import requests
from typing import Callable, Optional

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
except ImportError:
    sync_playwright = None
    PlaywrightTimeout = Exception


def _is_valid_cnpj(cnpj_digits: str) -> bool:
    """Validate CNPJ using check digit algorithm."""
    if len(cnpj_digits) != 14 or not cnpj_digits.isdigit():
        return False
    if cnpj_digits == cnpj_digits[0] * 14:
        return False
    weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    sum1 = sum(int(cnpj_digits[i]) * weights1[i] for i in range(12))
    d1 = 11 - (sum1 % 11)
    d1 = 0 if d1 > 9 else d1
    sum2 = sum(int(cnpj_digits[i]) * weights2[i] for i in range(13))
    d2 = 11 - (sum2 % 11)
    d2 = 0 if d2 > 9 else d2
    return int(cnpj_digits[12]) == d1 and int(cnpj_digits[13]) == d2


def _extract_valid_cnpj(text: str) -> Optional[str]:
    """Extract a valid CNPJ from text using check digit validation."""
    formatted = re.findall(r'(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})', text)
    for match in formatted:
        digits = re.sub(r'\D', '', match)
        if _is_valid_cnpj(digits):
            return digits
    raw = re.findall(r'(?<!\d)(\d{14})(?!\d)', text)
    for match in raw:
        if _is_valid_cnpj(match):
            return match
    return None


def _extract_cnpj_from_html(html: str) -> Optional[str]:
    """Extract a valid CNPJ from HTML content. Prefer formatted CNPJs."""
    return _extract_valid_cnpj(html)


def _lookup_cnpj_api(cnpj: str) -> Optional[dict]:
    """Look up CNPJ via Minha Receita (free, fast) — extracts ALL available data."""
    formatted = f"{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:14]}"
    api_resp = None
    for attempt in range(2):
        try:
            api_resp = requests.get(
                f"https://minhareceita.org/{formatted}",
                timeout=8,
                headers={"User-Agent": "MabrumiCRM/1.0"},
            )
            if api_resp.status_code == 200:
                break
            if api_resp.status_code == 429:
                sleep(2)
                continue
        except requests.exceptions.RequestException:
            sleep(1)
            continue
    if not api_resp or api_resp.status_code != 200:
        return None
    try:
        d = api_resp.json()
        qsa = d.get("qsa", [])
        owners = [p.get("nome_socio", "") for p in qsa if p.get("nome_socio")]
        admins = [
            {
                "nome": p.get("nome_socio", ""),
                "qualificacao": p.get("qualificacao_socio", ""),
                "entrada": p.get("data_entrada_sociedade", ""),
                "faixa_etaria": p.get("faixa_etaria", ""),
                "representante_legal": p.get("nome_representante_legal", ""),
                "rep_qualificacao": p.get("qualificacao_representante_legal", ""),
            }
            for p in qsa
        ]
        cnaes_sec = d.get("cnaes_secundarios", [])
        regime = d.get("regime_tributario", [])

        endereco = " ".join(filter(None, [
            d.get("descricao_tipo_de_logradouro", ""),
            d.get("logradouro", ""),
            d.get("numero", ""),
            d.get("complemento", ""),
            d.get("bairro", ""),
        ]))

        return {
            "cnpj": d.get("cnpj", ""),
            "razao_social": d.get("razao_social", ""),
            "nome_fantasia": d.get("nome_fantasia", ""),
            "situacao_cadastral": d.get("descricao_situacao_cadastral", ""),
            "motivo_situacao": d.get("descricao_motivo_situacao_cadastral", ""),
            "data_situacao_cadastral": d.get("data_situacao_cadastral", ""),
            "natureza_juridica": d.get("natureza_juridica", ""),
            "porte": d.get("porte", ""),
            "capital_social": d.get("capital_social", ""),
            "atividade_principal": d.get("cnae_fiscal_descricao", ""),
            "cnae_fiscal": d.get("cnae_fiscal", ""),
            "cnaes_secundarios": [
                f"{c.get('descricao', '')} ({c.get('codigo', '')})"
                for c in cnaes_sec
            ],
            "opcao_simples": d.get("opcao_pelo_simples"),
            "opcao_mei": d.get("opcao_pelo_mei"),
            "regime_tributario": [
                f"{r.get('forma_de_tributacao', '')} ({r.get('ano', '')})"
                for r in regime
            ],
            "situacao_especial": d.get("situacao_especial", ""),
            "data_inicio_atividade": d.get("data_inicio_atividade", ""),
            "data_opcao_simples": d.get("data_opcao_pelo_simples", ""),
            "identificador_matriz_filial": "Matriz" if d.get("identificador_matriz_filial") == 1 else "Filial",
            "cep": d.get("cep", ""),
            "uf": d.get("uf", ""),
            "municipio": d.get("municipio", ""),
            "bairro": d.get("bairro", ""),
            "endereco_completo": endereco,
            "telefone_1": d.get("ddd_telefone_1", ""),
            "telefone_2": d.get("ddd_telefone_2", ""),
            "fax": d.get("ddd_fax", ""),
            "email": d.get("email", ""),
            "responsavel": owners[0] if owners else "",
            "socios": ", ".join(owners),
            "qsa": admins,
            "entidade_federativa": d.get("ente_federativo_responsavel", ""),
            "codigo_municipio_ibge": d.get("codigo_municipio_ibge", ""),
        }
    except Exception:
        pass
    return None


def _clean_business_name(raw_name: str, city: str = "") -> str:
    """Clean scraped name: remove descriptions, ratings, neighborhoods, and city suffixes."""
    name = raw_name
    for sep in [':', '|', ' - ', ' – ', ' — ']:
        if sep in name:
            name = name.split(sep)[0]
    name = re.sub(r'\s*\d+[\.,]?\d*\s*(estrelas?|stars?|reviews?|avaliacoes?)', '', name, flags=re.I)
    name = name.replace("'", " ").replace("'", " ")
    name = re.sub(r'\s+', ' ', name).strip(' ,.-')

    if city:
        words = name.split()
        city_lower = city.lower()

        def _matches_city(w: str) -> bool:
            wl = w.lower()
            if len(wl) < 3:
                return False
            if wl == city_lower:
                return True
            if city_lower.startswith(wl) and len(wl) >= 4:
                return True
            if wl.startswith(city_lower):
                return True
            common = 0
            for a, b in zip(wl, city_lower):
                if a == b:
                    common += 1
                else:
                    break
            if common >= 5 and common >= min(len(wl), len(city_lower)) * 0.6:
                return True
            return False

        filtered = [w for w in words if not _matches_city(w)]
        if filtered:
            name = ' '.join(filtered).strip()

    return name


def _short_business_name(name: str) -> str:
    """Extract the core business name. E.g. 'Sorris art centro odontologico' -> 'Sorris art'."""
    words = name.split()
    return ' '.join(words[:2]) if len(words) > 2 else name


NON_WEBSITE_DOMAINS = [
    'wa.me', 'whatsapp', 'instagram', 'facebook', 'twitter', 'linkedin',
    'tiktok', 'youtube', 'pinterest', 'snapchat', 'linktr.ee',
]


def _is_useful_website(url: str) -> bool:
    """Check if URL is a real business website (not social media or messaging)."""
    if not url:
        return False
    lower = url.lower()
    for domain in NON_WEBSITE_DOMAINS:
        if domain in lower:
            return False
    return lower.startswith('http')


def _cnpj_from_website(url: str) -> Optional[str]:
    """Try to extract CNPJ from website main page and common subpages."""
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    subpages = ["", "/contato", "/sobre", "/quem-somos", "/rodape"]
    base = url.rstrip("/")
    for page in subpages:
        try:
            resp = requests.get(f"{base}{page}", timeout=4, headers=headers, allow_redirects=True)
            if resp.status_code == 200:
                cnpj = _extract_valid_cnpj(resp.text)
                if cnpj:
                    return cnpj
        except Exception:
            continue
    return None


def _cnpj_from_bing(business_name: str, city: str = "") -> Optional[str]:
    """Search Bing for CNPJ."""
    clean_name = _clean_business_name(business_name)
    if not clean_name:
        return None
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html",
        "Accept-Language": "pt-BR,pt;q=0.9",
    }
    queries = [f"{clean_name} {city} cnpj", f"{clean_name} cnpj"]
    for q in queries:
        try:
            resp = requests.get(f"https://www.bing.com/search?q={requests.utils.quote(q)}", timeout=4, headers=headers)
            if resp.status_code == 200:
                cnpj = _extract_valid_cnpj(resp.text)
                if cnpj:
                    return cnpj
        except Exception:
            continue
    return None


def _cnpj_from_directories(business_name: str, city: str = "", phone: str = "") -> Optional[str]:
    """Search casadosdados for CNPJ."""
    clean_name = _clean_business_name(business_name)
    if not clean_name:
        return None
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept": "text/html"}
    for term in [clean_name] + ([re.sub(r'\D', '', phone)[:11]] if phone and len(re.sub(r'\D', '', phone)) >= 10 else []):
        try:
            resp = requests.get(
                f"https://casadosdados.com.br/solucao/cnpj/pesquisa-avancada?q={requests.utils.quote(term)}&municipio={city}&uf=Todos",
                timeout=6, headers=headers
            )
            if resp.status_code == 200:
                cnpj = _extract_valid_cnpj(resp.text)
                if cnpj:
                    return cnpj
        except Exception:
            pass
    return None


def _cnpj_from_biz_translate(business_name: str, city: str = "") -> Optional[str]:
    """Use Google Translate as proxy to scrape cnpj.biz search results for a CNPJ."""
    clean_name = _clean_business_name(business_name)
    if not clean_name:
        return None
    query = f"{clean_name} {city}".strip() if city else clean_name
    target_url = f"https://cnpj.biz/procura/{requests.utils.quote(query)}"
    gt_url = f"https://translate.google.com/translate?sl=pt&tl=en&u={requests.utils.quote(target_url)}"
    try:
        resp = requests.get(gt_url, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html",
        })
        if resp.status_code == 200:
            cnpujs = re.findall(r'(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})', resp.text)
            for raw in cnpujs:
                cnpj = re.sub(r'\D', '', raw)
                if _is_valid_cnpj(cnpj):
                    return cnpj
    except Exception:
        pass
    return None


def lookup_cnpj(website_url: str, business_name: str = "", city: str = "", phone: str = "") -> Optional[dict]:
    """Find CNPJ using parallel strategies, then lookup on Minha Receita."""
    import logging
    from concurrent.futures import ThreadPoolExecutor, as_completed
    log = logging.getLogger("lookup_cnpj")
    log.warning(f"[CNPJ] lookup_cnpj called: website={website_url} name={business_name} city={city}")

    cnpj = None

    # Strategy 1: Website scraping (fastest, most reliable)
    if _is_useful_website(website_url):
        log.warning("[CNPJ] Strategy 1: website scraping...")
        cnpj = _cnpj_from_website(website_url)
        log.warning(f"[CNPJ] Strategy 1 result: {cnpj}")

    # Strategy 2: Parallel search (Bing + directories) - max 10s
    if not cnpj:
        clean_name = _clean_business_name(business_name, city)
        if clean_name:
            log.warning("[CNPJ] Strategy 2: Bing + directories...")
            with ThreadPoolExecutor(max_workers=3) as executor:
                futures = {
                    executor.submit(_cnpj_from_bing, clean_name, city): "bing",
                    executor.submit(_cnpj_from_directories, clean_name, city, phone): "dir",
                }
                for future in as_completed(futures, timeout=10):
                    try:
                        result = future.result()
                        if result:
                            cnpj = result
                            log.warning(f"[CNPJ] Strategy 2 found: {cnpj}")
                            break
                    except Exception:
                        continue

    # Strategy 3: cnpj.biz via Google Translate proxy (bypasses IP blocks)
    if not cnpj:
        clean_name = _clean_business_name(business_name, city)
        if clean_name:
            log.warning("[CNPJ] Strategy 3: Google Translate proxy...")
            cnpj = _cnpj_from_biz_translate(clean_name, city)
            log.warning(f"[CNPJ] Strategy 3 result: {cnpj}")

    # Strategy 4: Retry with short/core name (strips descriptors like "centro odontologico")
    if not cnpj:
        core_name = _short_business_name(_clean_business_name(business_name, city))
        if core_name and core_name != _clean_business_name(business_name, city):
            log.warning(f"[CNPJ] Strategy 4: retry with core name '{core_name}'...")
            with ThreadPoolExecutor(max_workers=2) as executor:
                futures = {
                    executor.submit(_cnpj_from_bing, core_name, city): "bing",
                    executor.submit(_cnpj_from_biz_translate, core_name, city): "biz",
                }
                for future in as_completed(futures, timeout=15):
                    try:
                        result = future.result()
                        if result:
                            cnpj = result
                            log.warning(f"[CNPJ] Strategy 4 found: {cnpj}")
                            break
                    except Exception:
                        continue

    if cnpj:
        log.warning(f"[CNPJ] Found CNPJ {cnpj}, calling Minha Receita API...")
        return _lookup_cnpj_api(cnpj)
    log.warning("[CNPJ] All strategies failed, returning None")
    return None


SOCIAL_NETWORKS = [
    {"name": "LinkedIn", "queries": [
        '"{name}" site:linkedin.com/in/',
    ]},
    {"name": "Instagram", "queries": [
        '"{name}" site:instagram.com/',
    ]},
    {"name": "Facebook", "queries": [
        '"{name}" site:facebook.com/',
    ]},
    {"name": "Twitter/X", "queries": [
        '"{name}" site:x.com/',
    ]},
    # {"name": "YouTube", "queries": [
    #     '"{name}" site:youtube.com/',
    # ]},
    # {"name": "TikTok", "queries": [
    #     '"{name}" site:tiktok.com/',
    # ]},
]

ALL_PLATFORM_DOMAINS = {
    "LinkedIn": ["linkedin.com"],
    "Instagram": ["instagram.com"],
    "Facebook": ["facebook.com"],
    "Twitter/X": ["x.com", "twitter.com"],
    # "YouTube": ["youtube.com"],
    # "TikTok": ["tiktok.com"],
}

SKIP_DOMAINS = [
    "search.yahoo.com", "login.yahoo.com", "images.search.yahoo.com",
    "duckduckgo.com", "bing.com", "google.com", "yahoo.com/preferences",
    "help.yahoo.com",
]


def _extract_social_urls(html: str, platform_name: str) -> list:
    """Extract social media URLs from search engine HTML, handling Yahoo redirects."""
    from urllib.parse import unquote
    soup = BeautifulSoup(html, "html.parser")
    found = []
    seen = set()
    target_domains = ALL_PLATFORM_DOMAINS.get(platform_name, [])

    def _is_target_domain(url: str) -> bool:
        """Check if the URL's actual domain matches a social platform."""
        from urllib.parse import urlparse
        try:
            host = urlparse(url).hostname or ""
            host = host.lower()
            for d in target_domains:
                if host == d or host.endswith("." + d):
                    return True
        except Exception:
            pass
        return False

    for link in soup.find_all("a", href=True):
        href = link.get("href", "")
        href_lower = href.lower()
        real_url = None

        # Yahoo r.search.yahoo.com format: ...RU=https%3a%2f%2f.../RK=2/RS=...
        if "r.search.yahoo.com" in href and "/RU=" in href:
            try:
                ru_start = href.index("/RU=") + 4
                rest = href[ru_start:]
                slash_idx = rest.find("/RK=")
                if slash_idx > 0:
                    ru_encoded = rest[:slash_idx]
                else:
                    ru_encoded = rest.split("/")[0]
                real_url = unquote(ru_encoded)
            except (ValueError, IndexError):
                pass

        # DDG format: //duckduckgo.com/l/?uddg=...
        elif "uddg=" in href_lower:
            from urllib.parse import parse_qsl, urlparse
            parsed = urlparse(href if href.startswith("http") else f"https:{href}")
            qs = dict(parse_qsl(parsed.query))
            if "uddg" in qs:
                real_url = unquote(qs["uddg"])

        if real_url and real_url not in seen and _is_target_domain(real_url):
            if any(skip in real_url.lower() for skip in ["login", "preferences", "guce.yahoo", "signin"]):
                continue
            seen.add(real_url)
            text = link.get_text(strip=True)
            clean_text = text
            # Remove platform prefix + URL junk like "LinkedIn Brasilhttps://..."
            for prefix in ["LinkedIn Brasil", "LinkedIn", "Instagram", "Facebook", "Twitter", "YouTube", "TikTok",
                           "Repubblica Dominicana", "Chile", u"M\u00e9xico"]:
                if clean_text.startswith(prefix):
                    rest = clean_text[len(prefix):].strip()
                    if rest:
                        clean_text = rest
                    break
            # Remove embedded domain URLs from text
            for junk in ["https://", "http://", "www.", "br.", "do.", "cl.", "mx."]:
                idx = clean_text.find(junk)
                if idx >= 0:
                    clean_text = clean_text[idx:]
                    # Skip past the domain to get the profile slug
                    slash = clean_text.find("/")
                    if slash >= 0:
                        clean_text = clean_text[slash+1:].strip()
            if clean_text.startswith("http"):
                path = real_url.rstrip("/").split("/")[-1].replace("-", " ").title()
                if len(path) > 3:
                    clean_text = path
            found.append({"url": real_url, "title": (clean_text or real_url)[:200]})

    return found


def _generate_name_variations(full_name: str) -> list:
    """Generate shorter name variations from a full business name.
    e.g. 'Sallva Bar e Ristorante - Pontao Lago Sul' -> ['Sallva Bar', 'Sallva']"""
    if not full_name:
        return []
    # Remove location suffixes like "- Pontao Lago Sul - Brasilia DF"
    name = full_name
    for sep in [' - ', ' – ', ' — ', ':', '|']:
        if sep in name:
            name = name.split(sep)[0]
    name = name.strip()
    words = name.split()
    variations = []
    # Try progressively shorter combinations (skip filler words)
    filler = {'de', 'do', 'da', 'dos', 'das', 'e', 'o', 'a', 'em', 'para', 'com'}
    meaningful = [w for w in words if w.lower() not in filler]
    if len(meaningful) <= 1:
        return meaningful
    for length in range(min(3, len(meaningful)), 0, -1):
        var = ' '.join(meaningful[:length])
        if var not in variations:
            variations.append(var)
    return variations


def _search_one_platform(platform_name: str, query: str, headers: dict) -> dict:
    """Search for a single platform using Yahoo (primary) + DuckDuckGo (fallback)."""
    engines = [
        "https://search.yahoo.com/search?p={q}",
        "https://html.duckduckgo.com/html/?q={q}",
    ]

    for engine_tpl in engines:
        try:
            url = engine_tpl.format(q=requests.utils.quote(query))
            resp = requests.get(url, timeout=10, headers=headers)
            if resp.status_code == 200:
                matches = _extract_social_urls(resp.text, platform_name)
                if matches:
                    best = matches[0]
                    return {
                        "url": best["url"],
                        "title": best["title"],
                        "other_matches": [m["url"] for m in matches[1:4]],
                    }
        except Exception:
            continue

    return {"url": "", "not_found": True}


def _extract_social_from_website(website: str) -> dict:
    """Extract social media URLs directly from the website field (e.g. http://instagram.com/sallvabsb)."""
    if not website:
        return {}
    results = {}
    for url_part in website.replace(',', '\n').replace(';', '\n').split('\n'):
        url = url_part.strip()
        if not url.startswith('http'):
            url = 'https://' + url
        for platform, domains in ALL_PLATFORM_DOMAINS.items():
            if platform in results:
                continue
            for domain in domains:
                if domain in url:
                    results[platform] = {"url": url, "title": url.split('/')[-1], "source": "site"}
                    break
    return results


def search_social_media(name: str = "", company: str = "", city: str = "", business_name: str = "", website: str = "") -> dict:
    """
    Search social media with priority:
    1. Extract directly from website field (highest priority)
    2. Search by responsible person name
    3. Search by business name (with variations)
    Merges results, only searches web for platforms NOT found in website field.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    }

    # Step 1: extract from website field
    results = _extract_social_from_website(website)

    # Step 2: determine which platforms still need searching
    missing = [net for net in SOCIAL_NETWORKS if net["name"] not in results]
    if not missing:
        return results

    def search_for(network, search_name):
        platform = network["name"]
        query = network["queries"][0].format(name=search_name)
        return platform, _search_one_platform(platform, query, headers)

    def search_business(network):
        platform = network["name"]
        variations = _generate_name_variations(business_name)
        for var in variations:
            query = network["queries"][0].format(name=var)
            result = _search_one_platform(platform, query, headers)
            if result.get("url"):
                return platform, result
        return platform, {"url": "", "not_found": True}

    raw = {}
    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = {}
        for net in missing:
            if name:
                f = executor.submit(search_for, net, name)
                futures[f] = (net["name"], "pessoa")
            if business_name:
                f2 = executor.submit(search_business, net)
                futures[f2] = (net["name"], "negocio")

        for future in as_completed(futures):
            platform, source = futures[future]
            try:
                _, data = future.result()
                if data.get("url"):
                    data["source"] = source
                    raw.setdefault(platform, []).append(data)
            except Exception:
                pass

    for net in missing:
        platform = net["name"]
        candidates = raw.get(platform, [])
        if candidates:
            best = next((c for c in candidates if c.get("source") == "pessoa"), candidates[0])
            results[platform] = {
                "url": best["url"],
                "title": best.get("title", ""),
                "source": best.get("source", ""),
                "other_matches": best.get("other_matches", []),
            }
        else:
            results[platform] = {"url": "", "not_found": True}

    return results


class ScraperEngine:
    def __init__(self, search_query: str, limit: int = 0, on_progress: Optional[Callable] = None):
        self.search_query = search_query
        self.limit = limit
        self.on_progress = on_progress or (lambda msg, pct: None)
        self.timeout = 60000
        self.browser = None
        self.page = None
        self._pw = None
        self._cancelled = False

    def cancel(self):
        self._cancelled = True
        if self.browser:
            try:
                self.browser.close()
            except Exception:
                pass

    def _msg(self, text: str, progress: int = -1):
        self.on_progress(text, progress)

    def _screenshot(self):
        try:
            if not self.page:
                return
            png = self.page.screenshot(type="jpeg", quality=40)
            b64 = base64.b64encode(png).decode("utf-8")
            self.on_progress("", -2, b64)
        except Exception:
            pass

    def _opening_url(self, url: str, max_retries: int = 3):
        retries = 0
        while retries < max_retries:
            if self._cancelled:
                if self.browser:
                    try:
                        self.browser.close()
                    except Exception:
                        pass
                return False
            try:
                self.page.goto(url, timeout=self.timeout, wait_until="domcontentloaded")
            except PlaywrightTimeout:
                retries += 1
                sleep(3)
                continue
            except Exception:
                retries += 1
                sleep(3)
                continue
            else:
                return True
        self._msg(f"Falha ao abrir pagina apos {max_retries} tentativas", -1)
        return False

    def _parsing(self) -> Optional[dict]:
        try:
            sleep(3)
            self._screenshot()

            for _ in range(15):
                if self._cancelled:
                    return None
                found = self.page.evaluate("""
                    () => document.querySelector("h1.DUwDvf") !== null ||
                           document.querySelector("h1") !== null ||
                           document.querySelector("[data-attrid='title']") !== null
                """)
                if found:
                    break
                sleep(1)

            rating = totalReviews = address = websiteUrl = phone = None

            html = None
            try:
                el = self.page.query_selector("[role='main']")
                if el:
                    html = el.evaluate("el => el.outerHTML")
            except Exception:
                pass

            if not html:
                try:
                    html = self.page.evaluate("() => document.body.innerHTML")
                except Exception:
                    return None

            soup = BeautifulSoup(html, "html.parser")

            name = None
            nameElement = (
                soup.select_one(".tAiQdd h1.DUwDvf") or
                soup.select_one("h1.DUwDvf") or
                soup.select_one("h1")
            )
            if nameElement is not None:
                name = nameElement.text.strip()

            if not name:
                return None

            try:
                ratingEl = soup.find("span", class_="ceNzKf")
                if ratingEl:
                    rating = ratingEl.get("aria-label")
            except Exception:
                rating = None

            try:
                reviewsDiv = soup.find("div", class_="F7nice")
                if reviewsDiv:
                    reviewsElement = reviewsDiv.find(
                        "span", attrs={"role": "img", "aria-label": True}
                    )
                    if reviewsElement:
                        totalReviews = reviewsElement.get("aria-label") or reviewsElement.get_text(strip=True)
                    else:
                        totalReviews = reviewsDiv.get_text(strip=True)
            except Exception:
                totalReviews = None

            try:
                webLink = soup.find(
                    "a",
                    href=lambda href: href and href.startswith("http") and "google.com" not in href,
                )
                if webLink is not None:
                    websiteUrl = webLink.get("href")
            except Exception:
                websiteUrl = None

            for element in soup.find_all(attrs={"aria-label": True}):
                label = element.get("aria-label", "")
                if re.match(r"^(Endere|Address|Adresse|Адрес|Indirizzo|Direcci)\w*\s*:", label, re.I):
                    address = label.split(":", 1)[1].strip()
                elif re.match(r"^(Telefone|Phone|Tel|Телефон)\s*:", label, re.I):
                    phone = label.split(":", 1)[1].strip()

            if not phone:
                try:
                    phoneLink = soup.find("a", href=lambda href: href and href.startswith("tel:"))
                    if phoneLink is not None:
                        phone = phoneLink.get("href")[4:]
                except Exception:
                    phone = None

            if not address:
                try:
                    addrEl = soup.find(attrs={"data-item-id": "address"})
                    if addrEl:
                        address = addrEl.get_text(strip=True)
                except Exception:
                    pass

            return {
                "Name": name,
                "Phone": phone,
                "Address": address,
                "Website": websiteUrl,
                "Total Reviews": totalReviews,
                "Rating": rating,
            }
        except Exception:
            return None

    def scrape(self) -> list[dict]:
        try:
            if not sync_playwright:
                self._msg("Playwright nao esta instalado.", -1)
                return []

            query_with_plus = "+".join(self.search_query.split())
            link_of_page = f"https://www.google.com/maps/search/{query_with_plus}/"

            final_data = []

            self._msg("Iniciando Chromium...", 5)

            self._pw = sync_playwright().start()
            try:
                self.browser = self._pw.chromium.launch(
                    headless=True,
                    args=[
                        "--no-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-blink-features=AutomationControlled",
                        "--disable-gpu",
                        "--disable-extensions",
                        "--disable-background-networking",
                        "--disable-default-apps",
                        "--disable-sync",
                        "--disable-translate",
                        "--no-first-run",
                        "--mute-audio",
                        "--js-flags=--max-old-space-size=64",
                    ],
                )
            except Exception as e:
                self._msg(f"Erro ao iniciar Chromium: {str(e)}", -1)
                return []

            context = self.browser.new_context(
                viewport={"width": 800, "height": 600},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            )
            context.route("**/*.{png,jpg,jpeg,gif,svg,webp,woff,woff2,ttf,otf}", lambda route: route.abort())
            context.route("**/analytics**", lambda route: route.abort())
            context.route("**/stats**", lambda route: route.abort())
            self.page = context.new_page()

            self._msg("Abrindo Google Maps...", 10)

            if not self._opening_url(link_of_page):
                return []

            sleep(2)
            self._screenshot()
            self._msg("Carregando resultados...", 15)

            feed_element = None
            for _ in range(30):
                if self._cancelled:
                    self.browser.close()
                    return []
                feed_element = self.page.query_selector("[role='feed']")
                if feed_element is not None:
                    break
                sleep(1)

            if feed_element is None:
                self._msg("Nenhum resultado encontrado.", 100)
                self._screenshot()
                self.browser.close()
                return []

            last_height = 0
            scroll_count = 0
            max_scrolls = 50

            while scroll_count < max_scrolls:
                if self._cancelled:
                    self.browser.close()
                    return []

                self.page.evaluate(
                    "() => { const el = document.querySelector(\"[role='feed']\"); if(el) el.scrollTo(0, el.scrollHeight); }"
                )
                time.sleep(random.uniform(2, 4))
                scroll_count += 1
                self._msg(f"Rolando resultados... ({scroll_count})", min(15 + scroll_count, 40))

                if scroll_count % 10 == 0:
                    self._screenshot()

                new_height = self.page.evaluate(
                    "() => { const el = document.querySelector(\"[role='feed']\"); return el ? el.scrollHeight : 0; }"
                )
                if new_height == last_height:
                    endAlertElement = self.page.query_selector(".PbZDve")
                    if endAlertElement is None:
                        try:
                            self.page.evaluate(
                                "() => { const a = document.getElementsByClassName('hfpxzc'); if(a.length) a[a.length-1].click(); }"
                            )
                            sleep(2)
                        except Exception:
                            pass
                    else:
                        break
                else:
                    last_height = new_height

            self._screenshot()

            feed_html = self.page.evaluate(
                "() => { const el = document.querySelector(\"[role='feed']\"); return el ? el.outerHTML : ''; }"
            )
            allResultsListSoup = BeautifulSoup(feed_html, "html.parser")
            allResultsAnchorTags = allResultsListSoup.find_all("a", class_="hfpxzc")
            allResultsLinks = [a.get("href") for a in allResultsAnchorTags if a.get("href")]

            total_links = len(allResultsLinks)
            if self.limit > 0:
                total_links = min(total_links, self.limit)
            self._msg(f"Encontrados {len(allResultsLinks)} resultados. Coletando{f' (limite: {self.limit})' if self.limit > 0 else ''}...", 45)

            try:
                self.page.goto("about:blank")
            except Exception:
                pass

            for i in range(total_links):
                if self._cancelled:
                    break

                if self.limit > 0 and len(final_data) >= self.limit:
                    self._msg(f"Limite de {self.limit} leads atingido!", 100)
                    break

                progress = 45 + int((i / total_links) * 50)
                self._msg(f"Coletando {i + 1}/{total_links}... ({len(final_data)} validos)", progress)

                resultLink = allResultsLinks[i]

                try:
                    if not self._opening_url(resultLink):
                        self._msg(f"Pulando {i + 1}/{total_links} (falha ao abrir)", progress)
                    else:
                        sleep(random.uniform(2, 4))
                        data = self._parsing()
                        if data:
                            data["Link"] = allResultsLinks[i]
                            final_data.append(data)
                        else:
                            self._msg(f"Pulando {i + 1}/{total_links} (sem dados)", progress)
                except Exception as e:
                    self._msg(f"Erro no lead {i + 1}: {str(e)}", progress)

                try:
                    self.page.evaluate("() => { document.body.innerHTML = ''; }")
                    self.page.goto("about:blank")
                except Exception:
                    pass
                import gc
                gc.collect()

            self._msg(f"Concluido! {len(final_data)} registros coletados.", 100)

            try:
                if self._pw:
                    self._pw.stop()
            except Exception:
                pass

            return final_data

        except Exception as e:
            self._msg(f"Erro: {str(e)}", -1)
            try:
                if self.browser:
                    self.browser.close()
                if self._pw:
                    self._pw.stop()
            except Exception:
                pass
            return []


# --- Health Plan Check ---
_ans_operators_cache = None
_ans_cache_lock = __import__('threading').Lock()
_ans_last_attempt = [0]
ANS_RETRY_INTERVAL = 300

def _load_ans_operators():
    """Download and cache the ANS active operators list (CNPJ lookup)."""
    global _ans_operators_cache
    with _ans_cache_lock:
        if _ans_operators_cache is not None:
            return _ans_operators_cache
        import time as _t
        if _ans_last_attempt[0] and (_t.time() - _ans_last_attempt[0]) < ANS_RETRY_INTERVAL:
            return {}
    _ans_last_attempt[0] = __import__('time').time()
    try:
        import csv, io
        url = "http://ftp.dadosabertos.ans.gov.br/FTP/PDA/operadoras_de_plano_de_saude_ativas/Relatorio_cadop.csv"
        resp = requests.get(url, timeout=8, headers={"User-Agent": "Mozilla/5.0"})
        if resp.status_code == 200:
            text = resp.content.decode('latin-1', errors='replace')
            reader = csv.DictReader(io.StringIO(text), delimiter=';')
            operators = {}
            for row in reader:
                cnpj = row.get('CNPJ', '').replace('.', '').replace('/', '').replace('-', '').strip()
                razao = row.get('Razao_Social', '') or row.get(' Razao_Social', '')
                fantasia = row.get('Nome_Fantasia', '') or row.get(' Nome_Fantasia', '')
                registro = row.get('Registro_ANS', '') or row.get(' Registro_ANS', '')
                modalidade = row.get('Modalidade', '') or row.get(' Modalidade', '')
                if cnpj:
                    operators[cnpj] = {
                        'razao_social': razao.strip(),
                        'nome_fantasia': fantasia.strip(),
                        'registro_ans': registro.strip(),
                        'modalidade': modalidade.strip(),
                    }
            with _ans_cache_lock:
                _ans_operators_cache = operators
            return operators
    except Exception:
        pass
    with _ans_cache_lock:
        _ans_operators_cache = {}
    return {}


def check_health_plan(cnpj: str = "", name: str = "", porte: str = "", qtd_funcionarios: str = "", capital_social: str = "", cnae: str = "") -> dict:
    """
    Multi-signal health plan check:
    1. ANS operator lookup
    2. Web search (Bing)
    3. Company size (porte + capital social + QSA)
    4. CNAE activity type
    Returns: { tem_plano, confianca, sinais, detalhes }
    """
    signals = []
    is_operator = False
    operator_data = {}
    cnpj = str(cnpj or '')
    name = str(name or '')
    porte = str(porte or '')
    qtd_funcionarios = str(qtd_funcionarios or '')
    capital_social = str(capital_social or '')
    cnae = str(cnae or '')

    # Signal 1: ANS operator check
    if cnpj:
        cnpj_clean = cnpj.replace('.', '').replace('/', '').replace('-', '').strip()
        operators = _load_ans_operators()
        if cnpj_clean in operators:
            is_operator = True
            operator_data = operators[cnpj_clean]
            signals.append(f"Operadora ANS: {operator_data.get('razao_social', '')} (Registro {operator_data.get('registro_ans', '')})")

    # Signal 2: Web search via Bing
    web_mentions = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    }
    health_keywords = ['plano de saude', 'plano de saúde', 'saude suplementar',
                       'convenio medico', 'convênio médico', 'beneficio empresa',
                       'assistencia medica', 'assistência médica',
                       'plano odontologico', 'plano odontológico',
                       'seguro saude', 'seguro saúde', 'beneficios trabalhistas']

    def _check_bing_results(html: str, query_label: str):
        from bs4 import BeautifulSoup as BS
        soup = BS(html, "html.parser")
        label_lower = query_label.lower()
        cnpj_digits = cnpj.replace('.', '').replace('/', '').replace('-', '').strip() if cnpj else ''

        result_blocks = []
        for item in soup.select("li.b_algo, div.b_algo"):
            text = item.get_text(" ", strip=True).lower()
            if len(text) > 20:
                result_blocks.append(text)

        for block in result_blocks:
            if any(kw in block for kw in health_keywords):
                if label_lower in block or (cnpj_digits and cnpj_digits in block.replace('.', '').replace('/', '').replace('-', '')):
                    return True
        return False

    def _check_ddg_results(html: str, query_label: str):
        from bs4 import BeautifulSoup as BS
        soup = BS(html, "html.parser")
        label_lower = query_label.lower()
        cnpj_digits = cnpj.replace('.', '').replace('/', '').replace('-', '').strip() if cnpj else ''

        for item in soup.select("div.result, div.results_links"):
            text = item.get_text(" ", strip=True).lower()
            if any(kw in text for kw in health_keywords):
                if label_lower in text or (cnpj_digits and cnpj_digits in text.replace('.', '').replace('/', '').replace('-', '')):
                    return True
        return False

    search_terms = []
    if cnpj:
        search_terms.append((f'{cnpj} plano de saude convenio medico', cnpj))
    if name:
        search_terms.append((f'{name} plano de saude convenio medico beneficio', name))

    for query, label in search_terms[:2]:
        if web_mentions:
            break
        for search_url in [
            f"https://www.bing.com/search?q={requests.utils.quote(query)}&setlang=pt-BR",
            f"https://html.duckduckgo.com/html/?q={requests.utils.quote(query)}",
        ]:
            try:
                resp = requests.get(search_url, timeout=6, headers=headers)
                if resp.status_code == 200:
                    is_bing = "bing.com" in search_url
                    if (is_bing and _check_bing_results(resp.text, label)) or \
                       (not is_bing and _check_ddg_results(resp.text, label)):
                        web_mentions.append(label)
                        break
            except Exception:
                continue

    if web_mentions:
        signals.append(f"Mencoes na web: {', '.join(web_mentions)}")

    # Signal 3: Company size indicator (Minha Receita porte values)
    porte_clean = (porte or '').lower().strip()
    if qtd_funcionarios:
        try:
            num = int(qtd_funcionarios)
            if num >= 20:
                signals.append(f"Empresa com ~{num} funcionarios (alta chance de plano coletivo)")
            elif num >= 5:
                signals.append(f"Empresa com ~{num} funcionarios (possivel plano coletivo)")
        except (ValueError, TypeError):
            pass
    if not signals or (porte_clean and porte_clean != 'na'):
        porte_map = {
            'micro empresa': 'media', 'me': 'media', 'epp': 'media',
            'empresa de pequeno porte': 'media',
            'medio porte': 'grande', 'medio': 'grande',
            'grande': 'grande', 'grande empresa': 'grande',
            'eireli': 'media', 'slu': 'media', 'ssa': 'media',
            'demais': 'grande',
        }
        mapped = porte_map.get(porte_clean, '')
        if mapped == 'grande':
            signals.append(f"Porte {porte} (geralmente oferece plano de saude)")
        elif mapped == 'media':
            if not any('funcionarios' in s for s in signals):
                signals.append(f"Porte {porte} (possivel plano coletivo)")
        elif porte_clean in ['micro', 'mei', 'pequeno', 'ibr']:
            pass

    # Signal 4: Capital social as size indicator
    cs_str = str(capital_social or '').replace('R$', '').replace('.', '').replace(',', '.').strip()
    if cs_str:
        try:
            cs_val = float(cs_str)
            if cs_val >= 1000000:
                signals.append(f"Capital Social R$ {cs_val:,.2f} (empresa de porte significativo)")
            elif cs_val >= 200000:
                signals.append(f"Capital Social R$ {cs_val:,.2f} (possivel plano coletivo)")
        except (ValueError, TypeError):
            pass

    # Signal 5: CNAE activity type — some sectors almost always have health plans
    HIGH_PROB_CNAE_PREFIXES = {
        '41': 'Engenharia/Construcao civil',
        '42': 'Engenharia/Construcao civil',
        '43': 'Engenharia/Construcao civil',
        '62': 'Tecnologia/Software',
        '63': 'Tecnologia/Informacao',
        '58': 'Midia/Publishing',
        '59': 'Midia/Producao audiovisual',
        '61': 'Telecomunicacoes',
        '64': 'Financeiro/Seguradoras',
        '65': 'Financeiro/Seguros',
        '66': 'Financeiro/Complementar',
        '86': 'Saude/Hospitais',
        '87': 'Saude/Assistencia',
        '85': 'Educacao',
        '69': 'Juridico/Contabilidade',
        '70': 'Juridico/Consultoria',
    }
    if cnae:
        cnae_code = str(cnae).strip()[:2]
        sector = HIGH_PROB_CNAE_PREFIXES.get(cnae_code, '')
        if sector:
            signals.append(f"CNAE {cnae} - {sector} (setor com alta adocao de planos)")

    # Signal 6: QSA member count as employee proxy
    if qtd_funcionarios:
        try:
            num = int(qtd_funcionarios)
            if num >= 3:
                signals.append(f"~{num} socios/quadro societario (estrutura organizacional)")
        except (ValueError, TypeError):
            pass

    # Decision logic
    if is_operator:
        return {
            "tem_plano": True,
            "tipo": "Operadora ANS",
            "confianca": "alta",
            "sinais": signals,
            "detalhes": operator_data,
        }
    elif len(signals) >= 2:
        return {
            "tem_plano": True,
            "tipo": "Plano identificado" if web_mentions else "Provavel",
            "confianca": "alta" if web_mentions else "media",
            "sinais": signals,
            "detalhes": {},
        }
    elif len(signals) == 1:
        return {
            "tem_plano": None,
            "tipo": "Inconclusivo",
            "confianca": "baixa",
            "sinais": signals,
            "detalhes": {},
        }
    else:
        return {
            "tem_plano": False,
            "tipo": "Nao identificado",
            "confianca": "nenhuma",
            "sinais": [],
            "detalhes": {},
        }


# --- Employee Count ---
def _search_wikipedia_employees(company_name: str, deadline: float = 999) -> dict:
    """Try to find employee count from Portuguese Wikipedia infobox."""
    from bs4 import BeautifulSoup as BS
    import re, time as _time

    def _timed_out():
        return _time.time() > deadline

    slug = company_name.strip()
    for suffix in ['', ' S.A.', ' SA', ' S.A', ' Ltda', ' LTDA', ' LTDA.']:
        slug = slug.replace(suffix, '')

    slug_underscore = slug.replace(' ', '_')
    urls_to_try = [
        f"https://pt.wikipedia.org/wiki/{requests.utils.quote(slug_underscore)}",
        f"https://pt.wikipedia.org/wiki/{requests.utils.quote(slug_underscore + '_(empresa)')}",
    ]

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
    }

    def _parse_infobox(soup):
        infobox = soup.select_one("table.infobox, table.infotaula, table.vcard")
        if not infobox:
            infobox = soup.select_one("table.infobox_v2")
        if not infobox:
            return None
        for row in infobox.find_all("tr"):
            label_el = row.find("th")
            value_el = row.find("td")
            if not label_el or not value_el:
                continue
            label = label_el.get_text(strip=True).lower()
            value = value_el.get_text(" ", strip=True)
            if any(kw in label for kw in ['funcionário', 'funcionarios', 'colaborador', 'empregado', 'empregados', 'quadro de func']):
                clean_val = value.replace('\xa0', '').replace('·', '').replace(',', '').replace('(', ' ').replace(')', ' ')
                clean_val = re.sub(r'(\d) (\d)', r'\1\2', clean_val)
                nums = re.findall(r'(\d[\d.]*)', clean_val)
                candidates = []
                for n in nums:
                    n_clean = n.replace('.', '')
                    if n_clean.isdigit():
                        val = int(n_clean)
                        if 1900 <= val <= 2099:
                            continue
                        if val > 0:
                            candidates.append(val)
                if candidates:
                    count = max(candidates)
                    return {"funcionarios": count, "fonte": "wikipedia", "confianca": "alta"}
        return None

    for wiki_url in urls_to_try:
        if _timed_out():
            break
        try:
            resp = requests.get(wiki_url, timeout=(1, 2), headers=headers)
            if resp.status_code != 200:
                continue
            soup = BS(resp.text, "html.parser")
            result = _parse_infobox(soup)
            if result:
                return result
        except Exception:
            continue

    if not _timed_out():
        try:
            api_url = f"https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch={requests.utils.quote(company_name)}&format=json&srlimit=2"
            resp = requests.get(api_url, timeout=(1, 2), headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("query", {}).get("search", []):
                    if _timed_out():
                        break
                    title = item.get("title", "")
                    page_url = f"https://pt.wikipedia.org/wiki/{requests.utils.quote(title.replace(' ', '_'))}"
                    resp2 = requests.get(page_url, timeout=(1, 2), headers=headers)
                    if resp2.status_code == 200:
                        soup = BS(resp2.text, "html.parser")
                        result = _parse_infobox(soup)
                        if result:
                            return result
        except Exception:
            pass

    return {}


def _search_bing_employees(company_name: str, cnpj: str = "", deadline: float = 999) -> dict:
    """Search Bing for employee count from multiple angles."""
    from bs4 import BeautifulSoup as BS
    import re, time as _time

    def _timed_out():
        return _time.time() > deadline

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    }

    queries = [
        f'"{company_name}" "funcionários" OR "colaboradores" OR "empregados"',
        f'"{company_name}" team size employees',
    ]

    patterns = [
        r'([\d]+(?:\.[\d]{3})*)\s*(?:funcionários?|colaboradores?|empregados?|employees?)',
        r'(?:funcionários?|colaboradores?|empregados?)\s*(?:de\s*)?([\d]+(?:\.[\d]{3})*)',
        r'com\s+([\d]+(?:\.[\d]{3})*)\s*(?:funcionários?|colaboradores?)',
        r'([\d]+)\s* mil\s*(?:funcionários?|colaboradores?|empregados?)',
        r'(?:possui|conta com|tem)\s+([\d]+(?:\.[\d]{3})*)\s*(?:funcionários?|colaboradores?)',
    ]

    for q in queries:
        if _timed_out():
            break
        try:
            url = f"https://www.bing.com/search?q={requests.utils.quote(q)}&setlang=pt-BR"
            resp = requests.get(url, timeout=(1, 2), headers=headers)
            if resp.status_code != 200:
                continue
            soup = BS(resp.text, "html.parser")

            all_text = ""
            for item in soup.select("li.b_algo, div.b_caption"):
                all_text += " " + item.get_text(" ", strip=True)

            for p in patterns:
                matches = re.findall(p, all_text, re.IGNORECASE)
                for m in matches:
                    clean = m.replace('.', '').replace(',', '')
                    if clean.isdigit():
                        count = int(clean)
                        if 5 <= count <= 1000000:
                            return {"funcionarios": count, "fonte": "web_search", "confianca": "media"}
        except Exception:
            continue

    return {}


def _search_linkedin_via_bing(company_name: str, deadline: float = 999) -> dict:
    """Search Bing for LinkedIn company page and extract employee range."""
    from bs4 import BeautifulSoup as BS
    import re, time as _time

    if _time.time() > deadline:
        return {}

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    }

    q = f'site:linkedin.com/company "{company_name}"'

    try:
        url = f"https://www.bing.com/search?q={requests.utils.quote(q)}&setlang=pt-BR"
        resp = requests.get(url, timeout=(1, 2), headers=headers)
        if resp.status_code != 200:
            return {}
        soup = BS(resp.text, "html.parser")

        for item in soup.select("li.b_algo"):
            snippet = item.get_text(" ", strip=True).lower()

            range_patterns = [
                r'(\d[\d,.]*)\s*[-–]\s*(\d[\d,.]*)\s*(?:employees|funcionários|colaboradores)',
                r'(\d[\d,.]*)\s*(?:employee|funcionário|colaborador)s?',
                r'(\d+)\s*(?:a|to)\s*(\d+)\s*(?:employees|funcionários)',
            ]

            for rp in range_patterns:
                m = re.search(rp, snippet, re.IGNORECASE)
                if m:
                    groups = m.groups()
                    if len(groups) == 2:
                        low = int(groups[0].replace('.', '').replace(',', ''))
                        high = int(groups[1].replace('.', '').replace(',', ''))
                        if 10 <= low <= high <= 1000000:
                            mid = (low + high) // 2
                            return {
                                "funcionarios": mid,
                                "fonte": "linkedin",
                                "confianca": "media",
                                "faixa": f"{low}-{high}",
                            }
                    elif len(groups) == 1:
                        count = int(groups[0].replace('.', '').replace(',', ''))
                        if 10 <= count <= 1000000:
                            return {
                                "funcionarios": count,
                                "fonte": "linkedin",
                                "confianca": "media",
                            }
    except Exception:
        pass

    return {}


def _estimate_by_cnaeporte(cnae: str, porte: str, capital_social: str) -> dict:
    """Estimate employee range based on CNAE + porte + capital social."""
    cnae = str(cnae or '')
    porte = str(porte or '').lower()
    cs_str = str(capital_social or '').replace('R$', '').replace('.', '').replace(',', '.').strip()

    porte_ranges = {
        'me': (1, 10), 'micro': (1, 10), 'mei': (1, 5),
        'epp': (5, 50), 'empresa de pequeno porte': (5, 50),
        'medio': (50, 500), 'medio porte': (50, 500),
        'grande': (500, 10000), 'grande empresa': (500, 10000),
        'demais': (10, 500),
    }

    range_est = porte_ranges.get(porte, (1, 100))

    try:
        cs_val = float(cs_str) if cs_str else 0
        if cs_val >= 10000000:
            range_est = (max(range_est[0], 100), max(range_est[1], 1000))
        elif cs_val >= 1000000:
            range_est = (max(range_est[0], 20), max(range_est[1], 200))
        elif cs_val >= 100000:
            range_est = (max(range_est[0], 5), max(range_est[1], 50))
    except (ValueError, TypeError):
        pass

    return {
        "funcionarios": None,
        "faixa": f"{range_est[0]}-{range_est[1]}",
        "fonte": "estimativa_cnae_porte",
        "confianca": "estimativa",
        "range_min": range_est[0],
        "range_max": range_est[1],
    }


def check_employee_count(name: str = "", cnpj: str = "", porte: str = "",
                         capital_social: str = "", cnae: str = "") -> dict:
    """
    Multi-source employee count check (max 25s total):
    1. Wikipedia infobox (exact count for known companies)
    2. Bing web search (regex extraction from multiple queries)
    3. LinkedIn via Bing (employee range from company pages)
    4. CNAE + porte estimation (fallback)
    Returns: { funcionarios, fonte, confianca, faixa, detalhes }
    """
    import time as _time
    _start = _time.time()
    _max = 15

    # Source 1: Wikipedia (budget: 0-5s)
    try:
        wiki = _search_wikipedia_employees(name, deadline=_start + 5)
        if wiki.get("funcionarios"):
            return {
                "funcionarios": wiki["funcionarios"],
                "fonte": "wikipedia",
                "confianca": wiki["confianca"],
                "faixa": "exato",
            }
    except Exception:
        pass

    if _time.time() - _start > _max:
        return _estimate_by_cnaeporte(cnae, porte, capital_social)

    # Source 2: Bing web search (budget: 5-11s)
    try:
        bing = _search_bing_employees(name, cnpj, deadline=_start + 11)
        if bing.get("funcionarios"):
            return {
                "funcionarios": bing["funcionarios"],
                "fonte": "web_search",
                "confianca": bing["confianca"],
                "faixa": "exato",
            }
    except Exception:
        pass

    if _time.time() - _start > _max:
        return _estimate_by_cnaeporte(cnae, porte, capital_social)

    # Source 3: LinkedIn via Bing (budget: 11-14s)
    try:
        linkedin = _search_linkedin_via_bing(name, deadline=_start + 14)
        if linkedin.get("funcionarios"):
            return {
                "funcionarios": linkedin["funcionarios"],
                "fonte": "linkedin",
                "confianca": linkedin.get("confianca", "media"),
                "faixa": linkedin.get("faixa", "exato"),
            }
    except Exception:
        pass

    # Source 4: CNAE + porte estimation (instant, fallback)
    est = _estimate_by_cnaeporte(cnae, porte, capital_social)
    est["detalhes"] = {"nota": "Estimativa baseada em porte e CNAE (sem dados exatos)"}
    return est
