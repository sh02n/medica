requireAuth();

document.getElementById("logoutBtn").onclick = logout;

document.getElementById("goCustomersBtn").onclick = () => {
  const myId = localStorage.getItem("user_id"); // or "id" depending on what you store
  window.location.href = `/customers/customers.html?ownerId=${myId}`;
};


document.getElementById("goDashboardBtn").onclick = () => {
  window.location.href = "/dashboard/dashboard.html";
};

document.getElementById("editProfileBtn").onclick = () => {
  alert("Edit Profile can be added later (name/team/avatar).");
};

function initials(nameOrEmail) {
  const s = String(nameOrEmail || "").trim();
  if (!s) return "U";
  const parts = s.includes("@") ? s.split("@")[0].split(".") : s.split(" ");
  const a = parts[0]?.[0] || "U";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
}

function fmtMonthYear(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value ?? "—";
}

function isAtRiskLabel(label) {
  const v = String(label || "").toLowerCase();
  return v.includes("at-risk") || v.includes("at risk") || v === "at-risk";
}

function isWatchLabel(label) {
  const v = String(label || "").toLowerCase();
  return v.includes("watch");
}

function isHealthyLabel(label) {
  const v = String(label || "").toLowerCase();
  return v.includes("healthy");
}

// success outcomes (match your backend effectiveness logic)
const SUCCESS_OUTCOMES = new Set(["IMPROVED", "ISSUE_RESOLVED"]);

async function loadProfileHeader() {
  // fallback from localStorage if /users/me not ready
  const fallbackName = localStorage.getItem("username") || "User";
  const fallbackRole = localStorage.getItem("role") || "-";
  const fallbackEmail = localStorage.getItem("username") || "—";

  try {
    const me = await apiFetch("/users/me");

    setText("profileName", me.name || me.email || fallbackName);
    setText("profileEmail", me.email || fallbackEmail);
    setText("joinedDate", fmtMonthYear(me.createdAt));

    const role = me.role || fallbackRole;
    const roleLabel = role === "CSM" ? "Customer Success Manager" : "Customer Success Agent";
    setText("rolePill", roleLabel);

    document.getElementById("avatar").textContent = initials(me.name || me.email);
  } catch {
    // fallback mode
    setText("profileName", fallbackName);
    setText("profileEmail", fallbackEmail);
    setText("joinedDate", "—");
    setText("rolePill", fallbackRole === "CSM" ? "Customer Success Manager" : "Customer Success Agent");
    document.getElementById("avatar").textContent = initials(fallbackName);
  }
}

async function loadStats() {
  // get user id from backend (source of truth)
  const me = await apiFetch("/users/me");
  const myId = Number(me.id);

  const customers = await apiFetch("/customers");

  // Debug (remove later)
  console.log("me.id =", myId);
  console.log("sample customer =", customers[0]);

  const myCustomers = customers.filter(c => Number(c.ownerId) === myId);

  const healthy = myCustomers.filter(c => isHealthyLabel(c.riskLabel)).length;
  const watch = myCustomers.filter(c => isWatchLabel(c.riskLabel)).length;
  const atRisk = myCustomers.filter(c => isAtRiskLabel(c.riskLabel)).length;

  const healthVals = myCustomers
    .map(c => Number(c.healthScore))
    .filter(n => Number.isFinite(n));

  const avgHealth = healthVals.length
    ? Math.round((healthVals.reduce((a,b)=>a+b,0) / healthVals.length) * 10) / 10
    : null;

  let activeActions = 0;
  let doneActions = 0;
  let overdueActions = 0;
  let successRate = null;

  try {
    const actions = await apiFetch(`/actions?ownerId=${myId}`);
    const now = new Date();

    const done = actions.filter(a => String(a.status || "").toUpperCase() === "DONE");
    const active = actions.filter(a => String(a.status || "").toUpperCase() !== "DONE");

    doneActions = done.length;
    activeActions = active.length;
    overdueActions = active.filter(a => a.dueDate && new Date(a.dueDate) < now).length;

    const successes = done.filter(a =>
      SUCCESS_OUTCOMES.has(String(a.outcome || "").toUpperCase())
    ).length;

    successRate = doneActions ? Math.round((successes / doneActions) * 100) : 0;
  } catch {
    successRate = null;
  }

  setText("kpiMyCustomers", myCustomers.length);
  setText("kpiAtRisk", atRisk);
  setText("kpiAvgHealth", avgHealth ?? "—");
  setText("kpiSuccessRate", successRate === null ? "—" : `${successRate}%`);

  setText("portfolioHealthy", healthy);
  setText("portfolioWatch", watch);
  setText("portfolioAtRisk", atRisk);

  const total = myCustomers.length || 0;
  const pct = (n) => total ? `${Math.round((n / total) * 100)}% of total` : "—";

  setText("portfolioHealthyMeta", pct(healthy));
  setText("portfolioWatchMeta", pct(watch));

  setText("actionsActive", activeActions);
  setText("actionsDone", doneActions);
  setText("actionsOverdue", overdueActions);
}


(async function init() {
  await loadProfileHeader();
  await loadStats();
})();
