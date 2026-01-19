(function () {
  async function injectMenu() {
    let shell = document.querySelector(".appShell");
    if (!shell) {
      const bodyChildren = Array.from(document.body.children);

      shell = document.createElement("div");
      shell.className = "appShell";

      const main = document.createElement("div");
      main.className = "appMain";

      bodyChildren.forEach((el) => main.appendChild(el));

      document.body.appendChild(shell);
      shell.appendChild(main);
    }

    // Inject menu (topbar + sidebar) at top of shell
    const res = await fetch("/shared/menu.html");
    const html = await res.text();
    shell.insertAdjacentHTML("afterbegin", html);

    wireMenu();
    applyRoleVisibility();
    setActiveLink();
    fillUserMeta();
    setTopbarTitle();
  }

  function wireMenu() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    const open = () => {
      sidebar?.classList.add("open");
      overlay?.classList.add("show");
    };

    const close = () => {
      sidebar?.classList.remove("open");
      overlay?.classList.remove("show");
    };

    document.getElementById("menuToggleBtn")?.addEventListener("click", open);
    document.getElementById("sidebarCloseBtn")?.addEventListener("click", close);
    overlay?.addEventListener("click", close);

    document.getElementById("sidebarLogoutLink")?.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof logout === "function") logout();
    });

    // Optional: allow pages to call it
    window.openSidebar = open;
    window.closeSidebar = close;
  }

  function fillUserMeta() {
    const username = localStorage.getItem("username") || localStorage.getItem("email") || "User";
    const role = localStorage.getItem("role") || "-";

    const sidebarMeta = document.getElementById("sidebarUserMeta");
    if (sidebarMeta) sidebarMeta.textContent = `${username} • ${role}`;

    const topName = document.getElementById("topbarProfileName");
    const topRole = document.getElementById("topbarProfileRole");
    if (topName) topName.textContent = username;
    if (topRole) topRole.textContent = role;
  }

  function applyRoleVisibility() {
    const role = localStorage.getItem("role") || "CSA";
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
      if (href.split("?")[0] === path) a.classList.add("active");
    });
  }

  // function setTopbarTitle() {
  //   // simple default: use document.title
  //   const el = document.getElementById("appTopbarTitle");
  //   if (el) el.textContent = document.title || "Customer Health";
  // }

  document.addEventListener("DOMContentLoaded", injectMenu);
})();
