/* HERAPPER：导航和大图浏览。脚本不可用时，所有网页和原图链接仍可使用。 */
(() => {
  "use strict";
  const header = document.querySelector(".site-header");
  if (header) {
    let scheduled = false;
    const refreshHeader = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 32);
      scheduled = false;
    };
    refreshHeader();
    window.addEventListener("scroll", () => {
      if (!scheduled) {
        scheduled = true;
        window.requestAnimationFrame(refreshHeader);
      }
    }, { passive: true });
  }

  const links = Array.from(document.querySelectorAll(".gallery .photo-link"))
    .filter((link) => link.querySelector("img"));
  if (!links.length || typeof HTMLDialogElement === "undefined" ||
      typeof HTMLDialogElement.prototype.showModal !== "function") return;

  const viewer = document.createElement("dialog");
  viewer.className = "lightbox";
  viewer.setAttribute("aria-labelledby", "viewer-title");
  viewer.innerHTML = `
    <div class="viewer-top">
      <p class="viewer-title" id="viewer-title"></p>
      <p class="viewer-status" role="status"></p>
      <button class="viewer-close" type="button" aria-label="关闭大图" autofocus>关闭 <span aria-hidden="true">×</span></button>
    </div>
    <div class="viewer-stage">
      <img class="viewer-image" alt="" draggable="false">
    </div>
    <div class="viewer-bottom">
      <button class="viewer-prev" type="button" aria-label="上一张照片">←</button>
      <p class="viewer-count" aria-live="polite" aria-atomic="true"></p>
      <button class="viewer-next" type="button" aria-label="下一张照片">→</button>
      <a class="viewer-original" target="_blank" rel="noopener">打开原图 <span aria-hidden="true">↗</span></a>
    </div>`;
  document.body.append(viewer);
  document.querySelector(".gallery").classList.add("gallery-enhanced");

  const photo = viewer.querySelector(".viewer-image");
  const title = viewer.querySelector(".viewer-title");
  const status = viewer.querySelector(".viewer-status");
  const counter = viewer.querySelector(".viewer-count");
  const previous = viewer.querySelector(".viewer-prev");
  const next = viewer.querySelector(".viewer-next");
  const close = viewer.querySelector(".viewer-close");
  const original = viewer.querySelector(".viewer-original");
  const stage = viewer.querySelector(".viewer-stage");
  title.textContent = document.querySelector("#page-title")?.textContent || "摄影作品";
  let index = 0;
  let returnFocus = null;
  let touchStart = null;
  let savedScroll = 0;

  photo.addEventListener("load", () => {
    photo.classList.remove("is-loading", "has-error");
    status.textContent = "";
  });
  photo.addEventListener("error", () => {
    photo.classList.remove("is-loading");
    photo.classList.add("has-error");
    status.textContent = "照片暂时无法加载，可点击“打开原图”。";
  });

  const showPhoto = (position) => {
    if (position < 0 || position >= links.length) return;
    index = position;
    const source = links[index].querySelector("img");
    photo.classList.remove("has-error");
    photo.classList.add("is-loading");
    status.textContent = "正在加载…";
    photo.alt = source.alt;
    photo.src = links[index].href;
    original.href = links[index].href;
    counter.textContent = String(index + 1).padStart(2, "0") + " / " + String(links.length).padStart(2, "0");
    previous.disabled = index === 0;
    next.disabled = index === links.length - 1;
    if (photo.complete && photo.naturalWidth > 0) {
      photo.classList.remove("is-loading");
      status.textContent = "";
    }
  };

  links.forEach((link, position) => {
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey ||
          event.shiftKey || event.altKey || event.defaultPrevented) return;
      returnFocus = link;
      savedScroll = window.scrollY;
      showPhoto(position);
      viewer.showModal();
      document.documentElement.classList.add("viewer-open");
      event.preventDefault();
    });
  });

  close.addEventListener("click", () => viewer.close());
  previous.addEventListener("click", () => showPhoto(index - 1));
  next.addEventListener("click", () => showPhoto(index + 1));
  viewer.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPhoto(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showPhoto(index + 1);
    }
    // Escape 和 Tab 焦点限制交由原生 dialog 处理。
  });
  viewer.addEventListener("close", () => {
    document.documentElement.classList.remove("viewer-open");
    touchStart = null;
    pointers.clear();
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    if (Math.abs(window.scrollY - savedScroll) > 2) {
      const root = document.documentElement;
      const previousBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, savedScroll);
      root.style.scrollBehavior = previousBehavior;
    }
  });

  // 仅把明确的单指横划识别为换图，保留浏览器纵向滚动和双指缩放。
  const pointers = new Set();
  stage.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") return;
    stage.setPointerCapture(event.pointerId);
    pointers.add(event.pointerId);
    touchStart = pointers.size === 1
      ? { id: event.pointerId, x: event.clientX, y: event.clientY }
      : null;
  }, { passive: true });
  stage.addEventListener("pointerup", (event) => {
    pointers.delete(event.pointerId);
    const start = touchStart;
    touchStart = null;
    if (!start || event.pointerId !== start.id) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= 64 && Math.abs(dx) > Math.abs(dy) * 1.8) {
      showPhoto(index + (dx < 0 ? 1 : -1));
    }
  }, { passive: true });
  stage.addEventListener("pointercancel", (event) => {
    pointers.delete(event.pointerId);
    touchStart = null;
  }, { passive: true });
})();
