# 앱 소개·홈의 앱 화면 그림 — e2e/ui-preview(가짜 백엔드, 앱 실행 아님)를 Chromium 으로 열어 1200×760 라이트로 찍고
# site/public/img/apps/<앱>.<ko|en>.webp(장당 30~75KB)로 저장한다. 결과 webp 를 커밋한다.
# 준비: pip install playwright pillow && playwright install chromium
#       미리보기 서버 열 개(5201~5210) — e2e/README.md «화면 미리보기·캡처» 1번
# 실행: python -X utf8 site/shots/make.py [앱 ...]
import sys, re, os, time
from playwright.sync_api import sync_playwright

from PIL import Image
import io
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public", "img", "apps")
only = sys.argv[1:] or None
os.makedirs(OUT, exist_ok=True)
APPS = {"serial": 5201, "modbus-slave": 5202, "tcp": 5203, "udp": 5204, "simulator": 5205, "netscan": 5206,
        "modbus-master": 5207, "scpi": 5208, "plot": 5209, "port-inspector": 5210}

# 가짜 데이터 중 실제 기기처럼 보이는 MAC·일련번호·NIC 이름은 찍을 때만 예시 값으로 바꾼다(e2e/ui-preview/mock.js 는 그대로)
def sanitize(js: str) -> str:
    n = [0]
    def mac(m):
        n[0] += 1
        return f"02:00:5E:00:00:{n[0]:02X}"
    js = re.sub(r"\b[0-9A-F]{2}(?::[0-9A-F]{2}){5}\b", mac, js)
    js = js.replace("A10KQ2XZ", "PD000001")
    js = js.replace("Intel(R) Ethernet Connection I219-LM", "USB Ethernet Adapter")
    js = js.replace("Killer(R) Wi-Fi 6 AX1650x", "Wireless Adapter")
    js = js.replace('vendor: "GIGA-BYTE"', 'vendor: ""').replace('vendor: "Intel Corporate"', 'vendor: ""')
    js = js.replace("mercury corperation", "Router").replace("C:\\\\Users\\\\me\\\\", "C:\\\\Users\\\\user\\\\")
    return js

def run(pg, app, port, lang, theme, w, h):
    pg.set_viewport_size({"width": w, "height": h})
    pg.goto(f"http://localhost:{port}/")
    pg.evaluate("s => { localStorage.clear(); localStorage.setItem('settings', JSON.stringify(s)); localStorage.setItem('lang', JSON.stringify(s.lang)); }",
                {"lang": lang, "theme": theme})
    pg.reload()
    time.sleep(1.3)
    if app == "simulator":
        pg.evaluate("""() => { const b=[...document.querySelectorAll('button')].find(x=>/Modbus RTU 03/.test(x.textContent)); b && b.click(); }""")
        time.sleep(0.5)
    pg.evaluate("""() => { const b=[...document.querySelectorAll('aside button.btn.primary, .side button.btn.primary')][0]; b && b.click(); }""")
    pg.evaluate("""() => { const p=[...document.querySelectorAll('.port-item')].find((x)=>/COM5/.test(x.textContent)); p && p.click(); }""")
    time.sleep({"netscan": 14, "plot": 5, "serial": 6, "tcp": 5, "udp": 5, "modbus-master": 6, "modbus-slave": 5}.get(app, 3))
    # 처음 한 번 뜨는 안내 알림(토스트)은 닫는다
    pg.evaluate("""() => { for (const b of document.querySelectorAll('button')) { const t=b.textContent.trim(); const box=b.parentElement; if ((t==='✕'||t==='×') && box && /시작했습니다|started|두 번|double/i.test(box.textContent)) b.click(); } }""")
    time.sleep(0.4)
    # 줄 하나를 눌러 오른쪽 «상세» 를 채운다(Serial·TCP·UDP)
    if app in ("serial", "tcp", "udp"):
        pg.evaluate("""() => { const r=[...document.querySelectorAll('.log .row, .log tr, .rows > div')].filter(x=>/RX/.test(x.textContent)); r[0] && r[0].click(); }""")
        time.sleep(0.6)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(device_scale_factor=1)
    def handle(route):
        r = route.fetch()
        route.fulfill(response=r, body=sanitize(r.text()))
    ctx.route(re.compile(r".*/mock\.js(\?.*)?$"), handle)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    for app, port in APPS.items():
        if only and app not in only:
            continue
        for lang in ("ko", "en"):
            run(pg, app, port, lang, "light", 1200, 760)
            png = pg.screenshot()
            Image.open(io.BytesIO(png)).convert("RGB").save(f"{OUT}/{app}.{lang}.webp", "WEBP", quality=72, method=6)
            print(app, lang, errs[-1:] if errs else "")
    b.close()
