requireAuth();

const $ = (id) => document.getElementById(id);

$("logoutBtn").onclick = logout;
$("backBtn").onclick = () => history.back();

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

// nav buttons
$("addEventBtn").onclick = () => {
  window.location.href = `/addEvent/addEvent.html?customerId=${id}`;
};
$("addActionBtn").onclick = () => {
  window.location.href = `/addAction/addAction.html?customerId=${id}`;
};

// ---------- utilities ----------
function fmtDateTime(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString();
}
function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString();
}

// ---------- Trend chart + momentum ----------
function drawLineChart(canvas, points) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  if (!points || points.length < 2) return;

  const padding = 24;
  const xs = points.map((_, i) => padding + (i * (w - padding * 2)) / (points.length - 1));
  const ysRaw = points.map(p => p.score);

  const minY = Math.min(...ysRaw, 0);
  const maxY = Math.max(...ysRaw, 100);
  const yScale = (val) => {
    const t = (val - minY) / (maxY - minY || 1);
    return h - padding - t * (h - padding * 2);
  };

  ctx.lineWidth = 1;
  ctx.strokeStyle = "#e5e7eb";
  ctx.beginPath();
  ctx.moveTo(padding, h - padding);
  ctx.lineTo(w - padding, h - padding);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#111827";
  ctx.beginPath();
  ctx.moveTo(xs[0], yScale(ysRaw[0]));
  for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], yScale(ysRaw[i]));
  ctx.stroke();

  for (let i = 0; i < xs.length; i++) {
    ctx.fillStyle = (i === xs.length - 1) ? "#111827" : "#9ca3af";
    ctx.beginPath();
    ctx.arc(xs[i], yScale(ysRaw[i]), (i === xs.length - 1) ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderMomentum(direction, delta) {
  const el = $("momentumBadge");
  if (!el) return;

  let arrow = "➡️";
  let cls = "momentum-flat";
  if (direction === "Improving") { arrow = "📈"; cls = "momentum-up"; }
  if (direction === "Declining") { arrow = "📉"; cls = "momentum-down"; }

  const sign = delta > 0 ? "+" : "";
  el.className = cls;
  el.textContent = `${arrow} ${direction} (${sign}${delta} vs 7d ago)`;
}

// ---------- Done modal ----------
let selectedAction = null;

function openDoneModal(action) {
  selectedAction = action;
  $("doneActionTitle").textContent = `Action: ${action.type} • Due: ${fmtDate(action.dueDate)}`;
  $("doneOutcome").value = "";
  $("doneNextStep").value = "";
  $("doneModal").style.display = "flex";
}

function closeDoneModal() {
  selectedAction = null;
  $("doneModal").style.display = "none";
}

$("closeDoneModal").onclick = closeDoneModal;
$("cancelDoneBtn").onclick = closeDoneModal;
$("doneModal").addEventListener("click", (e) => {
  if (e.target.id === "doneModal") closeDoneModal();
});

$("confirmDoneBtn").onclick = async () => {
  if (!selectedAction) return;

  const outcome = $("doneOutcome").value;
  const nextStep = $("doneNextStep").value;

  if (!outcome) return alert("Please select an outcome.");

  await apiFetch(`/actions/${selectedAction.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "DONE", outcome, nextStep: nextStep || null })
  });

  closeDoneModal();
  await loadDetail();
};

// ---------- Action Details modal ----------
let selectedActionId = null;
let selectedActionObj = null;

function openActionModal(actionId) {
  selectedActionId = actionId;
  $("actionModal").style.display = "flex";
  loadActionDetail(actionId);
}

function closeActionModal() {
  selectedActionId = null;
  selectedActionObj = null;
  $("actionModal").style.display = "none";
}

$("closeActionModal").onclick = closeActionModal;
$("modalCloseBtn").onclick = closeActionModal;
$("actionModal").addEventListener("click", (e) => {
  if (e.target.id === "actionModal") closeActionModal();
});

async function loadActionDetail(actionId) {
  const action = await apiFetch(`/actions/${actionId}`);
  selectedActionObj = action;

  $("actionMeta").textContent =
    `${action.type} • ${action.status} • Due ${fmtDate(action.dueDate)} • Priority ${action.priority}`;

  $("actionInitialNotes").textContent = action.notes || "-";

  const list = $("actionNotesList");
  list.innerHTML = "";

  const notes = action.notesLog || [];
  if (notes.length === 0) {
    list.innerHTML = `<div class="muted">No progress updates yet.</div>`;
  } else {
    for (const n of notes) {
      const div = document.createElement("div");
      div.className = "noteItem";
      div.innerHTML = `
        <div class="noteMeta">${fmtDateTime(n.createdAt)} • ${n.author?.name || "Unknown"}</div>
        <div>${n.note}</div>
      `;
      list.appendChild(div);
    }
  }

  $("newActionNote").value = "";
}

$("saveActionNoteBtn").onclick = async () => {
  if (!selectedActionId) return;

  const note = $("newActionNote").value.trim();
  if (!note) return alert("Please enter a note.");

  await apiFetch(`/actions/${selectedActionId}/notes`, {
    method: "POST",
    body: JSON.stringify({ note })
  });

  await loadActionDetail(selectedActionId);
  await loadDetail();
};

$("modalMarkDoneBtn").onclick = () => {
  if (!selectedActionObj) return;
  closeActionModal();
  openDoneModal(selectedActionObj);
};

// ---------- renderers ----------
function renderBanner(data) {
  const banner = $("fatigueBanner");
  if (data.fatigueRisk === "High") {
    banner.style.display = "block";
    banner.textContent = `High fatigue risk (${data.touches7d}/7d). Consider cooldown or resolve issues before more outreach.`;
  } else {
    banner.style.display = "none";
  }
}

function renderSummary(data) {
  $("title").textContent = data.name;

  $("summaryGrid").innerHTML = `
    <div class="kpi"><div class="label">Health Score</div><div class="value">${data.healthScore}</div></div>
    <div class="kpi"><div class="label">Risk Label</div><div class="value">${data.riskLabel}</div></div>
    <div class="kpi"><div class="label">Fatigue Risk</div><div class="value">${data.fatigueRisk} (${data.touches7d}/7d)</div></div>
    <div class="kpi"><div class="label">Last Activity</div><div class="value">${data.lastActivityDate ? fmtDate(data.lastActivityDate) : "-"}</div></div>
  `;
}

function renderDrivers(data) {
  const ul = $("driversList");
  ul.innerHTML = "";

  if (!data.drivers || data.drivers.length === 0) {
    ul.innerHTML = `<li class="muted">No major risk drivers detected.</li>`;
    return;
  }

  data.drivers.forEach(d => {
    const li = document.createElement("li");
    li.textContent = d;
    ul.appendChild(li);
  });
}

function renderEvents(data) {
  const tbody = $("eventsTbody");
  const empty = $("eventsEmpty");
  tbody.innerHTML = "";

  if (!data.events || data.events.length === 0) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  data.events.forEach(e => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${fmtDateTime(e.occurredAt)}</td>
      <td>${e.type}</td>
      <td>${e.notes || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderActions(data) {
  const tbody = $("actionsTbody");
  const empty = $("actionsEmpty");
  tbody.innerHTML = "";

  if (!data.actions || data.actions.length === 0) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  data.actions.forEach(a => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${fmtDate(a.dueDate)}</td>
      <td>${a.type}</td>
      <td>${a.status}</td>
      <td>${a.priority}</td>
      <td>${a.outcome || "-"}</td>
      <td>
        <button class="btn viewBtn">View</button>
        ${a.status !== "DONE" ? `<button class="btn doneBtn">Mark Done</button>` : ""}
      </td>
    `;

    tr.querySelector(".viewBtn").onclick = () => openActionModal(a.id);

    const doneBtn = tr.querySelector(".doneBtn");
    if (doneBtn) doneBtn.onclick = () => openDoneModal(a);

    tbody.appendChild(tr);
  });
}

// ---------- main loader ----------
async function loadDetail() {
  const data = await apiFetch(`/customers/${id}`);
  renderSummary(data);
  renderBanner(data);
  renderDrivers(data);
  renderEvents(data);
  renderActions(data);

  // trend chart
  const hist = await apiFetch(`/customers/${id}/health-history?days=14`);
  renderMomentum(hist.direction, hist.delta);

  const canvas = $("healthChart");
  if (canvas) drawLineChart(canvas, hist.points);
}

loadDetail();
