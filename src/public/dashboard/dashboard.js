// dashboard.js (FULL UPDATED VERSION)
// - Keeps your current summary rendering
// - Adds Health Trend API: GET /dashboard/health-trend?days=14
// - Adds Line/Bar toggle (optional buttons if present)
// - Adds hover tooltip values on the chart
// - Auto-resizes canvas for crisp rendering

requireAuth();

let trendMode = "line"; // "line" | "bar"

document.addEventListener("DOMContentLoaded", () => {
  // optional: if you added the two buttons in HTML
  document.getElementById("trendLineBtn")?.addEventListener("click", () => {
    trendMode = "line";
    setTrendButtons();
    loadTrendOnly();
  });

  document.getElementById("trendBarBtn")?.addEventListener("click", () => {
    trendMode = "bar";
    setTrendButtons();
    loadTrendOnly();
  });

  setTrendButtons();
  loadDashboard();
});

function setTrendButtons() {
  const lineBtn = document.getElementById("trendLineBtn");
  const barBtn = document.getElementById("trendBarBtn");
  if (!lineBtn || !barBtn) return;

  lineBtn.classList.toggle("active", trendMode === "line");
  barBtn.classList.toggle("active", trendMode === "bar");
}

async function loadDashboard() {
  const data = await apiFetch("/dashboard/summary");

  function renderDistribution(containerId, countsObj) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const entries = Object.entries(countsObj || {});
    if (entries.length === 0) {
      el.innerHTML = `<div class="muted">No data.</div>`;
      return;
    }

    const maxV = Math.max(...entries.map(([, v]) => Number(v) || 0), 1);

    el.innerHTML = "";
    for (const [label, raw] of entries) {
      const value = Number(raw) || 0;
      const pct = Math.round((value / maxV) * 100);

      const row = document.createElement("div");
      row.className = "distRow";
      row.innerHTML = `
        <div class="distLabel">${escapeHtml(label)}</div>
        <div class="distBar"><div class="distFill" style="width:${pct}%"></div></div>
        <div class="distValue">${value}</div>
      `;
      el.appendChild(row);
    }
  }

  renderDistribution("riskDist", data.riskCounts);
  renderDistribution("fatigueDist", data.fatigueCounts);

  function renderTopAtRisk(list) {
    const el = document.getElementById("topAtRiskList");
    if (!el) return;

    if (!list || list.length === 0) {
      el.innerHTML = `<div class="muted">No At-Risk customers 🎉</div>`;
      return;
    }

    el.innerHTML = "";
    for (const c of list) {
      const div = document.createElement("div");
      div.className = "rankItem";
      div.innerHTML = `
        <div class="rankLeft">
          <div class="rankName">${escapeHtml(c.name || "-")}</div>
          <div class="rankMeta">${escapeHtml(c.segment || "-")} • ${escapeHtml(c.owner?.name || "Unassigned")}</div>
        </div>

        <div class="rankRight">
          <div class="scorePill">${Number(c.healthScore ?? 0)}</div>
          <button class="rowbtn" data-id="${c.id}">View</button>
        </div>
      `;

      div.querySelector("button").onclick = () => {
        window.location.href = `/customerDetail/customerDetail.html?id=${c.id}`;
      };

      el.appendChild(div);
    }
  }

  renderTopAtRisk(data.topAtRisk || []);

  // Top drivers
  const driversTbody = document.getElementById("driversTbody");
  if (driversTbody) {
    driversTbody.innerHTML = "";
    for (const d of data.topDrivers || []) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${escapeHtml(d.driver)}</td><td>${Number(d.count || 0)}</td>`;
      driversTbody.appendChild(tr);
    }
  }

  // Overdue
  const overdueTbody = document.getElementById("overdueTbody");
  if (overdueTbody) {
    overdueTbody.innerHTML = "";
    for (const a of data.overdue || []) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(a.customer?.name ?? "-")}</td>
        <td>${escapeHtml(a.owner?.name ?? "-")}</td>
        <td>${escapeHtml(a.type ?? "-")}</td>
        <td>${a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "-"}</td>
        <td>${escapeHtml(a.status ?? "-")}</td>
      `;
      overdueTbody.appendChild(tr);
    }
  }

  // ✅ NEW: load health trend chart (line/bar) from endpoint
  await loadTrendOnly();
}

async function loadTrendOnly() {
  const canvas = document.getElementById("trendChart");
  if (!canvas) return;

  // If your backend is not ready yet, you can temporarily fallback:
  // const trend = [];
  const trend = await apiFetch("/dashboard/health-trend?days=14");

  if (trendMode === "bar") {
    drawBarTrend(canvas, trend);
  } else {
    drawLineTrend(canvas, trend);
  }
}

/* ------------------------------
   Chart helpers + hover tooltip
-------------------------------- */

