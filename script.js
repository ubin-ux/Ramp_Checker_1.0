// ============================================================
//  주차장 경사로 단면 검토 - script.js (개선판)
// ============================================================

const svg      = document.getElementById("svg");
const statusEl = document.getElementById("status");

// ── 레이아웃 상수 ──────────────────────────────────────────
const VW      = 2000;       // viewBox 너비
const VH      = 720;        // viewBox 높이
const ML      = 140;        // 왼쪽 여백 (수직 치수선 공간)
const MR      = 60;         // 오른쪽 여백
const MT      = 65;         // 위쪽 여백 (범례·타이틀)
const BASE_Y  = 500;        // 경사로 바닥 SVG Y
const MAX_DH  = 380;        // 경사로 그림 최대 높이 (px)
const DRAW_W  = VW - ML - MR; // = 1800

const DIM_Y1  = BASE_Y + 36;  // 개별 구간 치수선 Y
const DIM_Y2  = BASE_Y + 78;  // 전체 길이 치수선 Y

// ── 색상 팔레트 ─────────────────────────────────────────────
const C = {
  relief : "#27ae60",   // 완화구간 (녹색)
  mid    : "#2471A3",   // 일반 경사구간 (청색)
  remain : "#D35400",   // 나머지 구간 (오렌지)
  over   : "#c0392b",   // 초과 구간 (적색)
  dim    : "#555555",   // 치수선
  fill   : "#dbeafe",   // 경사면 채우기
  grid   : "#e2eaf4",   // 그리드
  bg     : "#f8fafd",   // 배경
};

// ── 모드2 구간 데이터 ────────────────────────────────────────
let midSegments = [];

// ── 유틸리티 ────────────────────────────────────────────────
const v   = id  => +document.getElementById(id).value || 0;
const set = (id, val) => { document.getElementById(id).value = val; };

// ── 이벤트 ──────────────────────────────────────────────────
document.getElementById('controls-panel').addEventListener('input', e => {
  const t = e.target;
  if (t.tagName === 'INPUT') {
    if (t.dataset.index !== undefined) {
      midSegments[+t.dataset.index][t.dataset.key] = +t.value;
      updateSegmentUI(+t.dataset.index);
    }
    draw();
  }
  if (t.name === 'mode') toggleMode();
});

document.getElementById('btn-add').addEventListener('click', addSegment);

// ── 모드 전환 ────────────────────────────────────────────────
function toggleMode() {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const m1  = document.getElementById("mode1-mid");
  const m2  = document.getElementById("mode2-mid");
  const Li  = document.getElementById("L");
  const hf  = document.getElementById("hf");
  const hb  = document.getElementById("hb");
  const Sf  = document.getElementById("Sf");
  const Sb  = document.getElementById("Sb");

  const ro = (el, flag) => {
    el.readOnly = flag;
    el.classList.toggle("readonly-input", flag);
  };

  if (mode === "mode1") {
    m1.style.display = "block";
    m2.style.display = "none";
    ro(Li, true); ro(hf, true); ro(hb, true);
    ro(Sf, false); ro(Sb, false);
  } else {
    m1.style.display = "none";
    m2.style.display = "block";
    ro(Li, false); ro(hf, false); ro(hb, false);
    ro(Sf, true);  ro(Sb, true);
  }
  draw();
}

// ── 구간 관리 ────────────────────────────────────────────────
function addSegment() {
  midSegments.push({ l: 3000, h: 500 });
  renderSegments();
  draw();
}

function removeSegment(i) {
  midSegments.splice(i, 1);
  renderSegments();
  draw();
}

function moveSegment(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= midSegments.length) return;
  [midSegments[i], midSegments[j]] = [midSegments[j], midSegments[i]];
  renderSegments();
  draw();
}

function slopeInfo(seg) {
  const pct  = seg.l > 0 ? (seg.h / seg.l * 100) : 0;
  const over = pct > 17;
  return { pct, over, str: pct.toFixed(2), color: over ? C.over : C.relief };
}

