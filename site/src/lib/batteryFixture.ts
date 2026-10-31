// 시험·예시용 가짜 배터리 리포트 — powercfg /batteryreport 가 만드는 HTML 의 표 모양만 흉내 낸다(값·이름은 모두 지어낸 것).
// 머리 정보(컴퓨터 이름 등)는 «화면에 나오지 않는지» 시험하려고 일부러 넣었다. 실제 노트북 리포트와 다를 수 있다 — 특히 한국어판 머리글은 추정.

const head = (lang: "en" | "ko") => {
  const L =
    lang === "en"
      ? ["Battery report", "COMPUTER NAME", "SYSTEM PRODUCT NAME", "BIOS", "OS BUILD", "REPORT TIME"]
      : ["배터리 보고서", "컴퓨터 이름", "시스템 제품 이름", "BIOS", "OS 빌드", "보고서 시간"];
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${L[0]}</title>
<style>td{padding:2px}</style><script>var x = "<table><tr><td>not a table</td></tr></table>";</script></head><body>
<h1>${L[0]}</h1>
<table style="margin-bottom: 6em;">
<tr><td><span class="label">${L[1]}</span></td><td>EXAMPLE-LAPTOP-01</td></tr>
<tr><td><span class="label">${L[2]}</span></td><td>Example Notebook 14</td></tr>
<tr><td><span class="label">${L[3]}</span></td><td>1.2.3 01/01/2026</td></tr>
<tr><td><span class="label">${L[4]}</span></td><td>10.0.26100</td></tr>
<tr><td><span class="label">${L[5]}</span></td><td>2026-10-31 09:00:00</td></tr>
</table>`;
};

/** 영어 Windows 꼴 — 배터리 하나, 이력 5칸, 최근 사용 6줄, 배터리 사용 표(시간 칸) 하나 */
export const REPORT_EN = `${head("en")}
<h2>Installed batteries</h2>
<div class="explanation">Information about each currently installed battery</div>
<table>
<thead><tr><td>&nbsp;</td><td>BATTERY 1</td></tr></thead>
<tr><td><span class="label">NAME</span></td><td>EX-BAT-0001</td></tr>
<tr><td><span class="label">MANUFACTURER</span></td><td>ExampleCell</td></tr>
<tr><td><span class="label">SERIAL NUMBER</span></td><td>SN-0000-1234</td></tr>
<tr><td><span class="label">CHEMISTRY</span></td><td>LiP</td></tr>
<tr><td><span class="label">DESIGN CAPACITY</span></td><td>56,000 mWh
</td></tr>
<tr style="height:0.4em;"></tr>
<tr><td><span class="label">FULL CHARGE CAPACITY</span></td><td>47,320 mWh
</td></tr>
<tr><td><span class="label">CYCLE COUNT</span></td><td>212
</td></tr>
</table>
<h2>Recent usage</h2>
<table>
<thead><tr><td>START TIME</td><td class="centered">STATE</td><td class="centered">SOURCE</td><td colspan="2" class="centered">CAPACITY REMAINING</td></tr></thead>
<tr class="even dc 1"><td class="dateTime"><span class="date">2026-10-30 </span><span class="time">08:01:23</span></td><td class="state">Active</td><td class="acdc">Battery</td><td class="percent">93 %</td><td class="mw">44,010 mWh</td></tr>
<tr class="odd dc 2"><td class="dateTime"><span class="date"></span><span class="time">09:10:00</span></td><td class="state">Connected standby</td><td class="acdc">Battery</td><td class="percent">71 %</td><td class="mw">33,600 mWh</td></tr>
<tr class="even ac 3"><td class="dateTime"><span class="date"></span><span class="time">10:02:41</span></td><td class="state">Active</td><td class="acdc">AC</td><td class="percent">70 %</td><td class="mw">33,124 mWh</td></tr>
<tr class="odd ac 4"><td class="dateTime"><span class="date">2026-10-31 </span><span class="time">07:30:00</span></td><td class="state">Suspended</td><td class="acdc"></td><td class="percent">100 %</td><td class="mw">47,320 mWh</td></tr>
<tr class="even dc 5"><td class="dateTime"><span class="date"></span><span class="time">08:45:12</span></td><td class="state">Active</td><td class="acdc">Battery</td><td class="percent">88 %</td><td class="mw">41,642 mWh</td></tr>
<tr class="odd dc 6"><td class="dateTime"><span class="date"></span><span class="time">08:59:59</span></td><td class="state">Active</td><td class="acdc">Battery</td><td class="percent">85 %</td><td class="mw">-</td></tr>
</table>
<h2>Battery usage</h2>
<table>
<thead><tr><td>START TIME</td><td class="centered">STATE</td><td class="centered">DURATION</td><td colspan="2" class="centered">ENERGY DRAINED</td></tr></thead>
<tr class="even dc 1"><td class="dateTime"><span class="date">2026-10-30 </span><span class="time">08:01:23</span></td><td class="state">Active</td><td class="hms">1:08:37</td><td class="percent">22 %</td><td class="mw">10,410 mWh</td></tr>
</table>
<h2>Battery capacity history</h2>
<table>
<thead><tr><td><span>PERIOD</span></td><td class="centered">FULL CHARGE CAPACITY</td><td class="centered">DESIGN CAPACITY</td></tr></thead>
<tr class="even 1"><td class="dateTime"><span class="date">2025-10-01</span> - <span class="date">2025-11-01</span></td><td class="mw">55,210 mWh</td><td class="mw">56,000 mWh</td></tr>
<tr class="odd 2"><td class="dateTime"><span class="date">2025-11-01</span> - <span class="date">2026-01-01</span></td><td class="mw">53,900 mWh</td><td class="mw">56,000 mWh</td></tr>
<tr class="even 3"><td class="dateTime"><span class="date">2026-01-01</span> - <span class="date">2026-04-01</span></td><td class="mw">51,020 mWh</td><td class="mw">56,000 mWh</td></tr>
<tr class="odd 4"><td class="dateTime"><span class="date">2026-04-01</span> - <span class="date">2026-08-01</span></td><td class="mw">49,000 mWh</td><td class="mw">56,000 mWh</td></tr>
<tr class="even 5"><td class="dateTime"><span class="date">2026-10-24</span></td><td class="mw">47,320 mWh</td><td class="mw">56,000 mWh</td></tr>
</table>
<h2>Battery life estimates</h2>
<table>
<thead><tr><td>PERIOD</td><td>AT FULL CHARGE ACTIVE</td><td>CONNECTED STANDBY</td><td>AT DESIGN CAPACITY ACTIVE</td><td>CONNECTED STANDBY</td></tr></thead>
<tr><td>2025-10-01 - 2025-11-01</td><td class="hms">6:10:00</td><td class="nullValue">-</td><td class="hms">6:20:00</td><td class="nullValue">-</td></tr>
</table>
</body></html>`;

/** 한국어 Windows 꼴(머리글은 추정) — 배터리 둘, 충전 횟수를 알려 주지 않음(-), 이력 3칸 */
export const REPORT_KO = `${head("ko")}
<h2>설치된 배터리</h2>
<table>
<thead><tr><td>&nbsp;</td><td>배터리 1</td><td>배터리 2</td></tr></thead>
<tr><td><span class="label">이름</span></td><td>EX-A</td><td>EX-B</td></tr>
<tr><td><span class="label">제조업체</span></td><td>ExampleCell</td><td>ExampleCell</td></tr>
<tr><td><span class="label">일련 번호</span></td><td>SN-A</td><td>SN-B</td></tr>
<tr><td><span class="label">화학 성분</span></td><td>LION</td><td>LION</td></tr>
<tr><td><span class="label">설계 용량</span></td><td>24,000 mWh</td><td>48,000 mWh</td></tr>
<tr style="height:0.4em;"></tr>
<tr><td><span class="label">완전 충전 용량</span></td><td>20,400 mWh</td><td>45,600 mWh</td></tr>
<tr><td><span class="label">사이클 수</span></td><td>-</td><td>-</td></tr>
</table>
<h2>최근 사용</h2>
<table>
<thead><tr><td>시작 시간</td><td>상태</td><td>원본</td><td colspan="2">남은 용량</td></tr></thead>
<tr><td class="dateTime"><span class="date">2026-10-31 </span><span class="time">13:00:00</span></td><td class="state">활성</td><td class="acdc">배터리</td><td class="percent">50 %</td><td class="mw">33,000 mWh</td></tr>
</table>
<h2>배터리 용량 기록</h2>
<table>
<thead><tr><td>기간</td><td>설계 용량</td><td>완전 충전 용량</td></tr></thead>
<tr><td class="dateTime">2026-08-01 - 2026-09-01</td><td class="mw">72,000 mWh</td><td class="mw">68,000 mWh</td></tr>
<tr><td class="dateTime">2026-09-01 - 2026-10-01</td><td class="mw">72,000 mWh</td><td class="mw">67,000 mWh</td></tr>
<tr><td class="dateTime">2026-10-25</td><td class="mw">72,000 mWh</td><td class="mw">66,000 mWh</td></tr>
</table>
</body></html>`;

/** 데스크톱처럼 배터리가 없는 PC 의 리포트 — 표는 있지만 배터리 줄이 없다 */
export const REPORT_NO_BATTERY = `${head("en")}
<h2>Installed batteries</h2>
<table><thead><tr><td>&nbsp;</td></tr></thead></table>
<p>No batteries are currently installed.</p>
</body></html>`;
