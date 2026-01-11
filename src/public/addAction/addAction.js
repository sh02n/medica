requireAuth();

document.getElementById("logoutBtn").onclick = logout;
document.getElementById("backBtn").onclick = () => history.back();

const params = new URLSearchParams(window.location.search);
const customerId = params.get("customerId");

const warningEl = document.getElementById("warning");

document.getElementById("type").onchange = async () => {
  const type = document.getElementById("type").value;

  // If outreach action, check customer fatigue from detail endpoint
  if (type === "CALL" || type === "EMAIL") {
    const detail = await apiFetch(`/customers/${customerId}`);
    if (detail.fatigueRisk === "High") {
      warningEl.style.display = "block";
      warningEl.textContent = `Warning: customer has HIGH fatigue (${detail.touches7d}/7d). Consider cooldown.`;
    } else {
      warningEl.style.display = "none";
    }
  } else {
    warningEl.style.display = "none";
  }
};

document.getElementById("saveBtn").onclick = async () => {
  const type = document.getElementById("type").value;
  const dueDate = document.getElementById("dueDate").value;
  const priority = document.getElementById("priority").value;
  const notes = document.getElementById("notes").value;

  if (!dueDate) return alert("Please choose a due date.");

  await apiFetch(`/customers/${customerId}/actions`, {
    method: "POST",
    body: JSON.stringify({
      type,
      dueDate,
      priority,
      status: "TODO",
      notes
    })
  });

  window.location.href = `/customerDetail/customerDetail.html?id=${customerId}`;
};