function renderSegments() {
  const container = document.getElementById("segment-container");
  container.innerHTML = "";
  const n = midSegments.length;

  midSegments.forEach((seg, idx) => {
    const { str, over, color } = slopeInfo(seg);
    const div = document.createElement("div");
    div.className = "segment-row";
    div.innerHTML = `
      <div class="seg-header">
        <span class="seg-title">중간구간 ${idx + 1}</span>
        <div class="seg-controls">
          <button type="button" class="btn-move" onclick="moveSegment(${idx},-1)" ${idx === 0 ? 'disabled' : ''} title="위로 이동">▲</button>
          <button type="button" class="btn-move" onclick="moveSegment(${idx}, 1)" ${idx === n - 1 ? 'disabled' : ''} title="아래로 이동">▼</button>
          <button type="button" class="btn-del"  onclick="removeSegment(${idx})" title="구간 삭제">✕</button>
        </div>
      </div>
      <div class="input-row">
        <label><span>길이 (mm)</span><input type="number" value="${seg.l}" data-index="${idx}" data-key="l"></label>
        <label><span>높이 (mm)</span><input type="number" value="${seg.h}" data-index="${idx}" data-key="h"></label>
      </div>
      <div class="seg-info" id="seg-info-${idx}">
        구배: <b style="color:${color}">${str}%</b>
        ${over ? '<span class="warn-badge">⚠ 17% 초과</span>' : ''}
      </div>
    `;
    container.appendChild(div);
  });
}

function updateSegmentUI(idx) {
  const info = document.getElementById(`seg-info-${idx}`);
  if (!info) return;
  const { str, over, color } = slopeInfo(midSegments[idx]);
  info.innerHTML = `구배: <b style="color:${color}">${str}%</b>${over ? ' <span class="warn-badge">⚠ 17% 초과</span>' : ''}`;
}

// ============================================================
//  SVG 헬퍼
// ============================================================
function el(tag, attrs) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, val] of Object.entries(attrs)) e.setAttribute(k, val);
  return e;
}

function mkLine(x1, y1, x2, y2, attrs = {}) {
  return el("line", { x1, y1, x2, y2, stroke: "#333", "stroke-width": "1.5", ...attrs });
}

function mkText(t, x, y, attrs = {}) {
  const e = el("text", {
    x, y,
    "font-size"   : "13",
    fill          : "#333",
    "text-anchor" : "middle",
    "font-family" : "'Malgun Gothic','Apple SD Gothic Neo',Arial,sans-serif",
    ...attrs
  });
  e.textContent = t;
  return e;
}

// 배경박스 + 텍스트 레이블
function textBox(g, t, x, y, color = "#333", bg = "#fff", fs = 12) {
  const w  = Math.max(t.length * 8.5, 38) + 14;
  const h  = fs + 9;
  const rx = Math.min(4, h / 2);
  g.appendChild(el("rect", {
    x: x - w / 2, y: y - h + 3, width: w, height: h,
    fill: bg, rx, stroke: color, "stroke-width": "0.8", opacity: "0.93"
  }));
  const te = mkText(t, x, y, {
    "font-size": fs, fill: color, "font-weight": "bold"
  });
  g.appendChild(te);
}

// ── SVG 화살촉 정의 ──────────────────────────────────────────
function addDefs() {
  const defs = el("defs", {});

  // 전방 화살표(→)와 역방향 화살표(←) 각 색상별 생성
  const palette = {
    dark  : C.dim,
    green : C.relief,
    blue  : C.mid,
    orange: C.remain,
    red   : C.over,
  };

  for (const [name, color] of Object.entries(palette)) {
    // 전방 (끝점에 사용, 라인 방향과 같음)
    const mF = el("marker", {
      id: `a-${name}`,
      markerWidth: "7", markerHeight: "7",
      refX: "6.5", refY: "3.5",
      orient: "auto", markerUnits: "strokeWidth"
    });
    mF.appendChild(el("path", { d: "M0,0 L0,7 L7,3.5 z", fill: color }));
    defs.appendChild(mF);

    // 역방향 (시작점에 사용, 바깥쪽을 가리킴)
    const mR = el("marker", {
      id: `a-${name}-r`,
      markerWidth: "7", markerHeight: "7",
      refX: "0.5", refY: "3.5",
      orient: "auto", markerUnits: "strokeWidth"
    });
    mR.appendChild(el("path", { d: "M7,0 L7,7 L0,3.5 z", fill: color }));
    defs.appendChild(mR);
  }

  svg.appendChild(defs);
}

