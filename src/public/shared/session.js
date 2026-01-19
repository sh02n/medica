// /shared/session.js
(function () {
  const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const KEY = "last_activity_ts";

  function now() { return Date.now(); }

  function touch(force) {
    // force = true is used when user clicks "Refresh Session"
    localStorage.setItem(KEY, String(now()));
    if (force) console.log("Session refreshed");
  }

  function msLeft() {
    const last = Number(localStorage.getItem(KEY) || "0");
    if (!last) return TIMEOUT_MS;
    return Math.max(0, TIMEOUT_MS - (now() - last));
  }

  function format(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}m ${String(r).padStart(2, "0")}s`;
  }

  function check() {
    // if not logged in, don't do anything
    if (!localStorage.getItem("jwt_token")) return;

    const left = msLeft();
    const el = document.getElementById("sessionTimer");
    if (el) el.textContent = `Session expires in ${format(left)}`;

    if (left <= 0) {
      alert("Session timed out due to inactivity.");
      if (typeof logout === "function") logout();
    }
  }

  // Mark activity on common events
  ["click", "keydown", "mousemove", "scroll", "touchstart"].forEach(evt => {
    window.addEventListener(evt, () => touch(false), { passive: true });
  });

  // Initialize if missing
  if (!localStorage.getItem(KEY)) touch(false);

  // Timer
  setInterval(check, 1000);

  // expose for profile refresh button
  window.__touchSession = touch;
})();
