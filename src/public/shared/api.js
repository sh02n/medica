const API_BASE = "http://localhost:3000"; 

function getToken() {
  return localStorage.getItem("jwt_token");
}

function requireAuth() {
  const token = getToken();
  if (!token) {
    alert("Please login first.");
    window.location.href = "login.html"; // adjust if your login path differs
  }
  return token;
}

async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.clear();
    window.location.href = "/login.html";
    return;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

document.addEventListener("DOMContentLoaded", () => {
  const role = localStorage.getItem("role");
  const dashboardLink = document.getElementById("dashboardBtn");

  if (dashboardLink && role !== "CSM") {
    dashboardLink.style.display = "none";
  }
});


function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("id");
  localStorage.removeItem("role");
  window.location.href = "/login.html";
}


let inactivityTimer;

const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    logout();
    alert("You have been logged out due to inactivity.");
  }, INACTIVITY_LIMIT);
}

// Reset on user activity
["click", "mousemove", "keydown", "scroll"].forEach(event => {
  document.addEventListener(event, resetInactivityTimer);
});

// Start timer on load
resetInactivityTimer();
