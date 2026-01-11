requireAuth();

const tbody = document.getElementById("customerTbody");
const emptyState = document.getElementById("emptyState");

document.getElementById("logoutBtn").onclick = logout;

document.getElementById("dashboardBtn").onclick = () => {
  window.location.href = "/dashboard/dashboard.html";
};

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
  const search = document.getElementById("searchInput").value.trim();
  const risk = document.getElementById("riskFilter").value;
  const fatigue = document.getElementById("fatigueFilter").value;
  const segment = document.getElementById("segmentFilter").value;

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (risk) params.set("risk", risk);
  if (fatigue) params.set("fatigue", fatigue);
  if (segment) params.set("segment", segment);

  const data = await apiFetch(`/customers?${params.toString()}`);

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
