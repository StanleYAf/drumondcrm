"""
scrape_anvisa.py — Raspa os alertas de Tecnovigilância da ANVISA
navegando de verdade pela tela (Playwright), sem depender de API.

A cada execução, salva um print de tela e o HTML da área de resultados
em debug_anvisa/ — assim, se algo mudar no site ou os seletores precisarem
de ajuste, dá pra ver exatamente o que a página mostrou, em vez de
adivinhar no escuro.
"""

import os
import re
import time
import unicodedata
from pathlib import Path
from datetime import datetime
import requests
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

ANVISA_APP_URL = "https://consultas.anvisa.gov.br/#/alertas-sanitarios/"

RPA_SECRET_KEY = os.environ["RPA_SECRET_KEY"]
EDGE_URL = os.environ.get(
    "EDGE_FUNCTION_ANVISA_URL",
    "https://neiavpmruembxopzofny.supabase.co/functions/v1/sincronizar-alertas-anvisa"
)

MAX_PAGINAS = 10
DEBUG_DIR = Path("debug_anvisa")
DEBUG_DIR.mkdir(exist_ok=True)


def normalizar(texto):
    s = unicodedata.normalize("NFD", str(texto or ""))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.strip().lower()


def salvar_debug(page, nome):
    """Salva print de tela + HTML da página pra investigação, sempre que algo for inesperado."""
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    try:
        page.screenshot(path=str(DEBUG_DIR / f"{nome}_{ts}.png"), full_page=True)
        (DEBUG_DIR / f"{nome}_{ts}.html").write_text(page.content(), encoding="utf-8")
        print(f"  🐛 Debug salvo: {nome}_{ts}.png / .html")
    except Exception as e:
        print(f"  ⚠️ Não consegui salvar debug: {e}")


def encontrar_tabela_resultados(page):
    """
    Tenta localizar a tabela/lista de resultados usando várias estratégias,
    já que não temos garantia de qual framework de UI o site usa por trás.
    Retorna o Locator das linhas de dados, ou None se não achar nenhuma.
    """
    candidatos = [
        "table tbody tr",                    # tabela HTML genérica
        ".ui-datatable-data tr",              # PrimeFaces (comum em sistemas JSF do governo)
        "[role='table'] [role='row']",        # tabelas construídas via ARIA (React/Angular)
        ".mat-row",                           # Angular Material
        ".resultado-item, .alerta-item, .card-alerta",  # possíveis classes customizadas
        "ul.resultados li",
    ]
    for seletor in candidatos:
        loc = page.locator(seletor)
        try:
            count = loc.count()
        except Exception:
            count = 0
        if count > 0:
            print(f"  ✓ Tabela de resultados encontrada com seletor: '{seletor}' ({count} linhas)")
            return loc, seletor
    return None, None


def clicar_pesquisar(page):
    """Tenta clicar no botão de pesquisar/buscar, testando os textos mais prováveis."""
    textos_possiveis = ["Pesquisar", "Buscar", "Consultar", "Filtrar", "Search"]
    for texto in textos_possiveis:
        btn = page.get_by_role("button", name=re.compile(texto, re.IGNORECASE))
        if btn.count() > 0:
            btn.first.click()
            print(f"  ✓ Clicou no botão '{texto}'")
            return True
    print("  ⚠️ Não encontrou botão de pesquisar por texto — a lista pode carregar sozinha ao abrir a página.")
    return False


def extrair_linha(linha_locator):
    """Extrai o texto de cada célula/coluna de uma linha, sem assumir nomes de campo."""
    celulas = linha_locator.locator("td, .cell, .col, div").all()
    textos = []
    for c in celulas:
        try:
            t = c.inner_text().strip()
            if t:
                textos.append(t)
        except Exception:
            continue
    if not textos:
        # Fallback: pega o texto inteiro da linha, sem separar por coluna
        try:
            textos = [linha_locator.inner_text().strip()]
        except Exception:
            textos = []
    return textos


