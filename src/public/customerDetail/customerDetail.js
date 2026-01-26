requireAuth();

const $ = (id) => document.getElementById(id);

const params = new URLSearchParams(window.location.search);
const customerId = params.get("id");

// -------------------- top actions --------------------
$("addEventBtn").onclick = () => openAddEventModal();

$("addActionBtn").onclick = () => openCreateActionModal();

// -------------------- utils --------------------
function fmtDateTime(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString();
}
function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString();
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function safeStr(v, fallback = "-") {
  return v === null || v === undefined || v === "" ? fallback : String(v);
}

// Pills
function riskPillClass(label) {
  const v = String(label || "").toLowerCase();
  if (v.includes("healthy")) return "pill pill-ok";
  if (v.includes("watch")) return "pill pill-warn";
  if (v.includes("at") || v.includes("risk")) return "pill pill-bad";
  return "pill pill-neutral";
}
function fatiguePillClass(level) {
  const v = String(level || "").toLowerCase();
  if (v.includes("high")) return "pill pill-bad";
  if (v.includes("med")) return "pill pill-warn";
  if (v.includes("low")) return "pill pill-ok";
  return "pill pill-neutral";
}

// Timeline icons
function iconForEventType(type) {
  const t = String(type || "").toLowerCase();
  if (t.includes("ticket")) return "🎫";
  if (t.includes("outreach") || t.includes("email") || t.includes("call")) return "📞";
  if (t.includes("activity")) return "📈";
  return "🟣";
}

// -------------------- OPTIONAL: trend chart + momentum --------------------
function drawLineChart(canvas, points) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width,
    h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  if (!points || points.length < 2) return;

  const padding = 24;
  const xs = points.map(
    (_, i) => padding + (i * (w - padding * 2)) / (points.length - 1)
  );
  const ysRaw = points.map((p) => Number(p.score) || 0);

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
    ctx.fillStyle = i === xs.length - 1 ? "#111827" : "#9ca3af";
    ctx.beginPath();
    ctx.arc(xs[i], yScale(ysRaw[i]), i === xs.length - 1 ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderMomentum(direction, delta) {
  const el = $("momentumBadge"); // only exists if your page has it
  if (!el) return;

  let arrow = "➡️";
  let cls = "momentum-flat";
  if (direction === "Improving") {
    arrow = "📈";
    cls = "momentum-up";
  }
  if (direction === "Declining") {
    arrow = "📉";
    cls = "momentum-down";
  }

  const sign = delta > 0 ? "+" : "";
  el.className = cls;
  el.textContent = `${arrow} ${direction} (${sign}${delta} vs 7d ago)`;
}

// -------------------- MODAL HELPERS (FIX BLUR + LOCK SCROLL) --------------------
function setModalOpen(isOpen) {
  document.body.classList.toggle("modalOpen", isOpen);
}

function showModal(modalId) {
  const el = $(modalId);
  if (!el) return;
  el.style.display = "flex";
  setModalOpen(true);
}

function hideModal(modalId) {
  const el = $(modalId);
  if (!el) return;
  el.style.display = "none";

  const anyOpen = Array.from(document.querySelectorAll(".modal")).some(
    (m) => m.style.display === "flex"
  );
  setModalOpen(anyOpen);
}

// ESC closes whichever modal is open
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;

  if ($("createActionModal")?.style.display === "flex") closeCreateActionModal();
  else if ($("actionModal")?.style.display === "flex") closeActionModal();
  else if ($("doneModal")?.style.display === "flex") closeDoneModal();
});

// -------------------- DONE MODAL --------------------
let selectedAction = null;

function openDoneModal(action) {
  selectedAction = action;
  $("doneActionTitle").textContent = `Action: ${action.type} • Due: ${fmtDate(
    action.dueDate
  )}`;
  $("doneOutcome").value = "";
  $("doneNextStep").value = "";
  showModal("doneModal");
}

function closeDoneModal() {
  selectedAction = null;
  hideModal("doneModal");
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
    body: JSON.stringify({ status: "DONE", outcome, nextStep: nextStep || null }),
  });

  closeDoneModal();
  await loadDetail();
};

// -------------------- ACTION DETAILS MODAL --------------------
let selectedActionId = null;
let selectedActionObj = null;

function openActionModal(actionId) {
  selectedActionId = actionId;
  showModal("actionModal");
  loadActionDetail(actionId);
}

