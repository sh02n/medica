requireAuth();

/* ========= DOM ========= */
const listEl = document.getElementById("customerList");
const emptyState = document.getElementById("emptyState");

const toggleBtn = document.getElementById("toggleFiltersBtn");
const panel = document.getElementById("filtersPanel");

const searchEl = document.getElementById("searchInput");
const riskEl = document.getElementById("riskFilter");
const fatigueEl = document.getElementById("fatigueFilter");
const segmentEl = document.getElementById("segmentFilter");
const ownerEl = document.getElementById("ownerFilter"); // optional

const applyBtn = document.getElementById("applyBtn");
const resetBtn = document.getElementById("resetBtn");

let didInitFromQuery = false;
let searchTimer = null;

/* ========= Helpers ========= */
function openFilters() {
  if (!panel) return;
  panel.hidden = false;
  toggleBtn?.classList.add("isOpen");
  toggleBtn?.setAttribute("aria-expanded", "true");
}

function closeFilters() {
  if (!panel) return;
  panel.hidden = true;
  toggleBtn?.classList.remove("isOpen");
  toggleBtn?.setAttribute("aria-expanded", "false");
}

function toggleFilters() {
  if (!panel) return;
  const isOpen = !panel.hidden;
  if (isOpen) closeFilters();
  else openFilters();
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

  if (searchEl) searchEl.value = qs.get("search") || "";
  setSelectValue("riskFilter", qs.get("risk"));
  setSelectValue("fatigueFilter", qs.get("fatigue"));
  setSelectValue("segmentFilter", qs.get("segment"));

  // optional
  setSelectValue("ownerFilter", qs.get("ownerId"));
}

function buildParamsFromUIAndURL() {
  const qs = new URLSearchParams(window.location.search);
  const view = qs.get("view"); // my / all
  const currentUserId = getCurrentUserId();

  const search = searchEl?.value?.trim() || "";
  const risk = riskEl?.value || "";
  const fatigue = fatigueEl?.value || "";
  const segment = segmentEl?.value || "";
  const owner = ownerEl?.value || "";

  const params = new URLSearchParams();

  // enforce "my"
  if (view === "my" && currentUserId != null) {
    params.set("ownerId", String(currentUserId));
  } else if (owner) {
    // only if you actually support ownerId in backend
    params.set("ownerId", owner);
  }

  if (search) params.set("search", search);
  if (risk) params.set("risk", risk);
  if (fatigue) params.set("fatigue", fatigue);
  if (segment) params.set("segment", segment);

  return { params, search, risk, fatigue, segment, owner };
}

function writeUIToQuery({ search, risk, fatigue, segment, owner }) {
  const qs = new URLSearchParams(window.location.search);

  if (search) qs.set("search", search); else qs.delete("search");
  if (risk) qs.set("risk", risk); else qs.delete("risk");
  if (fatigue) qs.set("fatigue", fatigue); else qs.delete("fatigue");
  if (segment) qs.set("segment", segment); else qs.delete("segment");

  // optional
  if (owner) qs.set("ownerId", owner); else qs.delete("ownerId");

  const newUrl = `${window.location.pathname}?${qs.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

/* ========= Rendering ========= */
function riskPillClass(riskLabel) {
  switch ((riskLabel || "").toLowerCase()) {
    case "healthy": return "pillRiskHealthy";
    case "watch": return "pillRiskWatch";
    case "at-risk":
    case "atrisk": return "pillRiskAtRisk";
    default: return "";
  }
}

function fatiguePillClass(f) {
  switch ((f || "").toLowerCase()) {
    case "low": return "pillFatigueLow";
    case "medium": return "pillFatigueMedium";
    case "high": return "pillFatigueHigh";
    default: return "pillFatigueLow";
  }
}

function clamp(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function renderCustomers(data) {
  if (!listEl) return;
  listEl.innerHTML = "";

  if (!data || data.length === 0) {
    if (emptyState) emptyState.style.display = "block";
    return;
  }
  if (emptyState) emptyState.style.display = "none";

  for (const c of data) {
    const score = clamp(c.healthScore ?? 0, 0, 100);

    const row = document.createElement("div");
    row.className = "customerRow";
    row.setAttribute("role", "button");
    row.tabIndex = 0;

    row.innerHTML = `
      <div class="customerCell cellCustomer">
        <div class="customerName">${c.name ?? "-"}</div>
        <div class="customerSub">${c.segment ?? "-"}</div>
      </div>

      <div class="customerCell ownerText">${c.owner?.name ?? "-"}</div>

      <div class="customerCell">
        <div class="healthWrap">
          <div class="healthBar" aria-label="Health Score">
            <div class="healthFill" style="width:${score}%"></div>
          </div>
          <div class="healthScore">${score}</div>
        </div>
      </div>

      <div class="customerCell">
        <span class="pill ${riskPillClass(c.riskLabel)}">${c.riskLabel ?? "-"}</span>
      </div>

      <div class="customerCell">
        <span class="pill ${fatiguePillClass(c.fatigueRisk)}">
          &#8776; ${c.fatigueRisk ?? "Low"} Fatigue
        </span>
      </div>

      <div class="customerCell cellChev">
        <div class="chevBtn" aria-hidden="true"><span class="chev">›</span></div>
      </div>
    `;

    const go = () => (window.location.href = `/customerDetail/customerDetail.html?id=${c.id}`);
    row.onclick = go;
    row.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    };

    listEl.appendChild(row);
  }
}

/* ========= Data load ========= */
async function loadCustomers() {
  if (!didInitFromQuery) {
    readQueryToUI();
    didInitFromQuery = true;
  }

  const { params, search, risk, fatigue, segment, owner } = buildParamsFromUIAndURL();
  writeUIToQuery({ search, risk, fatigue, segment, owner });

  const data = await apiFetch(`/customers?${params.toString()}`);
  renderCustomers(data);
}

/* ========= Events ========= */
toggleBtn?.addEventListener("click", toggleFilters);

applyBtn?.addEventListener("click", async () => {
  await loadCustomers();
  closeFilters(); 
});

resetBtn?.addEventListener("click", async () => {
  if (searchEl) searchEl.value = "";
  setSelectValue("riskFilter", "");
  setSelectValue("fatigueFilter", "");
  setSelectValue("segmentFilter", "");
  setSelectValue("ownerFilter", "");
  await loadCustomers();
  // closeFilters(); // optional: close on reset too
});

// Search: Enter to apply (keeps panel state)
searchEl?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loadCustomers();
});

// Search: debounce typing
searchEl?.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadCustomers, 250);
});

loadCustomers();
