requireAuth();

document.getElementById("logoutBtn").onclick = logout;
document.getElementById("backBtn").onclick = () => history.back();

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

document.getElementById("addEventBtn").onclick = () => {
  window.location.href = `/addEvent/addEvent.html?customerId=${id}`;
};

document.getElementById("addActionBtn").onclick = () => {
  window.location.href = `/addAction/addAction.html?customerId=${id}`;
};

function fmtDateTime(d) {
  if (!d) return "-";
  const dt = new Date(d);
  return dt.toLocaleString();
}


let selectedAction = null;

function openDoneModal(action) {
  selectedAction = action;

  document.getElementById("doneActionTitle").textContent =
    `Action: ${action.type} • Due: ${new Date(action.dueDate).toLocaleDateString()}`;

  document.getElementById("doneOutcome").value = "";
  document.getElementById("doneNextStep").value = "";

  document.getElementById("doneModal").style.display = "flex";
}

function closeDoneModal() {
  selectedAction = null;
  document.getElementById("doneModal").style.display = "none";
}

document.getElementById("closeDoneModal").onclick = closeDoneModal;
document.getElementById("cancelDoneBtn").onclick = closeDoneModal;

document.getElementById("confirmDoneBtn").onclick = async () => {
  if (!selectedAction) return;

  const outcome = document.getElementById("doneOutcome").value;
  const nextStep = document.getElementById("doneNextStep").value;

  if (!outcome) {
    alert("Please select an outcome.");
    return;
  }

  await apiFetch(`/actions/${selectedAction.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "DONE",
      outcome,
      nextStep: nextStep || null
    })
  });

  closeDoneModal();
  await loadDetail();
};

document.getElementById("doneModal").addEventListener("click", (e) => {
  if (e.target.id === "doneModal") closeDoneModal();
});

let selectedActionIdForModal = null;
let selectedActionObjForModal = null;

function openActionModal(actionId) {
  selectedActionIdForModal = actionId;
  document.getElementById("actionModal").style.display = "flex";
  loadActionDetail(actionId);
}

function closeActionModal() {
  selectedActionIdForModal = null;
  selectedActionObjForModal = null;
  document.getElementById("actionModal").style.display = "none";
}

document.getElementById("closeActionModal").onclick = closeActionModal;
document.getElementById("modalCloseBtn").onclick = closeActionModal;

// click outside closes
document.getElementById("actionModal").addEventListener("click", (e) => {
  if (e.target.id === "actionModal") closeActionModal();
});

async function loadActionDetail(actionId) {
  const action = await apiFetch(`/actions/${actionId}`);
  selectedActionObjForModal = action;

  document.getElementById("actionMeta").textContent =
    `${action.type} • ${action.status} • Due ${new Date(action.dueDate).toLocaleDateString()} • Priority ${action.priority}`;

  document.getElementById("actionInitialNotes").textContent = action.notes || "-";

  // render notes
  const list = document.getElementById("actionNotesList");
  list.innerHTML = "";

  const notes = action.notesLog || [];
  if (notes.length === 0) {
    list.innerHTML = `<div class="muted">No progress updates yet.</div>`;
  } else {
    for (const n of notes) {
      const div = document.createElement("div");
      div.className = "noteItem";
      div.innerHTML = `
        <div class="noteMeta">${new Date(n.createdAt).toLocaleString()} • ${n.author?.name || "Unknown"}</div>
        <div>${n.note}</div>
      `;
      list.appendChild(div);
    }
  }

  document.getElementById("newActionNote").value = "";
}

document.getElementById("saveActionNoteBtn").onclick = async () => {
  if (!selectedActionIdForModal) return;

  const note = document.getElementById("newActionNote").value.trim();
  if (!note) {
    alert("Please enter a note.");
    return;
  }

  await apiFetch(`/actions/${selectedActionIdForModal}/notes`, {
    method: "POST",
    body: JSON.stringify({ note })
  });

  await loadActionDetail(selectedActionIdForModal);
  await loadDetail(); 
};

document.getElementById("modalMarkDoneBtn").onclick = () => {
  if (!selectedActionObjForModal) return;
  closeActionModal();
  openDoneModal(selectedActionObjForModal);
};


async function loadDetail() {
  const data = await apiFetch(`/customers/${id}`);

  document.getElementById("title").textContent = data.name;

  // Fatigue banner
  const banner = document.getElementById("fatigueBanner");
  if (data.fatigueRisk === "High") {
    banner.style.display = "block";
    banner.textContent = `High fatigue risk (${data.touches7d}/7d). Consider cooldown or resolve issues before more outreach.`;
  } else {
    banner.style.display = "none";
  }

  // Summary KPIs
  const grid = document.getElementById("summaryGrid");
  grid.innerHTML = `
    <div class="kpi"><div class="label">Health Score</div><div class="value">${data.healthScore}</div></div>
    <div class="kpi"><div class="label">Risk Label</div><div class="value">${data.riskLabel}</div></div>
    <div class="kpi"><div class="label">Fatigue Risk</div><div class="value">${data.fatigueRisk} (${data.touches7d}/7d)</div></div>
    <div class="kpi"><div class="label">Last Activity</div><div class="value">${data.lastActivityDate ? new Date(data.lastActivityDate).toLocaleDateString() : "-"}</div></div>
  `;

  // Drivers
  const driversList = document.getElementById("driversList");
  driversList.innerHTML = "";
  if (!data.drivers || data.drivers.length === 0) {
    driversList.innerHTML = `<li class="muted">No major risk drivers detected.</li>`;
  } else {
    for (const d of data.drivers) {
      const li = document.createElement("li");
      li.textContent = d;
      driversList.appendChild(li);
    }
  }

  // Events
  const eventsTbody = document.getElementById("eventsTbody");
  const eventsEmpty = document.getElementById("eventsEmpty");
  eventsTbody.innerHTML = "";

  if (!data.events || data.events.length === 0) {
    eventsEmpty.style.display = "block";
  } else {
    eventsEmpty.style.display = "none";
    for (const e of data.events) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${fmtDateTime(e.occurredAt)}</td>
        <td>${e.type}</td>
        <td>${e.notes || "-"}</td>
      `;
      eventsTbody.appendChild(tr);
    }
  }

  // Actions
  const actionsTbody = document.getElementById("actionsTbody");
  const actionsEmpty = document.getElementById("actionsEmpty");
  actionsTbody.innerHTML = "";

  if (!data.actions || data.actions.length === 0) {
    actionsEmpty.style.display = "block";
  } else {
    actionsEmpty.style.display = "none";

    for (const a of data.actions) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${new Date(a.dueDate).toLocaleDateString()}</td>
        <td>${a.type}</td>
        <td>${a.status}</td>
        <td>${a.priority}</td>
        <td>${a.outcome || "-"}</td>
        <td>
          <button class="btn viewBtn" data-id="${a.id}">View</button>
          ${a.status !== "DONE" ? `<button class="btn doneBtn" data-id="${a.id}">Mark Done</button>` : ""}
        </td>
      `;

      const viewBtn = tr.querySelector(".viewBtn");
      viewBtn.onclick = () => openActionModal(a.id);

      const doneBtn = tr.querySelector(".doneBtn");
      if (doneBtn) doneBtn.onclick = () => openDoneModal(a);

      actionsTbody.appendChild(tr);
    }
  }
}

loadDetail();