function closeActionModal() {
  selectedActionId = null;
  selectedActionObj = null;
  hideModal("actionModal");
}

$("closeActionModal").onclick = closeActionModal;
$("modalCloseBtn").onclick = closeActionModal;
$("actionModal").addEventListener("click", (e) => {
  if (e.target.id === "actionModal") closeActionModal();
});

async function loadActionDetail(actionId) {
  const action = await apiFetch(`/actions/${actionId}`);
  selectedActionObj = action;

  $("actionMeta").textContent = `${action.type} • ${action.status} • Due ${fmtDate(
    action.dueDate
  )} • Priority ${action.priority}`;

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
        <div class="noteMeta">${fmtDateTime(n.createdAt)} • ${
        n.author?.name || "Unknown"
      }</div>
        <div>${safeStr(n.note, "")}</div>
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
    body: JSON.stringify({ note }),
  });

  await loadActionDetail(selectedActionId);
  await loadDetail();
};

$("modalMarkDoneBtn").onclick = () => {
  if (!selectedActionObj) return;
  closeActionModal();
  openDoneModal(selectedActionObj);
};

// -------------------- ADD EVENT MODAL --------------------
function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function openAddEventModal() {
  const err = $("addEventErr");
  if (err) {
    err.style.display = "none";
    err.textContent = "";
  }

  $("aeType").value = "ACTIVITY";
  $("aeNotes").value = "";
  $("aeOccurredAt").value = toDatetimeLocalValue(new Date()); // default now

  showModal("addEventModal");
}

function closeAddEventModal() {
  hideModal("addEventModal");
}

$("closeAddEventModal").onclick = closeAddEventModal;
$("cancelAddEventBtn").onclick = closeAddEventModal;

$("addEventModal").addEventListener("click", (e) => {
  if (e.target.id === "addEventModal") closeAddEventModal();
});

$("addEventForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const type = $("aeType").value;
  const occurredAt = $("aeOccurredAt").value; // datetime-local string
  const notes = $("aeNotes").value.trim();

  const btn = $("submitAddEventBtn");
  const oldText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Saving...";

  try {
    if (!occurredAt) throw new Error("Please choose a date/time.");

    await apiFetch(`/customers/${customerId}/events`, {
      method: "POST",
      body: JSON.stringify({
        type,
        occurredAt,          // keep as-is; backend should parse ISO-like string
        notes: notes || null
      }),
    });

    closeAddEventModal();
    await loadDetail(); // refresh timeline + chart + drivers
  } catch (err) {
    const msg = err?.message || "Failed to add event.";
    const el = $("addEventErr");
    el.style.display = "block";
    el.textContent = msg;
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
});


// -------------------- CREATE ACTION MODAL --------------------
function openCreateActionModal() {
  $("createActionErr").style.display = "none";
  $("createActionErr").textContent = "";

  $("caType").value = "CALL";
  $("caPriority").value = "2";
  $("caNotes").value = "";

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  $("caDue").value = `${yyyy}-${mm}-${dd}`;

  showModal("createActionModal");
}

function closeCreateActionModal() {
  hideModal("createActionModal");
}

$("closeCreateActionModal").onclick = closeCreateActionModal;
$("cancelCreateActionBtn").onclick = closeCreateActionModal;

$("createActionModal").addEventListener("click", (e) => {
  if (e.target.id === "createActionModal") closeCreateActionModal();
});

$("createActionForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const type = $("caType").value;
  const dueDate = $("caDue").value; // yyyy-mm-dd
  const priority = Number($("caPriority").value);
  const notes = $("caNotes").value.trim();

  const btn = $("submitCreateActionBtn");
  const oldText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Creating...";

  try {
    await apiFetch(`/customers/${customerId}/actions`, {
      method: "POST",
      body: JSON.stringify({
        type,
        dueDate,
        priority,
        notes: notes || null,
      }),
    });

    closeCreateActionModal();
    await loadDetail();
  } catch (err) {
    const msg = err?.message || "Failed to create action.";
    const el = $("createActionErr");
    el.style.display = "block";
    el.textContent = msg;
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
});

// -------------------- RENDERERS --------------------
function renderBanner(data) {
  const banner = $("fatigueBanner");
  if (!banner) return;

  if (data.fatigueRisk === "High") {
    banner.style.display = "block";
    banner.textContent = `High fatigue risk (${data.touches7d}/7d). Consider cooldown or resolve issues before more outreach.`;
  } else {
    banner.style.display = "none";
  }
}

