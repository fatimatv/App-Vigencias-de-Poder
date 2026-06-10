from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "test-results" / "vigencias-dashboard.png"
OUT.parent.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    page.goto("http://localhost:5173", wait_until="networkidle")
    page.get_by_text("Repositorio de vigencias de poder").wait_for(timeout=10000)
    page.get_by_text("Registrar nueva empresa").wait_for(timeout=10000)
    page.screenshot(path=str(OUT), full_page=True)
    browser.close()

print(f"screenshot={OUT}")
