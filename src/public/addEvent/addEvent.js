requireAuth();

document.getElementById("logoutBtn").onclick = logout;
document.getElementById("backBtn").onclick = () => history.back();

const params = new URLSearchParams(window.location.search);
const customerId = params.get("customerId");

document.getElementById("saveBtn").onclick = async () => {
  const type = document.getElementById("type").value;
  const occurredAt = document.getElementById("occurredAt").value;
  const notes = document.getElementById("notes").value;

  if (!occurredAt) return alert("Please choose a date/time.");

  await apiFetch(`/customers/${customerId}/events`, {
    method: "POST",
    body: JSON.stringify({ type, occurredAt, notes })
  });

  window.location.href = `/customerDetail/customerDetail.html?id=${customerId}`;
};
