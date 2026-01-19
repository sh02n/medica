requireAuth();

document.getElementById("logoutBtn").onclick = logout;
document.getElementById("goCustomersBtn").onclick = () => {
  window.location.href = "/customers/customers.html?view=my";
};

document.getElementById("refreshSessionBtn").onclick = () => {
  if (window.__touchSession) window.__touchSession(true);
};

const username = localStorage.getItem("username") || "User";
const role = localStorage.getItem("role") || "-";
const id = localStorage.getItem("id") || "-";

document.getElementById("profileName").textContent = username;
document.getElementById("profileMeta").textContent = `Role: ${role} • User ID: ${id}`;

const permsByRole = {
  CSA: [
    "View assigned customers",
    "Log engagement events",
    "Create actions for own customers",
    "Complete actions and record outcomes",
  ],
  CSM: [
    "View all customers",
    "View dashboard risk distribution",
    "Assign actions to CSA",
    "Review overdue actions",
  ],
};

const permList = document.getElementById("permList");
(permsByRole[role] || ["—"]).forEach(p => {
  const li = document.createElement("li");
  li.textContent = p;
  permList.appendChild(li);
});

async function loadSummary() {
  // customers list already contains computed fields
  const customers = await apiFetch("/customers");
  const myId = Number(localStorage.getItem("id"));
  const myCustomers = customers.filter(c => c.ownerId === myId);

  const atRisk = myCustomers.filter(c => c.riskLabel === "At-Risk").length;

  // If you don't have /actions endpoint, skip and just show customer stats for now.
  // (If you do have /actions?ownerId=... then use it.)
  let openActions = 0;
  let overdueActions = 0;

  try {
    const actions = await apiFetch(`/actions?ownerId=${myId}`);
    openActions = actions.filter(a => a.status !== "DONE").length;
    overdueActions = actions.filter(a =>
      a.status !== "DONE" && new Date(a.dueDate) < new Date()
    ).length;
  } catch (e) {
    // it's okay if endpoint not implemented yet
  }

  const grid = document.getElementById("summaryGrid");
  grid.innerHTML = `
    <div class="kpi"><div class="label">My Customers</div><div class="value">${myCustomers.length}</div></div>
    <div class="kpi"><div class="label">My At-Risk</div><div class="value">${atRisk}</div></div>
    <div class="kpi"><div class="label">Open Actions</div><div class="value">${openActions}</div></div>
    <div class="kpi"><div class="label">Overdue Actions</div><div class="value">${overdueActions}</div></div>
  `;
}

loadSummary();
