// /shared/sidebar.js
(function () {
  async function injectSidebar() {
    // Create wrapper if page doesn't have it yet
    let shell = document.querySelector(".appShell");
    if (!shell) {
      // Wrap existing body content into appShell + appMain
      const bodyChildren = Array.from(document.body.children);
      shell = document.createElement("div");
      shell.className = "appShell";

      const main = document.createElement("div");
      main.className = "appMain";

      // Move everything into main
      bodyChildren.forEach((el) => main.appendChild(el));
      document.body.appendChild(shell);
      shell.appendChild(main);
    }

    // Load sidebar HTML fragment
    const res = await fetch("/shared/sidebar.html");
    const html = await res.text();

    // Insert sidebar at start of shell
    shell.insertAdjacentHTML("afterbegin", html);

    wireSidebar();
    applyRoleVisibility();
    setActiveLink();
  }

  function wireSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    // Add a "☰" toggle button into topbar if it exists
    const topbar = document.querySelector(".topbar") || document.querySelector(".pageHeader") || document.body;
    if (topbar && !document.getElementById("sidebarToggleBtn")) {
      const btn = document.createElement("button");
      btn.id = "sidebarToggleBtn";
      btn.className = "iconBtn";
      btn.textContent = "☰";
      btn.style.marginRight = "8px";
      topbar.insertBefore(btn, topbar.firstChild);

      btn.onclick = () => openSidebar();
    }

    const closeBtn = document.getElementById("sidebarCloseBtn");
    if (closeBtn) closeBtn.onclick = () => closeSidebar();

    if (overlay) overlay.onclick = () => closeSidebar();

    const logoutLink = document.getElementById("sidebarLogoutLink");
    if (logoutLink) {
      logoutLink.onclick = (e) => {
        e.preventDefault();
        // uses your global logout() from api.js
        if (typeof logout === "function") logout();
      };
    }

    // user meta
    const meta = document.getElementById("sidebarUserMeta");
    if (meta) {
      const username = localStorage.getItem("username") || "User";
      const role = localStorage.getItem("role") || "-";
      meta.textContent = `${username} • ${role}`;

        meta.onclick = (e) => {
          e.preventDefault();
          window.location.href = "/profile/profile.html";
        };
    }

    function openSidebar() {
      sidebar?.classList.add("open");
      overlay?.classList.add("show");
    }

    function closeSidebar() {
      sidebar?.classList.remove("open");
      overlay?.classList.remove("show");
    }

    // Expose optional global functions if you want to call from pages
    window.openSidebar = openSidebar;
    window.closeSidebar = closeSidebar;
  }

  function applyRoleVisibility() {
    const role = localStorage.getItem("role") || "CSA";

    // Hide items that require a role (data-role="CSM" etc.)
    document.querySelectorAll("[data-role]").forEach((el) => {
      const required = el.getAttribute("data-role");
      if (required && required !== role) el.style.display = "none";
    });
  }

  function setActiveLink() {
    const path = window.location.pathname;
    document.querySelectorAll(".nav-link").forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;
      // mark active if same page
      if (href.split("?")[0] === path) a.classList.add("active");
    });
  }

  document.addEventListener("DOMContentLoaded", injectSidebar);
})();
