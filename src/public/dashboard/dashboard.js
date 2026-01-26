requireAuth();

let trendMode = "line"; // "line" | "bar"

document.addEventListener("DOMContentLoaded", () => {
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

  const totalCustomers =
    toNum(data.totalCustomers) ??
    // fallback from riskCounts sum
    sumCounts(data.riskCounts) ??
    // fallback from topAtRisk length (not ideal)
    (Array.isArray(data.topAtRisk) ? data.topAtRisk.length : 0);

  const atRiskCount =
    toNum(data.atRiskCustomers) ??
    toNum(data.riskCounts?.["At-Risk"]) ??
    toNum(data.riskCounts?.["At Risk"]) ??
    0;

  const highFatigue =
    toNum(data.highFatigueCustomers) ??
    toNum(data.fatigueCounts?.["High"]) ??
    toNum(data.fatigueCounts?.["HIGH"]) ??
    0;

  const overdueCount =
    toNum(data.overdueCount) ??
    (Array.isArray(data.overdue) ? data.overdue.length : 0);


  setText("kpiTotalCustomers", totalCustomers);
  setText("kpiAtRisk", atRiskCount);
  setText("kpiOverdue", overdueCount);
  setText("kpiHighFatigue", highFatigue);

  const pct = totalCustomers ? Math.round((atRiskCount / totalCustomers) * 100) : 0;
  if (document.getElementById("kpiAtRiskMeta")) {
    setText("kpiAtRiskMeta", `${pct}% of total`);
  }

  renderDistribution("riskDist", data.riskCounts, colorForRiskLabel);

  renderDistribution("fatigueDist", data.fatigueCounts, colorForFatigueLabel);

  renderTopAtRisk(data.topAtRisk || []);

  renderTopDrivers(data.topDrivers || []);

  renderOverdue(data.overdue || []);

  renderActionStatus(data.actionStatusCounts);

  renderEffectiveness(data.effectiveness || []);

  renderTeamWorkload(data.teamWorkload || []);

  // ------------------------------
  // Attention today (optional)
  // data.attentionToday can be [] or {count} etc.
  // ------------------------------
  renderAttentionToday(data.attentionToday || [], totalCustomers, atRiskCount);


  await loadTrendOnly();
}

async function loadTrendOnly() {
  const canvas = document.getElementById("trendChart");
  if (!canvas) return;

  const trend = await apiFetch("/dashboard/health-trend?days=14");

  if (trendMode === "bar") drawBarTrend(canvas, trend);
  else drawLineTrend(canvas, trend);
}

function renderDistribution(containerId, countsObj, colorFn) {
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

    // Works for BOTH layouts:
    // - your old distRow styles, OR
    // - the new screenshot-style progressRow styles
    const row = document.createElement("div");
    row.className = el.classList.contains("dist") ? "distRow" : "progressRow";

    // If you are using old "distRow" layout
    if (row.className === "distRow") {
      row.innerHTML = `
        <div class="distLabel">${escapeHtml(label)}</div>
        <div class="distBar"><div class="distFill" style="width:${pct}%; background:${colorFn(label)}"></div></div>
        <div class="distValue">${value}</div>
      `;
    } else {
      // New "progressRow" layout
      row.innerHTML = `
        <div>${escapeHtml(label)}</div>
        <div class="progressTrack">
          <div class="progressFill" style="width:${pct}%; background:${colorFn(label)}"></div>
        </div>
        <div style="text-align:right">${value}</div>
      `;
    }

    el.appendChild(row);
  }
}

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

