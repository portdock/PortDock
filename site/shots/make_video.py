# 앱 소개·홈의 움직이는 화면 — e2e/ui-preview(가짜 백엔드, 앱 실행 아님)를 Chromium 으로 열어 조작을 녹화하고
# site/public/img/apps/<앱>.<ko|en>.mp4(10초 남짓, 소리 없음)로 저장한다. 결과 mp4 를 커밋한다.
# 준비: make.py 와 같음 + ffmpeg. 미리보기 서버 열두 개(5201~5212) — e2e/README.md «화면 미리보기·캡처» 1번
# 실행: python -X utf8 site/shots/make_video.py [앱 ...]
import importlib.util, os, re, shutil, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public", "img", "apps")
W, H = 1200, 760
APPS = {"serial": 5201, "modbus-slave": 5202, "tcp": 5203, "udp": 5204, "simulator": 5205, "netscan": 5206,
        "modbus-master": 5207, "scpi": 5208, "plot": 5209, "port-inspector": 5210,
        "plc-simulator": 5211, "hw-tester": 5212}
only = sys.argv[1:] or list(APPS)
# 켠 뒤 지켜보는 시간(초) — 값이 움직이는 것을 보여 줄 만큼만
WATCH = {"netscan": 9, "plot": 8, "serial": 7, "tcp": 7, "udp": 7, "modbus-master": 8, "modbus-slave": 7}

# make.py 의 sanitize(가짜 데이터의 MAC·일련번호 등을 예시 값으로)를 그대로 쓴다 — make.py 는 실행하지 않고 그 함수만 읽는다
src = open(os.path.join(HERE, "make.py"), encoding="utf8").read()
ns = {"re": re}
exec(src[src.index("def sanitize"):src.index("def run(")], ns)
sanitize = ns["sanitize"]

CURSOR = """() => {
  const c = document.createElement('div');
  c.id = '__cur';
  c.style.cssText = 'position:fixed;left:600px;top:420px;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(11,110,117,.35);border:2px solid #0b6e75;z-index:99999;pointer-events:none;transition:left .7s ease,top .7s ease,transform .15s';
  document.body.appendChild(c);
}"""
# 눌릴 단추 — make.py 와 같은 고르기
PICK = {
    "connect": "[...document.querySelectorAll('aside button.btn.primary, .side button.btn.primary')][0]",
    "port": "[...document.querySelectorAll('.port-item')].find((x)=>/COM5/.test(x.textContent))",
    "preset": "[...document.querySelectorAll('button')].find(x=>/Modbus RTU 03/.test(x.textContent))",
    "example": "document.querySelector('.first-card .first-example')",
    "rec": "document.querySelector('.toolbar .rec-btn')",
    "row": "[...document.querySelectorAll('.log .row, .log tr, .rows > div')].filter(x=>/RX/.test(x.textContent))[0]",
}


def click(pg, key):
    """커서를 단추로 옮겨 누른다. 단추가 없으면 False"""
    js = PICK[key]
    box = pg.evaluate(f"() => {{ const b = {js}; if (!b) return null; const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }}")
    if not box:
        return False
    pg.evaluate("p => { const c = document.getElementById('__cur'); if (c) { c.style.left = p[0] + 'px'; c.style.top = p[1] + 'px'; } }", box)
    time.sleep(0.8)
    pg.evaluate("() => { const c = document.getElementById('__cur'); if (c) c.style.transform = 'scale(.7)'; }")
    time.sleep(0.15)
    pg.evaluate(f"() => {{ const b = {js}; b && b.click(); }}")
    pg.evaluate("() => { const c = document.getElementById('__cur'); if (c) c.style.transform = ''; }")
    return True


CLOSE_TOAST = """() => { for (const b of document.querySelectorAll('.toast button, [class*=toast] button')) b.click(); }"""


def record(browser, app, port, lang, out):
    tmp = tempfile.mkdtemp()
    ctx = browser.new_context(viewport={"width": W, "height": H}, device_scale_factor=1, record_video_dir=tmp, record_video_size={"width": W, "height": H})

    def handle(route):
        r = route.fetch()
        route.fulfill(response=r, body=sanitize(r.text()))

    ctx.route(re.compile(r".*/mock\.js(\?.*)?$"), handle)
    pg = ctx.new_page()
    t0 = time.time()
    pg.goto(f"http://localhost:{port}/")
    pg.evaluate("s => { localStorage.clear(); localStorage.setItem('settings', JSON.stringify(s)); localStorage.setItem('lang', JSON.stringify(s.lang)); }", {"lang": lang, "theme": "light"})
    pg.reload()
    time.sleep(1.3)
    pg.evaluate(CURSOR)
    start = time.time() - t0
    time.sleep(0.8)  # 켠 첫 화면을 잠깐
    if app == "simulator":
        click(pg, "preset")
        time.sleep(0.5)
    if app == "plc-simulator":
        click(pg, "example")
        time.sleep(0.6)
    if app == "hw-tester":
        click(pg, "rec")
    if app == "port-inspector":
        click(pg, "port")
    else:
        click(pg, "connect")
    time.sleep(WATCH.get(app, 5))
    pg.evaluate(CLOSE_TOAST)
    if app in ("serial", "tcp", "udp"):
        if click(pg, "row"):
            time.sleep(2.2)
    end = time.time() - t0
    video = pg.video.path()
    ctx.close()
    # H.264 — 어느 브라우저나 재생, 움직임이 적은 화면이라 낮은 초당 장수로 작게
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{start:.2f}", "-to", f"{end:.2f}", "-i", video,
                    "-an", "-vf", "fps=12,format=yuv420p", "-c:v", "libx264", "-preset", "veryslow", "-crf", "30",
                    "-movflags", "+faststart", out], check=True)
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"{os.path.basename(out)} {end - start:.1f}s {os.path.getsize(out) // 1024}KB", flush=True)


with sync_playwright() as p:
    b = p.chromium.launch()
    for app in only:
        for lang in ("ko", "en"):
            record(b, app, APPS[app], lang, os.path.join(OUT, f"{app}.{lang}.mp4"))
    b.close()
