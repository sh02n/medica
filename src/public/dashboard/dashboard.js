requireAuth();

document.getElementById("logoutBtn").onclick = logout;
document.getElementById("backBtn").onclick = () => history.back();

async function loadDashboard() {
  const data = await apiFetch("/dashboard/summary");

  document.getElementById("riskBox").textContent = JSON.stringify(data.riskCounts, null, 2);
  document.getElementById("fatigueBox").textContent = JSON.stringify(data.fatigueCounts, null, 2);

  const driversTbody = document.getElementById("driversTbody");
  driversTbody.innerHTML = "";
  for (const d of data.topDrivers || []) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${d.driver}</td><td>${d.count}</td>`;
    driversTbody.appendChild(tr);
  }

  const overdueTbody = document.getElementById("overdueTbody");
  overdueTbody.innerHTML = "";
  for (const a of data.overdue || []) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${a.customer?.name ?? "-"}</td>
      <td>${a.owner?.name ?? "-"}</td>
      <td>${a.type}</td>
      <td>${new Date(a.dueDate).toLocaleDateString()}</td>
      <td>${a.status}</td>
    `;
    overdueTbody.appendChild(tr);
  }
}

loadDashboard();
