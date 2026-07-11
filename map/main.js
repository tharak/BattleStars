import { makeHexGrid } from "./hexgrid.js";
import { UNIVERSE, SYSTEMS, celestialBodyLevel } from "./levels.js";
import { hexDist } from "../battle/hexmath.js";

const canvas = document.getElementById("cv");
const breadcrumb = document.getElementById("breadcrumb");
const zoomOutBtn = document.getElementById("zoomOut");
const hint = document.getElementById("hint");

// Navigation stack: [{level:"universe"}, {level:"system",systemId}, {level:"body",systemId,bodyId}]
let path = [{ level: "universe", label: "Universe" }];

function levelData(entry) {
  if (entry.level === "universe") return UNIVERSE;
  if (entry.level === "system") return SYSTEMS[entry.systemId];
  return celestialBodyLevel(entry.systemId, entry.bodyId);
}

const FILL = {
  system: "#3a2f6a", star: "#5a4a1a", planet: "#1a3a5c", belt: "#2a2a2a",
  "body-center": "#5a4a1a", "battle-link": "#5c1a2a", moon: "#2e3644",
};
const STROKE = {
  system: "#a78bfa", star: "#ffd166", planet: "#4a9eff", belt: "#666",
  "body-center": "#ffd166", "battle-link": "#ff5a5a", moon: "#9fb3c8",
};

// Pixel position of a hex, relative to nothing but its own (c,r) -- same
// formula as hexgrid.js's hexCenter with ox=oy=0, so subtracting two of
// these gives a correct offset between two positions (parity and all)
// without needing a whole separate grid.
const localPx = (pos, hs) => [(pos[0] + 0.5 * (pos[1] & 1)) * hs * Math.sqrt(3), pos[1] * hs * 1.5];

// How far a board's own content reaches from its center, in pixels at a
// given hex size -- used both to measure Sol's tile (at the Universe
// board's real hs) and the target system's full layout (at hs=1, then
// solved for the hs that makes it fit).
function footprintPx(board, hs) {
  const [ccx, ccy] = localPx(board.center, hs);
  let max = 0;
  for (const cell of board.cells) {
    const [x, y] = localPx(cell.pos, hs);
    max = Math.max(max, Math.hypot(x - ccx, y - ccy) + (cell.size || 0) * hs * 1.5);
  }
  return max;
}

// The board one zoom level down from this cell, if it has one -- a system
// (Sol's planets), a body (a planet's moons), or null for cells that don't
// lead anywhere further down this chain (a moon, the Enter Battle link).
function subBoardFor(enter) {
  if (enter?.level === "system") return SYSTEMS[enter.systemId];
  if (enter?.level === "body") return celestialBodyLevel(enter.systemId, enter.bodyId);
  return null;
}

// A live miniature of what's really inside a cell -- Sol's Sun/planets, or
// a planet's moons -- drawn as small dots at their real relative positions
// and sizes, scaled to fit inside this cell's own tile. A preview of real
// content, not a decorative pattern.
function drawSubBoardPreview(grid, cell, subBoard) {
  const [tx, ty] = grid.hexCenter(cell.pos[0], cell.pos[1]);
  const tileRadiusPx = (cell.size || 0) * grid.hs * 1.5 + grid.hs;
  const miniHs = tileRadiusPx / (footprintPx(subBoard, 1) * 1.15);
  const [ccx, ccy] = localPx(subBoard.center, miniHs);
  for (const sc of subBoard.cells) {
    const [x, y] = localPx(sc.pos, miniHs);
    grid.ctx.beginPath();
    grid.ctx.arc(tx + (x - ccx), ty + (y - ccy), Math.max(1.5, miniHs * (0.6 + (sc.size || 0) * 0.5)), 0, 7);
    grid.ctx.fillStyle = STROKE[sc.kind] || "#d7deef";
    grid.ctx.fill();
  }
}