def montar_alerta_a_partir_da_linha(textos_colunas: list, url_pagina: str):
    """
    Como ainda não sabemos a ordem exata das colunas, guardamos o texto bruto
    de cada linha em 'descricao' e tentamos identificar um número de alerta
    (padrão comum: dígitos, às vezes com barra/ano, tipo '5056/2026').
    Isso garante que NADA se perde mesmo antes de calibrarmos o parser certinho.
    """
    texto_completo = " | ".join(textos_colunas)

    numero_alerta = None
    m = re.search(r"\b\d{3,6}(?:/\d{4})?\b", texto_completo)
    if m:
        numero_alerta = m.group(0)
    else:
        # Sem número identificável — usa um hash curto do texto pra evitar duplicata
        numero_alerta = f"SEMNUM-{abs(hash(texto_completo)) % 10_000_000}"

    return {
        "numero_alerta": numero_alerta,
        "data_publicacao": None,  # calibrar depois de ver o formato real
        "fabricante": textos_colunas[1] if len(textos_colunas) > 1 else "Não identificado",
        "equipamento": textos_colunas[2] if len(textos_colunas) > 2 else texto_completo[:200],
        "descricao": texto_completo[:2000],
        "url_alerta": url_pagina,
    }


def raspar_alertas():
    alertas = []
    vistos = set()

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        print("🌐 Abrindo a página de Alertas Sanitários da ANVISA...")
        try:
            page.goto(ANVISA_APP_URL, wait_until="networkidle", timeout=60000)
        except PWTimeout:
            print("  ⚠️ Timeout no carregamento inicial, seguindo mesmo assim.")

        time.sleep(4)  # dá tempo do app front-end montar a tela de verdade
        salvar_debug(page, "pagina_inicial")

        clicar_pesquisar(page)
        time.sleep(3)

        for pagina in range(1, MAX_PAGINAS + 1):
            print(f"\n📄 Lendo página {pagina} de resultados...")
            linhas, seletor_usado = encontrar_tabela_resultados(page)

            if linhas is None:
                print("  ✗ Não encontrei nenhuma tabela/lista de resultados na tela.")
                salvar_debug(page, "sem_tabela_encontrada")
                break

            total_linhas = linhas.count()
            novos_nesta_pagina = 0

            for i in range(total_linhas):
                try:
                    linha = linhas.nth(i)
                    textos = extrair_linha(linha)
                    if not textos:
                        continue
                    alerta = montar_alerta_a_partir_da_linha(textos, page.url)

                    chave = alerta["numero_alerta"]
                    if chave in vistos:
                        continue
                    vistos.add(chave)
                    alertas.append(alerta)
                    novos_nesta_pagina += 1
                except Exception as e:
                    print(f"  ⚠️ Erro lendo linha {i}: {e}")

            print(f"  ✓ {novos_nesta_pagina} alerta(s) novo(s) extraído(s) desta página")

            if novos_nesta_pagina == 0:
                print("  Nenhum dado novo — parando paginação.")
                break

            # Tenta avançar de página (vários padrões possíveis de paginador)
            avancou = False
            seletores_proxima = [
                "button[aria-label='Next']",
                "button[aria-label='Próxima']",
                ".ui-paginator-next:not(.ui-state-disabled)",
                "a:has-text('Próxima')",
                "button:has-text('Próxima')",
                "[aria-label='next page']",
            ]
            for sel in seletores_proxima:
                btn = page.locator(sel)
                if btn.count() > 0 and btn.first.is_visible():
                    try:
                        btn.first.click()
                        time.sleep(2.5)
                        avancou = True
                        break
                    except Exception:
                        continue

            if not avancou:
                print("  Não encontrei botão de próxima página (ou chegamos na última). Parando.")
                break

    print(f"\n{'=' * 50}")
    print(f"✓ Total de alertas coletados: {len(alertas)}")
    print(f"{'=' * 50}")

    if alertas:
        print("\nExemplo do primeiro alerta capturado (pra conferência visual):")
        print(alertas[0])

    return alertas


def sincronizar(alertas: list):
    if not alertas:
        print("Nenhum alerta pra sincronizar.")
        return

    resp = requests.post(
        EDGE_URL,
        headers={
            "Authorization": f"Bearer {RPA_SECRET_KEY}",
            "Content-Type": "application/json",
        },
        json={"alertas": alertas},
        timeout=60,
    )

    if resp.status_code == 200:
        total = resp.json().get("total", len(alertas))
        print(f"✓ {total} alertas sincronizados com sucesso")
    else:
        print(f"⚠️ Erro ao sincronizar: {resp.status_code} — {resp.text[:300]}")


if __name__ == "__main__":
    print("=" * 60)
    print("🔔 Raspando alertas de Tecnovigilância da ANVISA (modo navegador)")
    print("=" * 60)
    alertas = raspar_alertas()
    sincronizar(alertas)