function renderSummary(data) {
  const name = safeStr(data.name, "Customer");

  const link = $("custNameLink");
  if (link) link.href = `/customerDetail/customerProfile/customerProfile.html?id=${customerId}`;

  // page header pieces
  $("custName").textContent = name;

  const owner = safeStr(data.ownerName || data.owner, "-");
  const segment = safeStr(data.segment, "Enterprise");
  const last = data.lastActivityDate ? fmtDate(data.lastActivityDate) : "-";
  $("crumbs").textContent = `${segment} • Owner: ${owner} • Last Activity: ${last}`;

  // health bar
  const health = Number(data.healthScore);
  const healthSafe = Number.isFinite(health) ? clamp(health, 0, 100) : 0;
  $("healthValue").textContent = Number.isFinite(health) ? String(health) : "-";
  $("healthBarFill").style.width = `${healthSafe}%`;

  // pills
  const risk = safeStr(data.riskLabel, "-");
  $("riskPill").className = riskPillClass(risk);
  $("riskPill").textContent = risk;

  const fatigue = safeStr(data.fatigueRisk, "-");
  $("fatiguePill").className = fatiguePillClass(fatigue);
  $("fatiguePill").textContent = fatigue === "-" ? "-" : `${fatigue} Fatigue`;

  // counts
  const activeCount = (data.actions || []).filter((a) => a.status !== "DONE").length;
  $("activeActionsCount").textContent = String(activeCount);
}

function renderActivity7d(data) {
  const canvas = $("activity7dChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const events = data.events || [];

  // build last 7 days buckets
  const days = [];
  const today = new Date();
  today.setHours(0,0,0,0);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({
      key: d.toISOString().slice(0,10),
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      count: 0
    });
  }

  for (const e of events) {
    if (!e.occurredAt) continue;
    const k = new Date(e.occurredAt).toISOString().slice(0,10);
    const bucket = days.find(d => d.key === k);
    if (bucket) bucket.count++;
  }

  const max = Math.max(...days.map(d => d.count), 1);
  const barW = w / days.length;

  days.forEach((d, i) => {
    const barH = (d.count / max) * (h - 20);
    const x = i * barW + 10;
    const y = h - barH - 16;

    ctx.fillStyle = d.count === 0 ? "#e5e7eb" : "#0f766e";
    ctx.fillRect(x, y, barW - 16, barH);

    ctx.fillStyle = "#64748b";
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(d.label, x + (barW - 16) / 2, h - 4);
  });
}

function renderDrivers(data) {
  const wrap = $("driversWrap");
  if (!wrap) return;

  wrap.innerHTML = "";

  const drivers = data.drivers || [];
  if (drivers.length === 0) {
    wrap.innerHTML = `<div class="muted">No major risk drivers detected.</div>`;
    return;
  }

  drivers.forEach((d) => {
    const div = document.createElement("div");
    div.className = "driverCard";
    div.innerHTML = `
      <div class="driverLeft">
        <div class="driverTitle">📉 ${safeStr(d)}</div>
        <div class="driverDesc">Detected driver impacting customer health</div>
      </div>
    `;
    wrap.appendChild(div);
  });
}

