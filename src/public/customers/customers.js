requireAuth();

const tbody = document.getElementById("customerTbody");
const emptyState = document.getElementById("emptyState");

document.getElementById("applyBtn").onclick = loadCustomers;

function badge(text) {
  return `<span class="badge">${text}</span>`;
}

function fmtDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  return dt.toLocaleDateString();
}

async function loadCustomers() {
  const qs = new URLSearchParams(window.location.search);
  const view = qs.get("view"); // my / all
  const currentUserId = Number(localStorage.getItem("id"));

  // read filters from UI
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const risk = document.getElementById("riskFilter").value;
  const fatigue = document.getElementById("fatigueFilter").value;
  const segment = document.getElementById("segmentFilter").value;

  // fetch ONCE
  let data = await apiFetch("/customers");

  // my/all filter
  if (view === "my") {
    data = data.filter(c => Number(c.ownerId) === currentUserId);
  }

  // UI filters
  if (search) data = data.filter(c => (c.name || "").toLowerCase().includes(search));
  if (risk) data = data.filter(c => c.riskLabel === risk);
  if (fatigue) data = data.filter(c => c.fatigueRisk === fatigue);
  if (segment) data = data.filter(c => c.segment === segment);

  tbody.innerHTML = "";
  if (!data || data.length === 0) {
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  for (const c of data) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.name}</td>
      <td>${c.segment}</td>
      <td>${c.owner?.name ?? "-"}</td>
      <td>${c.healthScore}</td>
      <td>${badge(c.riskLabel)}</td>
      <td>${badge(c.fatigueRisk)} (${c.touches7d ?? 0}/7d)</td>
      <td>${fmtDate(c.lastActivityDate)}</td>
      <td><button class="rowbtn" data-id="${c.id}">View</button></td>
    `;
    tr.querySelector("button").onclick = () => {
      window.location.href = `/customerDetail/customerDetail.html?id=${c.id}`;
    };
    tbody.appendChild(tr);
  }
}


loadCustomers();