// 색상 → 화살촉 ID 쌍
function aids(color) {
  if (color === C.relief) return ["a-green-r",  "a-green"];
  if (color === C.mid)    return ["a-blue-r",   "a-blue"];
  if (color === C.remain) return ["a-orange-r", "a-orange"];
  if (color === C.over)   return ["a-red-r",    "a-red"];
  return ["a-dark-r", "a-dark"];
}

// ── 수평 치수선 ──────────────────────────────────────────────
// x1, x2: SVG x 좌표 / dimY: 치수선 Y / label: 텍스트 / color: 색상
function dimH(g, x1, x2, dimY, label, color = C.dim) {
  if (Math.abs(x2 - x1) < 4) return;
  const [aS, aE] = aids(color);

  // 보조선 (BASE_Y → dimY)
  [x1, x2].forEach(x => {
    g.appendChild(mkLine(x, BASE_Y + 1, x, dimY + 6, {
      stroke: "#bbb", "stroke-width": "0.9", "stroke-dasharray": "4,3"
    }));
  });

  // 치수선 (화살촉 포함)
  g.appendChild(mkLine(x1, dimY, x2, dimY, {
    stroke: color, "stroke-width": "1.6",
    "marker-start": `url(#${aS})`,
    "marker-end"  : `url(#${aE})`
  }));

  // 레이블
  textBox(g, label, (x1 + x2) / 2, dimY - 7, color, "#fff", 11);
}

// ── 수직 치수선 ──────────────────────────────────────────────
function dimV(g, dimX, y1, y2, label, color = C.dim) {
  const [aS, aE] = aids(color);
  const mid      = (y1 + y2) / 2;

  // 틱 마크
  [y1, y2].forEach(y => {
    g.appendChild(mkLine(dimX - 5, y, dimX + 5, y, { stroke: color, "stroke-width": "1.2" }));
  });

  // 치수선
  g.appendChild(mkLine(dimX, y1, dimX, y2, {
    stroke: color, "stroke-width": "1.6",
    "marker-start": `url(#${aS})`,
    "marker-end"  : `url(#${aE})`
  }));

  // 회전 레이블 (세로쓰기)
  const lx = dimX - 24;
  const te  = mkText(label, lx, mid, {
    "font-size": "12", fill: color, "font-weight": "bold",
    transform: `rotate(-90, ${lx}, ${mid})`
  });
  g.appendChild(te);
}

// ── 그리드 ───────────────────────────────────────────────────
function drawGrid(g, maxX, minY) {
  for (let y = BASE_Y; y >= minY - 10; y -= 50) {
    g.appendChild(mkLine(ML, y, maxX, y, {
      stroke: C.grid, "stroke-width": "0.7"
    }));
  }
}

// ── 경사면 채우기 ────────────────────────────────────────────
function drawFill(g, pts, X, Y) {
  let d = `M ${X(pts[0].x)} ${BASE_Y}`;
  pts.forEach(p => { d += ` L ${X(p.x)} ${Y(p.y)}`; });
  d += ` L ${X(pts[pts.length - 1].x)} ${BASE_Y} Z`;
  g.appendChild(el("path", { d, fill: C.fill, opacity: "0.45" }));
}