function renderEvents(data) {
  const list = $("timelineList");
  const empty = $("timelineEmpty");
  if (!list || !empty) return;

  list.innerHTML = "";

  const events = (data.events || [])
    .slice()
    .sort((a, b) => new Date(b.occurredAt || 0) - new Date(a.occurredAt || 0));

  if (events.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  events.forEach((e) => {
    const div = document.createElement("div");
    div.className = "tlItem";
    div.innerHTML = `
      <div class="tlLeft">
        <div class="tlIcon">${iconForEventType(e.type)}</div>
        <div class="tlText">
          <div class="tlTitle">${safeStr(e.type, "Event")}</div>
          <div class="tlSub">${safeStr(e.notes, "-")}</div>
        </div>
      </div>
      <div class="tlDate">${fmtDate(e.occurredAt)}</div>
    `;
    list.appendChild(div);
  });
}

function outcomeClass(outcome){
  const v = String(outcome || "").toLowerCase();
  if (v.includes("improv") || v.includes("resolved")) return "outcomePill outcomeGood";
  if (v.includes("not") || v.includes("fail")) return "outcomePill outcomeBad";
  return "outcomePill outcomeNeutral";
}

function renderActions(data) {
  const activePanel = $("activeActionsPanel");
  const activeEmpty = $("actionsEmptyCard");

  const donePanel = $("completedActionsPanel");
  const doneEmpty = $("completedEmptyCard");

  if (!activePanel || !activeEmpty) return;

  // clear
  activePanel.innerHTML = "";
  if (donePanel) donePanel.innerHTML = "";

  const all = data.actions || [];
  const active = all.filter(a => a.status !== "DONE");
  const done = all.filter(a => a.status === "DONE");

  // ---------- ACTIVE ----------
  if (active.length === 0) {
    activeEmpty.style.display = "block";
  } else {
    activeEmpty.style.display = "none";
    active.sort((x, y) => new Date(x.dueDate || 0) - new Date(y.dueDate || 0));

    for (const a of active) {
      const due = a.dueDate ? new Date(a.dueDate) : null;
      const isOverdue = due ? due < new Date() : false;

      const card = document.createElement("div");
      card.className = "actionCard";
      card.innerHTML = `
        <div class="actionTop">
          <div class="actionType">${safeStr(a.type, "Action")}</div>
          <div class="actionBadges">
            <span class="smallTag">${String(a.status || "TODO").replaceAll("_"," ")}</span>
          </div>
        </div>

        <div class="actionMetaRow">
          <span class="smallTag">${safeStr(a.priority, "Priority")}</span>
          <span class="smallTag">📅 ${fmtDate(a.dueDate)}</span>
          ${isOverdue ? `<span class="smallTag tagOverdue">Overdue</span>` : ``}
        </div>

        <div class="actionDesc">${safeStr(a.notes, "—")}</div>

        <div class="row" style="justify-content:flex-end; gap:8px;">
          <button class="btn viewBtn">View</button>
          <button class="btn doneBtn">Mark Done</button>
        </div>
      `;

      card.querySelector(".viewBtn").onclick = () => openActionModal(a.id);
      card.querySelector(".doneBtn").onclick = () => openDoneModal(a);

      activePanel.appendChild(card);
    }
  }

  // ---------- COMPLETED ----------
  if (!donePanel || !doneEmpty) return; // if you haven't added HTML yet

  if (done.length === 0) {
    doneEmpty.style.display = "block";
    return;
  }
  doneEmpty.style.display = "none";

  // newest completed first
  done.sort((a, b) => new Date(b.updatedAt || b.completedAt || 0) - new Date(a.updatedAt || a.completedAt || 0));

  for (const a of done) {
    const c = document.createElement("div");
    c.className = "completedCard";

    // optional fields if your backend returns them
    const outcome = a.outcome || "-";
    const nextStep = a.nextStep || "";
    const completedDate = a.updatedAt || a.completedAt || a.dueDate;

    c.innerHTML = `
      <div class="compTop">
        <div>
          <div class="compTitleRow">
            <div class="compTitle">${safeStr(a.type, "Action")}</div>
            <span class="compStatus">Done</span>
          </div>

          <div class="compMetaRow">
            <span class="smallTag">${safeStr(a.priority, "Priority")}</span>
            <span class="smallTag">📅 ${fmtDate(completedDate)}</span>
          </div>
        </div>

        <button class="btn" style="height:34px;" data-view>View</button>
      </div>

      <div class="compNotes">${safeStr(a.notes, "—")}</div>

      <div class="compDivider"></div>

      <div class="compOutcomeRow">
        <span>Outcome:</span>
        <span class="${outcomeClass(outcome)}">${safeStr(outcome, "-")}</span>
      </div>

      ${nextStep ? `<div class="compFooterLine"><b>Next step:</b> ${safeStr(nextStep)}</div>` : ``}
    `;

    c.querySelector("[data-view]").onclick = () => openActionModal(a.id);

    donePanel.appendChild(c);
  }
}


// -------------------- MAIN LOADER --------------------
async function loadDetail() {
  const data = await apiFetch(`/customers/${customerId}`);

  renderSummary(data);
  renderBanner(data);
  renderActivity7d(data);
  renderDrivers(data);
  renderEvents(data);
  renderActions(data);

  console.log("events:", data.events);


  // optional trend section
  try {
    const hist = await apiFetch(`/customers/${customerId}/health-history?days=14`);
    renderMomentum(hist.direction, hist.delta);

    const canvas = $("healthChart");
    if (canvas) drawLineChart(canvas, hist.points);
  } catch {
    // ignore
  }
}

loadDetail();
