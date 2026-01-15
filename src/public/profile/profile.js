requireAuth();

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? "-";
}

document.addEventListener("DOMContentLoaded", () => {
  // Pull from localStorage (current setup)
  const username = localStorage.getItem("username") || "-";
  const role = localStorage.getItem("role") || "-";
  const id = localStorage.getItem("id") || "-";

  setText("pUsername", username);
  setText("pRole", role);
  setText("pId", id);

  // Buttons
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.onclick = logout;

  const clearBtn = document.getElementById("clearSessionBtn");
  if (clearBtn) {
    clearBtn.onclick = () => {
      localStorage.clear();
      window.location.href = "/login.html";
    };
  }
});