function renderTopDrivers(topDrivers) {
  // If you kept the old table:
  const tbody = document.getElementById("driversTbody");
  if (tbody) {
    tbody.innerHTML = "";
    for (const d of topDrivers || []) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${escapeHtml(d.driver)}</td><td>${Number(d.count || 0)}</td>`;
      tbody.appendChild(tr);
    }
  }

  // If you switched to screenshot-style list:
  const list = document.getElementById("driversList");
  if (list) {
    const items = topDrivers || [];
    if (!items.length) list.innerHTML = `<div class="muted">No drivers.</div>`;
    else {
      list.innerHTML = "";
      for (const d of items.slice(0, 6)) {
        const div = document.createElement("div");
        div.className = "simpleItem";
        div.innerHTML = `
          <div>${escapeHtml(d.driver)}</div>
          <div><b>${Number(d.count || 0)}</b></div>
        `;
        list.appendChild(div);
      }
    }
  }
}

function renderOverdue(overdue) {
  const overdueTbody = document.getElementById("overdueTbody");
  if (!overdueTbody) return;

  overdueTbody.innerHTML = "";
  for (const a of overdue || []) {
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

function renderActionStatus(counts) {
  const statusEl = document.getElementById("actionStatusList");
  if (!statusEl) return;

  const rows = [
    { label: "To Do", key: "TODO" },
    { label: "In Progress", key: "IN_PROGRESS" },
    { label: "Overdue", key: "OVERDUE" },
  ];

  statusEl.innerHTML = "";
  rows.forEach((r) => {
    const v = Number(counts?.[r.key] ?? 0);

    const div = document.createElement("div");
    div.className = "statusRow";
    div.innerHTML = `
      <div class="statusLeft">
        <span class="dot"></span>
        ${r.label}
      </div>
      <div><b>${v}</b></div>
    `;

    statusEl.appendChild(div);
  });
}

function renderEffectiveness(items) {
  const effEl = document.getElementById("effectivenessList");
  if (!effEl) return;

  if (!items || items.length === 0) {
    effEl.innerHTML = `<div class="muted">No effectiveness data yet.</div>`;
    return;
  }

  effEl.innerHTML = "";
  for (const it of items.slice(0, 4)) {
    const completed = Number(it.completed ?? 0);
    const improved = Number(it.improved ?? 0);
    const pct = completed ? Math.round((improved / completed) * 100) : 0;

    const div = document.createElement("div");
    div.className = "effectRow";
    div.innerHTML = `
      <div class="effectTop">
        <div>${escapeHtml(it.type || "-")}</div>
        <div class="effectPct">${pct}% success</div>
      </div>
      <div class="effectMeta">${completed} completed • ${improved} improved</div>
    `;
    effEl.appendChild(div);
  }
}

function renderTeamWorkload(rows) {
  const tbody = document.getElementById("workloadTbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  for (const r of rows || []) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.owner || "-")}</td>
      <td>${Number(r.customers || 0)}</td>
      <td>${Number(r.atRisk || 0)}</td>
      <td>${Number(r.activeActions || 0)}</td>
      <td>${Number(r.overdue || 0)}</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderAttentionToday(attentionToday, totalCustomers, atRiskCount) {
  const textEl = document.getElementById("attentionTodayText");
  const listEl = document.getElementById("attentionTodayList");
  if (!textEl || !listEl) return;

  // normalize into a list
  const list = Array.isArray(attentionToday)
    ? attentionToday
    : (attentionToday && Array.isArray(attentionToday.items) ? attentionToday.items : []);

  // message
  if (!list.length) {
    if ((atRiskCount || 0) === 0) textEl.textContent = "All customers are in good health!";
    else textEl.textContent = "No urgent customers right now.";
    listEl.innerHTML = "";
    return;
  }

  textEl.textContent = `${list.length} customer(s) need attention today.`;

  // list
  listEl.innerHTML = "";
  for (const c of list) {
    const div = document.createElement("div");
    div.className = "simpleItem";
    div.innerHTML = `
      <div style="min-width:0;">
        <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${escapeHtml(c.name || "-")}
        </div>
        <div class="muted" style="font-size:12px;">
          ${escapeHtml(c.segment || "-")}
          • Health ${Number(c.healthScore ?? 0)}
          • ${escapeHtml(c.riskLabel || "-")}
          • ${escapeHtml(c.fatigueRisk || "-")} fatigue
        </div>
      </div>

      <button class="btn" data-view style="height:34px; flex:0 0 auto;">View</button>
    `;

    div.querySelector("[data-view]").onclick = () => {
      window.location.href = `/customerDetail/customerDetail.html?id=${c.id}`;
    };

    listEl.appendChild(div);
  }
}


function setupCanvas(canvas, cssHeight = 260) {
  const dpr = window.devicePixelRatio || 1;

  const cssW = canvas.parentElement?.clientWidth
    ? Math.max(320, canvas.parentElement.clientWidth)
    : (canvas.clientWidth || 640);

  canvas.style.width = "100%";
  canvas.style.height = cssHeight + "px";

  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssHeight * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { ctx, w: cssW, h: cssHeight };
}

function drawLineTrend(canvas, points) {
  const { ctx, w, h } = setupCanvas(canvas, 260);
  ctx.clearRect(0, 0, w, h);

  const padding = 28;
  const vals = (points || []).map((p) => Number(p.avgHealthScore ?? 0));
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
  const vals = (points || []).map((p) => Number(p.avgHealthScore ?? 0));
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
        const dx = mx - b.x;
        const dy = my - b.y;
        if (dx * dx + dy * dy <= b.r * b.r) {
          hit = b;
          break;
        }
      }
    }

    if (!hit) return hide();

    tip.textContent = labelFn(hit);
    tip.style.left = e.clientX + 12 + "px";
    tip.style.top = e.clientY + 12 + "px";
    tip.style.display = "block";
  };

  canvas.onmouseleave = hide;
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

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value ?? "-";
}

function toNum(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sumCounts(obj) {
  if (!obj || typeof obj !== "object") return null;
  return Object.values(obj).reduce((acc, v) => acc + (Number(v) || 0), 0);
}

function colorForRiskLabel(label) {
  const v = String(label || "").toLowerCase();
  if (v.includes("healthy")) return "rgba(34,197,94,.85)";
  if (v.includes("watch")) return "rgba(245,158,11,.85)";
  if (v.includes("risk")) return "rgba(239,68,68,.85)";
  return "rgba(15,118,110,.75)";
}

function colorForFatigueLabel(label) {
  const v = String(label || "").toLowerCase();
  if (v.includes("low")) return "rgba(34,197,94,.85)";
  if (v.includes("med")) return "rgba(245,158,11,.85)";
  if (v.includes("high")) return "rgba(239,68,68,.85)";
  return "rgba(15,118,110,.75)";
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
