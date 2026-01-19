requireAuth();

const tbody = document.getElementById("customerTbody");
const emptyState = document.getElementById("emptyState");

document.getElementById("applyBtn").onclick = onApply;

function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString();
}

function setSelectValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = value ?? "";
}

function getCurrentUserId() {
  const raw = localStorage.getItem("id");
  return raw ? Number(raw) : null;
}

function readQueryToUI() {
  const qs = new URLSearchParams(window.location.search);

  // sync inputs from URL
  document.getElementById("searchInput").value = qs.get("search") || "";
  setSelectValue("riskFilter", qs.get("risk"));
  setSelectValue("fatigueFilter", qs.get("fatigue"));
  setSelectValue("segmentFilter", qs.get("segment"));
}

function buildParamsFromUIAndURL() {
  const qs = new URLSearchParams(window.location.search);
  const view = qs.get("view"); // my / all

  const currentUserId = getCurrentUserId();

  const search = document.getElementById("searchInput").value.trim();
  const risk = document.getElementById("riskFilter").value;
  const fatigue = document.getElementById("fatigueFilter").value;
  const segment = document.getElementById("segmentFilter").value;

  const params = new URLSearchParams();

  // ✅ important: enforce "my" using backend filter
  if (view === "my" && currentUserId != null) {
    params.set("ownerId", String(currentUserId));
  }

  if (search) params.set("search", search);
  if (risk) params.set("risk", risk);
  if (fatigue) params.set("fatigue", fatigue);
  if (segment) params.set("segment", segment);

  return { params, view, search, risk, fatigue, segment };
}

function writeUIToQuery({ search, risk, fatigue, segment }) {
  const qs = new URLSearchParams(window.location.search);

  // keep view=... and other sidebar flags
  // update filter params
  if (search) qs.set("search", search); else qs.delete("search");
  if (risk) qs.set("risk", risk); else qs.delete("risk");
  if (fatigue) qs.set("fatigue", fatigue); else qs.delete("fatigue");
  if (segment) qs.set("segment", segment); else qs.delete("segment");

  const newUrl = `${window.location.pathname}?${qs.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

function renderCustomers(data) {
  tbody.innerHTML = "";

  if (!data || data.length === 0) {
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  for (const c of data) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.name ?? "-"}</td>
      <td>${c.segment ?? "-"}</td>
      <td>${c.owner?.name ?? "-"}</td>
      <td>${c.healthScore ?? "-"}</td>
      <td><span class="badge">${c.riskLabel ?? "-"}</span></td>
      <td><span class="badge">${c.fatigueRisk ?? "-"}</span> (${c.touches7d ?? 0}/7d)</td>
      <td>${fmtDate(c.lastActivityDate)}</td>
      <td><button class="rowbtn" data-id="${c.id}">View</button></td>
    `;

    tr.querySelector("button").onclick = () => {
      window.location.href = `/customerDetail/customerDetail.html?id=${c.id}`;
    };

    tbody.appendChild(tr);
  }
}

async function loadCustomers() {
  readQueryToUI(); // ✅ make sidebar links auto-fill the filters

  const { params, search, risk, fatigue, segment } = buildParamsFromUIAndURL();

  // keep URL updated when user reloads / lands via sidebar
  writeUIToQuery({ search, risk, fatigue, segment });

  const data = await apiFetch(`/customers?${params.toString()}`);
  renderCustomers(data);
}

function onApply() {
  // just reload using current UI values (and keeps query in sync)
  loadCustomers();
}

loadCustomers();
