requireAuth();

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const customerId = params.get("id");

function safe(v, fallback="—"){
  return v === null || v === undefined || v === "" ? fallback : String(v);
}
function fmtDate(d){
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}
function initials(name){
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  const a = parts[0][0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}
function daysUntil(date){
  if (!date) return null;
  const end = new Date(date);
  const now = new Date();
  end.setHours(0,0,0,0);
  now.setHours(0,0,0,0);
  const diff = Math.round((end - now) / (1000 * 60 * 60 * 24));
  return diff;
}

// very simple permission check
function canReassignOwner() {
  const role = localStorage.getItem("role"); // depends on your login storing it
  return role === "CSM" || role === "Admin";
}

async function loadCSAs(selectEl, currentOwnerId) {
  // requires /users route (we added earlier)
  const users = await apiFetch("/users");
  selectEl.innerHTML = "";

  for (const u of users) {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = u.name;
    if (Number(u.id) === Number(currentOwnerId)) opt.selected = true;
    selectEl.appendChild(opt);
  }
}

async function loadProfile(){
  const data = await apiFetch(`/customers/${customerId}`);

  $("pName").textContent = safe(data.name);
  $("pSegment").textContent = safe(data.segment);
  $("pSegmentText").textContent = safe(data.segment);
  $("pSince").textContent = `Customer since ${fmtDate(data.createdAt)}`;

  // optional fields (need DB fields to exist; if not, they show —
  $("pEmail").textContent = safe(data.contactEmail);
  $("pPhone").textContent = safe(data.contactPhone);

  const website = safe(data.website, "");
  const webEl = $("pWebsite");
  if (website) {
    webEl.textContent = website;
    webEl.href = website.startsWith("http") ? website : `https://${website}`;
  } else {
    webEl.textContent = "—";
    webEl.href = "#";
  }

  $("pLocation").textContent = safe(data.location);
  $("pIndustry").textContent = safe(data.industry);
  $("pSize").textContent = safe(data.companySize);
  $("pRegion").textContent = safe(data.location);
  $("pNotes").textContent = safe(data.notes);

  // owner card
  const ownerName = data.owner?.name || data.ownerName || "—";
  $("pOwnerName").textContent = ownerName;
  $("ownerAvatar").textContent = initials(ownerName);
  $("pOwnerRole").textContent = "Customer Success Agent";

  // contract
  const acv = data.annualContractValue != null ? `$${Number(data.annualContractValue).toLocaleString()}` : "—";
  $("pACV").textContent = acv;
  $("pStart").textContent = fmtDate(data.contractStartDate);
  $("pEnd").textContent = fmtDate(data.contractEndDate);

  const d = daysUntil(data.contractEndDate);
  $("pRenewal").textContent = d == null ? "—" : `${d} days`;

  // quick actions
  $("goDashboardBtn").onclick = () => {
    window.location.href = `/customerDetail/customerDetail.html?id=${customerId}`;
  };
  $("scheduleBtn").onclick = () => alert("TODO: open meeting scheduler");
  $("emailBtn").onclick = () => alert("TODO: open email composer");

  // edit/reassign
  const reassignWrap = $("reassignWrap");
  if (canReassignOwner()) {
    reassignWrap.style.display = "block";

    const sel = $("ownerSelect");
    await loadCSAs(sel, data.owner?.id);

    $("saveOwnerBtn").onclick = async () => {
      const ownerId = sel.value;
      const err = $("ownerErr");
      err.style.display = "none";
      err.textContent = "";

      try {
        await apiFetch(`/customers/${customerId}/owner`, {
          method: "PATCH",
          body: JSON.stringify({ ownerId })
        });
        await loadProfile();
      } catch(e) {
        err.style.display = "block";
        err.textContent = e?.message || "Failed to reassign owner.";
      }
    };
  } else {
    reassignWrap.style.display = "none";
  }

  $("editBtn").onclick = () => {
    window.location.href = `/customers/create/createCustomer.html?id=${customerId}`;
  };

}

loadProfile();