function setupCanvas(canvas, cssHeight = 260) {
  const dpr = window.devicePixelRatio || 1;

  // Use container width so it fills the card nicely
  const cssW = canvas.parentElement?.clientWidth
    ? Math.max(320, canvas.parentElement.clientWidth)
    : (canvas.clientWidth || 640);

  canvas.style.width = "100%";
  canvas.style.height = cssHeight + "px";

  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssHeight * dpr);

  const ctx = canvas.getContext("2d");
  // Reset transform then scale for DPR
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { ctx, w: cssW, h: cssHeight };
}

function drawLineTrend(canvas, points) {
  const { ctx, w, h } = setupCanvas(canvas, 260);
  ctx.clearRect(0, 0, w, h);

  const padding = 28;
  const vals = (points || []).map(p => Number(p.avgHealthScore ?? 0));
  if (!vals.length) {
    ctx.fillStyle = "#64748b";
    ctx.font = "14px system-ui";
    ctx.fillText("No trend data yet.", 20, 30);
    detachTooltip(canvas);
    return;
  }

  const maxV = Math.max(...vals, 1);
  const minV = Math.min(...vals, 0);
  const span = Math.max(1, maxV - minV);

  const stepX = (w - padding * 2) / Math.max(1, vals.length - 1);

  // baseline
  ctx.strokeStyle = "#e6ecea";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, h - padding);
  ctx.lineTo(w - padding, h - padding);
  ctx.stroke();

  // line
  ctx.strokeStyle = "#0f766e";
  ctx.lineWidth = 2;
  ctx.beginPath();

  const dots = [];
  for (let i = 0; i < vals.length; i++) {
    const x = padding + i * stepX;
    const y = (h - padding) - ((vals[i] - minV) / span) * (h - padding * 2);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

    dots.push({
      kind: "dot",
      x,
      y,
      r: 10,
      value: vals[i],
      date: points[i]?.date || `Day ${i + 1}`,
    });
  }
  ctx.stroke();

  // dots
  ctx.fillStyle = "#0f766e";
  for (const d of dots) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  attachTooltip(canvas, dots, (d) => `${d.date}: ${d.value}`);
}

function drawBarTrend(canvas, points) {
  const { ctx, w, h } = setupCanvas(canvas, 260);
  ctx.clearRect(0, 0, w, h);

  const padding = 28;
  const vals = (points || []).map(p => Number(p.avgHealthScore ?? 0));
  if (!vals.length) {
    ctx.fillStyle = "#64748b";
    ctx.font = "14px system-ui";
    ctx.fillText("No trend data yet.", 20, 30);
    detachTooltip(canvas);
    return;
  }

  const maxV = Math.max(...vals, 1);
  const barW = (w - padding * 2) / vals.length;

  // baseline
  ctx.strokeStyle = "#e6ecea";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, h - padding);
  ctx.lineTo(w - padding, h - padding);
  ctx.stroke();

  const bars = [];
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    const bh = (v / maxV) * (h - padding * 2);

    const x = padding + i * barW + barW * 0.18;
    const y = (h - padding) - bh;
    const bw = barW * 0.64;

    ctx.fillStyle = "#0f766e";
    ctx.fillRect(x, y, bw, bh);

    bars.push({
      kind: "bar",
      x,
      y,
      w: bw,
      h: bh,
      value: v,
      date: points[i]?.date || `Day ${i + 1}`,
    });
  }

  attachTooltip(canvas, bars, (b) => `${b.date}: ${b.value}`);
}

function attachTooltip(canvas, hitboxes, labelFn) {
  // Creates a single tooltip div if it doesn't exist
  let tip = document.getElementById("chartTooltip");
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "chartTooltip";
    tip.style.position = "fixed";
    tip.style.zIndex = "99999";
    tip.style.display = "none";
    tip.style.padding = "8px 10px";
    tip.style.borderRadius = "10px";
    tip.style.border = "1px solid rgba(230,236,234,.9)";
    tip.style.background = "rgba(255,255,255,.95)";
    tip.style.boxShadow = "0 10px 30px rgba(15, 23, 42, .12)";
    tip.style.font = "12px system-ui";
    tip.style.color = "#0f172a";
    tip.style.pointerEvents = "none";
    document.body.appendChild(tip);
  }

  function hide() {
    tip.style.display = "none";
  }

  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let hit = null;

    for (const b of hitboxes) {
      if (b.kind === "bar") {
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
          hit = b;
          break;
        }
      } else {
        // dot
        const dx = mx - b.x;
        const dy = my - b.y;
        if (dx * dx + dy * dy <= (b.r * b.r)) {
          hit = b;
          break;
        }
      }
    }

    if (!hit) return hide();

    tip.textContent = labelFn(hit);

    // position tooltip near mouse (fixed so it won't be clipped)
    tip.style.left = (e.clientX + 12) + "px";
    tip.style.top = (e.clientY + 12) + "px";
    tip.style.display = "block";
  };

  canvas.onmouseleave = hide;

  // store so we can detach later
  canvas.__hasTooltip = true;
}

function detachTooltip(canvas) {
  if (!canvas) return;
  if (canvas.__hasTooltip) {
    canvas.onmousemove = null;
    canvas.onmouseleave = null;
    canvas.__hasTooltip = false;
  }
}

/* ------------------------------
   Small helpers
-------------------------------- */

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
