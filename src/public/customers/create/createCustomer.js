requireAuth();

const $ = (id) => document.getElementById(id);

const form = $("createCustomerForm");
const ownerSelect = $("custOwner");
const errEl = $("formErr");
const submitBtn = $("submitBtn");

const pageTitle = $("pageTitle");
const pageSub = $("pageSub");

const qs = new URLSearchParams(window.location.search);
const customerId = qs.get("id"); // if exists => edit mode
const isEdit = !!customerId;

function showErr(msg){
  errEl.style.display = "block";
  errEl.textContent = msg || "Something went wrong.";
}
function hideErr(){
  errEl.style.display = "none";
  errEl.textContent = "";
}
function val(id){ return $(id)?.value?.trim() || ""; }
function setVal(id, v){ if ($(id)) $(id).value = v ?? ""; }

function numOrNull(id){
  const raw = val(id);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function toDateInputValue(d){
  if (!d) return "";
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function loadCSAs(selectedOwnerId){
  ownerSelect.innerHTML = `<option value="">Select owner...</option>`;

  // NOTE: this requires you to have a /users route
  // If you don’t yet, you must add it (simple router), otherwise this will 404.
  const users = await apiFetch("/users");

  for (const u of users){
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = u.name;
    if (selectedOwnerId != null && Number(u.id) === Number(selectedOwnerId)) opt.selected = true;
    ownerSelect.appendChild(opt);
  }
}

async function loadCustomerIntoForm(){
  const data = await apiFetch(`/customers/${customerId}`);

  // basic
  setVal("custName", data.name);
  setVal("custSegment", data.segment);
  setVal("custIndustry", data.industry);
  setVal("custCompanySize", data.companySize);

  // contact
  setVal("custEmail", data.contactEmail);
  setVal("custPhone", data.contactPhone);
  setVal("custWebsite", data.website);
  setVal("custLocation", data.location);

  // contract
  setVal("custACV", data.annualContractValue ?? "");
  setVal("custContractStart", toDateInputValue(data.contractStartDate));
  setVal("custContractEnd", toDateInputValue(data.contractEndDate));

  // notes
  setVal("custNotes", data.notes);

  // owners dropdown (after we fetch users)
  await loadCSAs(data.owner?.id ?? data.ownerId);
}

function setEditModeUI(){
  if (pageTitle) pageTitle.textContent = "Edit Customer";
  if (pageSub) pageSub.textContent = "Update customer information";
  submitBtn.textContent = "Save Changes";
}

function setCreateModeUI(){
  if (pageTitle) pageTitle.textContent = "Create New Customer";
  if (pageSub) pageSub.textContent = "Add a new customer to your health monitoring system";
  submitBtn.textContent = "Create Customer";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideErr();

  const payload = {
    name: val("custName"),
    segment: val("custSegment"),
    ownerId: val("custOwner"),

    industry: val("custIndustry") || null,
    companySize: val("custCompanySize") || null,

    contactEmail: val("custEmail") || null,
    contactPhone: val("custPhone") || null,
    website: val("custWebsite") || null,
    location: val("custLocation") || null,

    annualContractValue: numOrNull("custACV"),
    contractStartDate: val("custContractStart") || null,
    contractEndDate: val("custContractEnd") || null,

    notes: val("custNotes") || null,
  };

  if (!payload.name) return showErr("Company Name is required.");
  if (!payload.segment) return showErr("Segment is required.");
  if (!payload.ownerId) return showErr("Account Owner is required.");

  submitBtn.disabled = true;
  const oldText = submitBtn.textContent;
  submitBtn.textContent = isEdit ? "Saving..." : "Creating...";

  try {
    if (isEdit) {
      await apiFetch(`/customers/${customerId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      // go back to profile page after save
      window.location.href = `/customerDetail/customerProfile/customerProfile.html?id=${customerId}`;
    } else {
      const created = await apiFetch("/customers", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      // if your POST returns created customer id:
      // window.location.href = `/customerDetail/customerProfile/customerProfile.html?id=${created.id}`;
      window.location.href = "/customers/customers.html";
    }
  } catch (err) {
    showErr(err?.message || (isEdit ? "Failed to save customer." : "Failed to create customer."));
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = oldText;
  }
});

(async function init(){
  try {
    if (isEdit) {
      setEditModeUI();
      await loadCustomerIntoForm();
    } else {
      setCreateModeUI();
      await loadCSAs(null);
    }
  } catch (e) {
    showErr(e?.message || "Failed to load page data.");
  }
})();
