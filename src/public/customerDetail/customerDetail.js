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
          ${a.status !== "DONE" ? `<button data-id="${a.id}">Mark Done</button>` : ""}
        </td>
      `;

      const btn = tr.querySelector("button");
      if (btn) {
        btn.onclick = async () => {
          const outcome = prompt("Outcome? (IMPROVED / NO_RESPONSE / ISSUE_RESOLVED / NOT_IMPROVED)");
          if (!outcome) return;

          await apiFetch(`/actions/${a.id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "DONE", outcome })
          });

          await loadDetail();
        };
      }

      actionsTbody.appendChild(tr);
    }
  }
}

loadDetail();
