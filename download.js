/* Download page: local human verification, platform switch and download channels. */
(function () {
  "use strict";

  const cfg = window.DOWNLOAD_CONFIG || {};
  const files = cfg.files || {};
  const links = cfg.links || {};
  const channels = {
    lanzou: { name: "蓝奏云", className: "lanzou" },
    pan123: { name: "123 云盘", className: "pan123" },
    github: { name: "GitHub", className: "github" }
  };
  const directEnabled = cfg.directEnabled !== false;

  const slider = document.getElementById("verifySlider");
  const fill = document.getElementById("sliderFill");
  const thumb = document.getElementById("sliderThumb");
  const label = document.getElementById("sliderLabel");
  const statusText = document.getElementById("verifyStatusText");
  const verifyPanel = document.getElementById("verifyPanel");
  const verifySuccess = document.getElementById("verifySuccess");
  const stage = document.getElementById("downloadStage");
  const configModal = document.getElementById("configModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  const modalCode = document.getElementById("modalCode");
  const directWindows = document.getElementById("directWindows");
  const directAndroid = document.getElementById("directAndroid");
  const directFile = document.getElementById("directFile");
  const directHash = document.getElementById("directHash");
  const checksumWindows = document.getElementById("checksumWindows");
  const checksumAndroid = document.getElementById("checksumAndroid");
  const platformButtons = [...document.querySelectorAll(".platform-btn")];
  const cloudCards = [...document.querySelectorAll(".cloud-card")];

  let platform = /Android/i.test(navigator.userAgent) ? "android" : "windows";
  let progress = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartedAt = 0;
  let verified = false;

  function fileFor(which) {
    return files[which] || {};
  }

  function directHref(which) {
    return fileFor(which).direct || "";
  }

  function cloudLink(channel, which) {
    return (links[channel] && links[channel][which]) || "";
  }

  function updatePlatformUI() {
    platformButtons.forEach((button) => {
      const selected = button.dataset.platform === platform;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });
    const file = fileFor(platform);
    cloudCards.forEach((card) => {
      const text = card.querySelector("[data-file]");
      if (text) text.textContent = `${platform === "android" ? "Android" : "Windows"} · ${file.size || "—"}`;
      const channel = card.dataset.channel;
      const hasLink = !!cloudLink(channel, platform);
      card.classList.toggle("unconfigured", !hasLink);
      const state = card.querySelector(".cloud-state");
      if (state) state.textContent = hasLink ? "可用" : "待配置";
    });
    if (directFile) directFile.textContent = `${file.name || "—"} · ${file.size || "—"}`;
    if (directHash) directHash.textContent = `SHA256 · ${shortHash(file.sha256)}`;
    if (checksumWindows) checksumWindows.textContent = fileFor("windows").sha256 || "—";
    if (checksumAndroid) checksumAndroid.textContent = fileFor("android").sha256 || "—";
    if (directWindows) {
      directWindows.href = directHref("windows");
      directWindows.setAttribute("download", fileFor("windows").name || "");
    }
    if (directAndroid) {
      directAndroid.href = directHref("android");
      directAndroid.setAttribute("download", fileFor("android").name || "");
    }
  }

  function shortHash(hash) {
    if (!hash) return "—";
    return `${hash.slice(0, 12)}...${hash.slice(-7)}`;
  }

  platformButtons.forEach((button) => {
    button.addEventListener("click", () => {
      platform = button.dataset.platform;
      updatePlatformUI();
    });
  });

  function openModal(channel) {
    const info = channels[channel] || { name: "下载" };
    if (modalTitle) modalTitle.textContent = `${info.name} · 下载地址待配置`;
    if (modalText) modalText.textContent = `发布者还没有在 download-config.js 中填入 ${info.name} 的${platform === "android" ? " Android" : " Windows"}下载地址。你仍可以使用本站直链立即下载。`;
    if (modalCode) {
      modalCode.textContent = `// download-config.js\nwindow.DOWNLOAD_CONFIG.links.${channel}.${platform} = "https://…";`;
    }
    if (configModal) {
      configModal.classList.add("open");
      configModal.setAttribute("aria-hidden", "false");
    }
  }

  function closeModal() {
    if (!configModal) return;
    configModal.classList.remove("open");
    configModal.setAttribute("aria-hidden", "true");
  }

  cloudCards.forEach((card) => {
    card.addEventListener("click", () => {
      const channel = card.dataset.channel;
      const url = cloudLink(channel, platform);
      if (!url) { openModal(channel); return; }
      window.open(url, "_blank", "noopener,noreferrer");
    });
  });

  if (configModal) {
    configModal.addEventListener("click", (event) => {
      if (event.target === configModal) closeModal();
    });
  }
  const modalClose = document.getElementById("modalClose");
  const modalConfirm = document.getElementById("modalConfirm");
  const modalDirect = document.getElementById("modalDirect");
  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (modalConfirm) modalConfirm.addEventListener("click", closeModal);
  if (modalDirect) {
    modalDirect.addEventListener("click", () => {
      const url = directHref(platform);
      if (url) window.location.href = url;
      closeModal();
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  // --------------------------------------------------------------- verification
  function setProgress(value) {
    progress = Math.max(0, Math.min(1, value));
    const max = Math.max(1, slider.clientWidth - thumb.offsetWidth - 10);
    const x = progress * max;
    slider.style.setProperty("--progress", `${progress * 100}%`);
    slider.style.setProperty("--progress-px", `${x}px`);
    slider.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
    if (label) label.style.opacity = progress > .08 ? "0" : "";
  }
  function resetSlider(shake) {
    setProgress(0);
    dragging = false;
    slider.classList.remove("dragging", "valid");
    if (statusText) statusText.textContent = "本地交互验证 · 不会上传任何个人信息";
    if (shake) {
      slider.classList.add("shake");
      setTimeout(() => slider.classList.remove("shake"), 420);
    }
  }
  function completeVerification() {
    if (verified) return;
    verified = true;
    dragging = false;
    slider.classList.add("valid");
    slider.classList.remove("dragging");
    slider.setAttribute("aria-valuenow", "100");
    if (label) {
      label.textContent = "验证通过";
      label.style.opacity = "1";
    }
    if (statusText) statusText.textContent = "验证通过 · 正在展开下载通道";
    setTimeout(() => {
      verifyPanel.classList.add("hide");
      verifySuccess.hidden = false;
      setTimeout(() => {
        stage.hidden = false;
        stage.setAttribute("aria-hidden", "false");
        requestAnimationFrame(() => stage.classList.add("show"));
        verifySuccess.hidden = true;
        if (stage.scrollIntoView) stage.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 900);
    }, 360);
  }
  function releaseSlider() {
    if (verified) return;
    const duration = performance.now() - dragStartedAt;
    if (progress >= .96 && duration >= 280) completeVerification();
    else resetSlider(true);
  }

  if (slider && thumb) {
    const begin = (event) => {
      if (verified) return;
      event.preventDefault();
      dragging = true;
      dragStartedAt = performance.now();
      dragStartX = event.clientX;
      slider.classList.add("dragging");
      slider.setPointerCapture && slider.setPointerCapture(event.pointerId);
      const rect = slider.getBoundingClientRect();
      const thumbCenter = rect.left + 5 + thumb.offsetWidth / 2;
      setProgress(Math.max(0, (event.clientX - thumbCenter) / Math.max(1, rect.width - thumb.offsetWidth - 10)));
    };
    const move = (event) => {
      if (!dragging || verified) return;
      const rect = slider.getBoundingClientRect();
      const start = rect.left + 5 + thumb.offsetWidth / 2;
      const max = Math.max(1, rect.width - thumb.offsetWidth - 10);
      setProgress((event.clientX - start) / max);
    };
    slider.addEventListener("pointerdown", begin);
    slider.addEventListener("pointermove", move);
    slider.addEventListener("pointerup", releaseSlider);
    slider.addEventListener("pointercancel", () => { if (!verified) resetSlider(false); });
    slider.addEventListener("keydown", (event) => {
      if (verified) return;
      if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        event.preventDefault();
        setProgress(progress + .1);
        dragStartedAt = performance.now() - 400;
      } else if (event.key === "End") {
        event.preventDefault();
        setProgress(1);
        dragStartedAt = performance.now() - 400;
        completeVerification();
      } else if ((event.key === "Enter" || event.key === " ") && progress >= .96) {
        event.preventDefault();
        completeVerification();
      }
    });
    window.addEventListener("resize", () => setProgress(progress));
    setProgress(0);
  }

  updatePlatformUI();

  if (!directEnabled) {
    document.querySelectorAll(".direct-panel, .config-note").forEach((node) => { node.hidden = true; });
    if (modalDirect) modalDirect.hidden = true;
  }
})();
