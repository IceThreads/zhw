/* Shared behaviour: theme, navigation, reveal and glass interactions. */
(function () {
  "use strict";

  const root = document.documentElement;
  const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const themeBtn = document.getElementById("themeBtn");
  const themeIcon = document.getElementById("themeIcon");
  const themeLabel = document.getElementById("themeLabel");
  const themeMeta = document.getElementById("themeColorMeta");
  const header = document.getElementById("siteHeader");
  const menuBtn = document.getElementById("menuBtn");
  const mobileNav = document.getElementById("mobileNav");
  const toastEl = document.getElementById("siteToast");
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const modes = ["auto", "light", "dark"];
  const modeLabels = { auto: "自动", light: "明亮", dark: "黑暗" };
  const icons = {
    auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 4v16" stroke="currentColor" stroke-width="1.5"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" opacity=".72"/></svg>',
    light: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 2.8v2.3M12 18.9v2.3M2.8 12h2.3M18.9 12h2.3M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.2 15.2A7.7 7.7 0 0 1 8.8 4.8a7.8 7.8 0 1 0 10.4 10.4Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>'
  };

  function savedMode() {
    try {
      const value = localStorage.getItem("weatherSiteTheme");
      return modes.includes(value) ? value : "auto";
    } catch (error) { return "auto"; }
  }
  function systemDark() { return !!(media && media.matches); }
  function resolvedDark(mode) {
    return mode === "dark" || (mode === "auto" && systemDark());
  }
  function applyTheme() {
    const mode = savedMode();
    const dark = resolvedDark(mode);
    root.dataset.theme = dark ? "dark" : "light";
    root.dataset.themeMode = mode;
    if (themeMeta) themeMeta.setAttribute("content", dark ? "#07110d" : "#f2f0e7");
    if (themeIcon) themeIcon.innerHTML = icons[mode];
    if (themeLabel) themeLabel.textContent = modeLabels[mode];
    if (themeBtn) {
      themeBtn.classList.toggle("is-dark", dark);
      themeBtn.setAttribute("aria-label", `外观模式：${modeLabels[mode]}，点击切换`);
      themeBtn.title = mode === "auto" ? "自动跟随系统，点击手动切换" : `${modeLabels[mode]}模式，点击切换`;
    }
    window.dispatchEvent(new CustomEvent("site-theme-change", { detail: { dark, mode } }));
  }
  function setMode(mode) {
    try { localStorage.setItem("weatherSiteTheme", mode); } catch (error) {}
    applyTheme();
  }
  function cycleTheme() {
    const current = savedMode();
    setMode(modes[(modes.indexOf(current) + 1) % modes.length]);
  }

  applyTheme();
  if (themeBtn) themeBtn.addEventListener("click", cycleTheme);
  if (media) {
    const onChange = () => { if (savedMode() === "auto") applyTheme(); };
    if (media.addEventListener) media.addEventListener("change", onChange);
    else if (media.addListener) media.addListener(onChange);
  }

  // sticky header
  const onScroll = () => {
    if (header) header.classList.toggle("scrolled", window.scrollY > 18);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // mobile navigation
  function closeMenu() {
    if (!mobileNav || !menuBtn) return;
    mobileNav.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  }
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = !mobileNav.classList.contains("open");
      mobileNav.classList.toggle("open", open);
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    mobileNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("click", (event) => {
      if (!mobileNav.contains(event.target) && !menuBtn.contains(event.target)) closeMenu();
    });
    window.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
  }

  // page transition for same-site links
  const internalLinks = document.querySelectorAll("a[href]");
  internalLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:") || link.target === "_blank" || link.hasAttribute("download")) return;
      if (!href.endsWith(".html") && !href.startsWith("index.html") && !href.startsWith("download.html")) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      document.body.classList.add("page-leaving");
      setTimeout(() => { window.location.href = href; }, reduceMotion ? 0 : 210);
    });
  });

  // reveal on scroll
  const revealNodes = document.querySelectorAll(".reveal, .reveal-left, .reveal-right");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .12, rootMargin: "0px 0px -6% 0px" });
    revealNodes.forEach((node) => revealObserver.observe(node));
  } else {
    revealNodes.forEach((node) => node.classList.add("in"));
  }

  // glass ripple for controls
  document.querySelectorAll(".btn, .mini-btn, .cloud-card, .icon-btn, .theme-btn, .faq-question").forEach((control) => {
    control.addEventListener("pointerdown", (event) => {
      if (reduceMotion) return;
      const rect = control.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "glass-ripple";
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      ripple.style.width = ripple.style.height = `${Math.max(rect.width, rect.height) * 1.2}px`;
      control.appendChild(ripple);
      setTimeout(() => ripple.remove(), 620);
    });
  });

  // tiny magnetic movement for primary buttons and feature cards
  if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll(".btn-primary, .feature-card, .cloud-card").forEach((node) => {
      node.addEventListener("pointermove", (event) => {
        const rect = node.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        if (node.classList.contains("feature-card") || node.classList.contains("cloud-card")) {
          node.style.setProperty("--tilt-x", `${(-y * 3.2).toFixed(2)}deg`);
          node.style.setProperty("--tilt-y", `${(x * 3.2).toFixed(2)}deg`);
        } else {
          node.style.transform = `translate(${x * 3}px, ${y * 3}px)`;
        }
      });
      node.addEventListener("pointerleave", () => {
        if (node.classList.contains("feature-card") || node.classList.contains("cloud-card")) {
          node.style.setProperty("--tilt-x", "0deg");
          node.style.setProperty("--tilt-y", "0deg");
        } else {
          node.style.transform = "";
        }
      });
    });
  }

  // count-up numbers
  const counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window && !reduceMotion) {
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const node = entry.target;
        const target = Number(node.dataset.count) || 0;
        const start = performance.now();
        const duration = 1300;
        const step = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          node.textContent = Math.round(target * eased).toLocaleString("en-US");
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        countObserver.unobserve(node);
      });
    }, { threshold: .5 });
    counters.forEach((node) => countObserver.observe(node));
  } else {
    counters.forEach((node) => { node.textContent = Number(node.dataset.count || 0).toLocaleString("en-US"); });
  }

  // toast helper
  let toastTimer = null;
  window.showSiteToast = function (message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  };

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) applyTheme();
  });
})();