// ── 범례 ────────────────────────────────────────────────────
function drawLegend(g) {
  const items = [
    { c: C.relief, t: "완화구간 (양 끝)" },
    { c: C.mid,    t: "일반경사구간 (≤17%)" },
    { c: C.over,   t: "경사 기준 초과 (>17%)" },
    { c: C.remain, t: "나머지 구간 (자동 계산)" },
  ];
  const lx = VW - MR - 230;
  const ly = MT - 15;
  const bw = 228;
  const bh = items.length * 22 + 30;

  g.appendChild(el("rect", { x: lx - 8, y: ly, width: bw, height: bh, fill: "#fff", rx: "7", stroke: "#d0dce8", "stroke-width": "1.2", "filter": "drop-shadow(0 2px 4px rgba(0,0,0,0.07))" }));
  g.appendChild(mkText("범 례", lx + bw / 2 - 8, ly + 18, { "font-size": "12", "font-weight": "bold", fill: "#444" }));

  items.forEach(({ c, t }, i) => {
    const y = ly + 32 + i * 22;
    g.appendChild(mkLine(lx, y, lx + 32, y, { stroke: c, "stroke-width": "4", "stroke-linecap": "round" }));
    g.appendChild(mkText(t, lx + 42, y + 4, { "font-size": "11", fill: "#555", "text-anchor": "start" }));
  });
}

// ── 경사 삼각형 (비율 표기) ──────────────────────────────────
function drawSlopeTri(g, mx, my, slope, color, scX, scY) {
  // slope% = (높이/수평) * 100 → 1:(100/slope) 비율
  if (slope <= 0) return;
  const triW = Math.min(40, Math.abs(scX * 1000));   // 삼각형 밑변 (SVG px)
  const triH = triW * (slope / 100) * (scX / scY);   // 화면상 높이

  const pts = `${mx - triW / 2},${my + triH / 2} ${mx + triW / 2},${my + triH / 2} ${mx + triW / 2},${my - triH / 2}`;
  g.appendChild(el("polygon", { points: pts, fill: "none", stroke: color, "stroke-width": "1", "stroke-dasharray": "2,2", opacity: "0.5" }));
}

