const API_BASE = "http://localhost:3000"; // change if your backend runs elsewhere

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
    localStorage.removeItem("token");
    alert("Session expired. Please login again.");
    window.location.href = "/login.html";
    return;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("id");
  localStorage.removeItem("role");
  window.location.href = "/login.html";
}