function render() {
  const entry = path[path.length - 1];
  const data = levelData(entry);
  // data.radius counts rings including the center (see map/levels.js), one
  // more than the hexDist value the mask actually needs.
  const inBounds = data.center && data.radius != null
    ? (c, r) => hexDist(data.center, [c, r]) <= data.radius - 1
    : undefined;
  const grid = makeHexGrid(canvas, { cols: data.cols, rows: data.rows, hs: data.hs, ...(inBounds && { inBounds }) });
  // A cell can be a multi-hex blob (cell.size = hexDist radius, not just a
  // single hex), so "what's at (c,r)" is a distance test against every
  // cell rather than an exact-position lookup. Blobs are placed (see
  // radialBoard in levels.js) so they never overlap, so at most one matches.
  const cellAt = (c, r) => data.cells.find(cell => hexDist(cell.pos, [c, r]) <= (cell.size || 0));

  grid.ctx.fillStyle = "#0b0e14";
  grid.ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Two passes: every hex fill/stroke first, then labels on top -- otherwise
  // a later row's opaque hex fill paints over an earlier row's label text.
  for (let r = 0; r < data.rows; r++) for (let c = 0; c < data.cols; c++) {
    if (!grid.inBounds(c, r)) continue;
    const [x, y] = grid.hexCenter(c, r);
    const cell = cellAt(c, r);
    grid.hexPath(x, y, grid.hs - 1.5);
    grid.ctx.fillStyle = cell ? FILL[cell.kind] || "#1a2133" : "#131826";
    grid.ctx.fill();
    grid.ctx.strokeStyle = cell ? STROKE[cell.kind] || "#2a3350" : "#2a3350";
    grid.ctx.lineWidth = cell ? 2 : 1;
    grid.ctx.stroke();
  }
  for (const cell of data.cells) {
    const subBoard = subBoardFor(cell.enter);
    if (subBoard) drawSubBoardPreview(grid, cell, subBoard);
    const [x, y] = grid.hexCenter(cell.pos[0], cell.pos[1]);
    grid.ctx.fillStyle = "#d7deef";
    grid.ctx.font = "bold 11px system-ui";
    grid.ctx.textAlign = "center";
    // A cell with a preview has its center busy with the mini graphic --
    // put its label below instead of overlapping it.
    grid.ctx.fillText(cell.label, x, subBoard ? y + (cell.size || 0) * grid.hs * 1.5 + grid.hs + 13 : y + 4);
  }

  canvas.onclick = ev => {
    const rect = canvas.getBoundingClientRect();
    const h = grid.pixelToHex(ev.clientX - rect.left, ev.clientY - rect.top);
    if (!h) return;
    const cell = cellAt(h[0], h[1]);
    if (!cell) { setHint("Empty space — nothing here."); return; }
    if (cell.href) { window.location.href = cell.href; return; }
    if (cell.enter) { zoomIn(cell.enter, cell.label); return; }
    setHint(cell.kind === "belt" ? "Asteroid Belt — no bodies to explore." : `${cell.label} — nothing to zoom into yet.`);
  };

  renderBreadcrumb();
}

function zoomIn(enter, label) {
  path.push({ ...enter, label });
  setHint("");
  render();
}
function zoomTo(index) {
  path = path.slice(0, index + 1);
  setHint("");
  render();
}
function zoomOut() {
  if (path.length > 1) zoomTo(path.length - 2);
}
function setHint(text) { hint.textContent = text; }

function renderBreadcrumb() {
  breadcrumb.innerHTML = "";
  path.forEach((entry, i) => {
    if (i > 0) breadcrumb.appendChild(document.createTextNode(" / "));
    const btn = document.createElement(i === path.length - 1 ? "span" : "a");
    btn.textContent = entry.label;
    if (i !== path.length - 1) {
      btn.href = "#";
      btn.onclick = ev => { ev.preventDefault(); zoomTo(i); };
    }
    breadcrumb.appendChild(btn);
  });
  zoomOutBtn.disabled = path.length <= 1;
}

zoomOutBtn.onclick = zoomOut;
document.addEventListener("keydown", ev => { if (ev.key === "Escape") zoomOut(); });

render();