// ============================================================
//  메인 draw()
// ============================================================
function draw() {
  svg.innerHTML = "";
  addDefs();
  statusEl.textContent = "";

  const mode = document.querySelector('input[name="mode"]:checked').value;
  const H    = v("H");
  let Lf = v("Lf"), hf = 0, Sf = 0;
  let Lb = v("Lb"), hb = 0, Sb = 0;
  let pts = [{ x: 0, y: 0 }]; // 시작점

  // ─── MODE 1: 최소 길이 검토 ───────────────────────────────
  if (mode === "mode1") {
    Sf = v("Sf");
    Sb = v("Sb");
    const Sm = v("Sm");

    hf = Lf * (Sf / 100);
    hb = Lb * (Sb / 100);
    set("hf", hf.toFixed(0));
    set("hb", hb.toFixed(0));

    const hm = H - hf - hb;
    if (hm <= 0) {
      statusEl.textContent = "❌ 오류: 완화구간 높이 합이 층고를 초과합니다.";
      return;
    }
    const Lm = hm / (Sm / 100);
    const Lc = Lf + Lm + Lb;
    set("L", Lc.toFixed(0));

    pts.push({ x: Lf,       y: hf,      slope: Sf, type: "relief" });
    pts.push({ x: Lf + Lm,  y: hf + hm, slope: Sm, type: "mid"    });
    pts.push({ x: Lc,       y: H,        slope: Sb, type: "relief" });
  }
  // ─── MODE 2: 전체 길이 기준 설계 ─────────────────────────
  else {
    const L = v("L");
    if (!L) return;

    hf = v("hf");
    hb = v("hb");
    Sf = Lf > 0 ? (hf / Lf) * 100 : 0;
    Sb = Lb > 0 ? (hb / Lb) * 100 : 0;
    set("Sf", Sf.toFixed(2));
    set("Sb", Sb.toFixed(2));

    // 시점 완화구간
    pts.push({ x: Lf, y: hf, slope: Sf, type: "relief" });

    // 중간 구간들
    let cx = Lf, cy = hf;
    midSegments.forEach(seg => {
      const slope = seg.l > 0 ? (seg.h / seg.l) * 100 : 0;
      cx += seg.l;
      cy += seg.h;
      pts.push({ x: cx, y: cy, slope, type: "mid" });
    });

    // 나머지 구간
    let rL = L - (cx + Lb);
    let rH = H - (cy + hb);
    if (Math.abs(rL) < 1) rL = 0;
    if (Math.abs(rH) < 1) rH = 0;

    const rTxt = document.getElementById("remain-txt");

    if (rL < 0 || rH < 0) {
      rTxt.innerHTML = `<span style="color:${C.over}">❌ 초과 — 길이: ${rL.toFixed(0)}mm / 높이: ${rH.toFixed(0)}mm</span>`;
      statusEl.textContent = "❌ 설정 구간이 전체를 초과했습니다.";
    } else if (rL === 0 && rH === 0) {
      rTxt.innerHTML = `<span style="color:${C.relief}; font-weight:bold">✅ 설계 완료 (딱 맞음)</span>`;
    } else {
      const rs = rL > 0 ? (rH / rL) * 100 : 0;
      const rc = rs > 17 ? C.over : C.relief;
      rTxt.innerHTML = `길이: <b>${rL.toFixed(0)}</b>mm / 높이: <b>${rH.toFixed(0)}</b>mm / 구배: <b style="color:${rc}">${rs.toFixed(2)}%</b>`;
      cx += rL; cy += rH;
      pts.push({ x: cx, y: cy, slope: rs, type: "remain" });
    }

    // 종점 완화구간
    pts.push({ x: L, y: H, slope: Sb, type: "relief" });
  }

  // ─── 좌표 변환 ──────────────────────────────────────────
  const lastP = pts[pts.length - 1];
  if (!lastP.x || !lastP.y) return;

  // X/Y 독립 스케일 (어떤 비율도 화면에 맞게)
  const scX      = DRAW_W / lastP.x;
  const scY_fit  = MAX_DH  / lastP.y;
  const scY      = Math.min(scX, scY_fit);    // Y는 X 이하로만 (과장 방지)
  const exaggerated = scY < scX - 0.001;      // 수직 과장 여부

  const X = val => ML + val * scX;
  const Y = val => BASE_Y - val * scY;

  const topY   = Y(lastP.y);   // 경사로 최상단 SVG y
  const rightX = X(lastP.x);   // 경사로 우단 SVG x

  // ─── 배경 ───────────────────────────────────────────────
  svg.appendChild(el("rect", { x: 0, y: 0, width: VW, height: VH, fill: C.bg }));

  // ─── 그리드 ─────────────────────────────────────────────
  const gridG = el("g", {});
  drawGrid(gridG, rightX, topY);
  svg.appendChild(gridG);

  // ─── 바닥선 ─────────────────────────────────────────────
  svg.appendChild(mkLine(ML - 15, BASE_Y, rightX + 15, BASE_Y, {
    stroke: "#888", "stroke-width": "2"
  }));

  // ─── 수직 보조점선 ───────────────────────────────────────
  const dashG = el("g", {});
  pts.forEach(p => {
    if (p.x === 0) return;
    dashG.appendChild(mkLine(X(p.x), BASE_Y, X(p.x), Y(p.y), {
      stroke: "#c8d8e8", "stroke-width": "1", "stroke-dasharray": "5,4"
    }));
  });
  svg.appendChild(dashG);

  // ─── 경사면 채우기 ───────────────────────────────────────
  const fillG = el("g", {});
  drawFill(fillG, pts, X, Y);
  svg.appendChild(fillG);

  // ─── 경사선 + 구배 레이블 ───────────────────────────────
  const lineG = el("g", {});
  for (let i = 0; i < pts.length - 1; i++) {
    const p1    = pts[i];
    const p2    = pts[i + 1];
    const slope = p2.slope;
    const type  = p2.type;

    let color;
    if      (type === "relief")  color = C.relief;
    else if (slope > 17.01)      color = C.over;
    else if (type === "remain")  color = C.remain;
    else                         color = C.mid;

    // 경사선
    lineG.appendChild(mkLine(X(p1.x), Y(p1.y), X(p2.x), Y(p2.y), {
      stroke: color, "stroke-width": "5.5", "stroke-linecap": "round"
    }));

    // 구배 레이블 (선 중앙)
    const mx  = (X(p1.x) + X(p2.x)) / 2;
    const my  = (Y(p1.y) + Y(p2.y)) / 2 - 22;
    const tag = type === "relief"
      ? `${slope.toFixed(1)}% (완화)`
      : `${slope.toFixed(2)}%`;
    textBox(lineG, tag, mx, my, color, "#fff", 12);
  }
  svg.appendChild(lineG);

  // ─── 치수선 ─────────────────────────────────────────────
  const dimG = el("g", {});

  // 1단: 개별 구간 치수
  for (let i = 0; i < pts.length - 1; i++) {
    const p1    = pts[i];
    const p2    = pts[i + 1];
    const len   = p2.x - p1.x;
    const slope = p2.slope;
    const type  = p2.type;
    if (len < 1) continue;

    let color;
    if      (type === "relief")  color = C.relief;
    else if (slope > 17.01)      color = C.over;
    else if (type === "remain")  color = C.remain;
    else                         color = C.mid;

    // 개별 구간: 길이만 표기 (색상 구분)
    dimH(dimG, X(p1.x), X(p2.x), DIM_Y1, `${(len / 1000).toFixed(2)} m`, color);
  }

  // 2단: 전체 길이
  dimH(dimG, X(0), X(lastP.x), DIM_Y2, `전체 L = ${(lastP.x / 1000).toFixed(2)} m`, C.dim);

  // 수직 치수선 (전체 층고 H)
  dimV(dimG, ML - 65, BASE_Y, topY, `전체 H = ${(lastP.y / 1000).toFixed(2)} m`, C.dim);

  // 꺾임점 높이 레이블 (중간 점들)
  pts.forEach((p, i) => {
    if (i === 0 || i === pts.length - 1) return;
    dimG.appendChild(mkText(`h=${(p.y / 1000).toFixed(2)}m`, X(p.x), Y(p.y) - 14, {
      "font-size": "10.5", fill: "#7a8a9a", "text-anchor": "middle"
    }));
  });

  svg.appendChild(dimG);

  // ─── 시작·끝 마커 ───────────────────────────────────────
  const mkrG = el("g", {});
  const markers = [
    { p: pts[0],   c: C.relief, label: "START",  dy: 18 },
    { p: lastP,    c: C.over,   label: "END",     dy: -15 },
  ];
  markers.forEach(({ p, c, label, dy }) => {
    mkrG.appendChild(el("circle", {
      cx: X(p.x), cy: Y(p.y), r: "7",
      fill: c, stroke: "#fff", "stroke-width": "2.5"
    }));
    mkrG.appendChild(mkText(label, X(p.x), Y(p.y) + dy, {
      "font-size": "11", fill: c, "font-weight": "bold"
    }));
  });
  svg.appendChild(mkrG);

  // ─── 범례 ───────────────────────────────────────────────
  const legG = el("g", {});
  drawLegend(legG);
  svg.appendChild(legG);

  // ─── 타이틀 ─────────────────────────────────────────────
  svg.appendChild(mkText("주차장 경사로 단면 검토", VW / 2, MT - 22, {
    "font-size": "17", "font-weight": "bold", fill: "#2c3e50"
  }));

  // ─── 스케일 과장 안내 ────────────────────────────────────
  if (exaggerated) {
    svg.appendChild(mkText("※ 수직 방향 과장 표현 (V-scale ≠ H-scale)", ML, VH - 12, {
      "font-size": "10.5", fill: "#a0aab4", "text-anchor": "start"
    }));
  }
}

// ── 초기화 ──────────────────────────────────────────────────
toggleMode();
