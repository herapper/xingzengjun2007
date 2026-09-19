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
  if (!links.length) return;

  // ===== 全屏照片查看器 =====
  const viewer = document.createElement("div");
  viewer.className = "photo-viewer";
  viewer.setAttribute("role", "dialog");
  viewer.setAttribute("aria-modal", "true");
  viewer.innerHTML = `
    <div class="viewer-top">
      <span class="viewer-counter">01 / 01</span>
      <div class="viewer-actions">
        <button class="viewer-btn" data-action="fullscreen" aria-label="全屏">⛶</button>
        <button class="viewer-btn" data-action="download" aria-label="下载">⤓</button>
        <button class="viewer-btn" data-action="close" aria-label="关闭">×</button>
      </div>
    </div>
    <button class="viewer-arrow viewer-prev" aria-label="上一张">←</button>
    <div class="viewer-stage">
      <img class="viewer-image" alt="" draggable="false">
    </div>
    <button class="viewer-arrow viewer-next" aria-label="下一张">→</button>
    <div class="viewer-thumbs">
      <div class="thumbs-track"></div>
    </div>
  `;
  document.body.append(viewer);

  const img = viewer.querySelector(".viewer-image");
  const counter = viewer.querySelector(".viewer-counter");
  const prevBtn = viewer.querySelector(".viewer-prev");
  const nextBtn = viewer.querySelector(".viewer-next");
  const closeBtn = viewer.querySelector('[data-action="close"]');
  const fullscreenBtn = viewer.querySelector('[data-action="fullscreen"]');
  const downloadBtn = viewer.querySelector('[data-action="download"]');
  const thumbsTrack = viewer.querySelector(".thumbs-track");

  // 生成缩略图条
  links.forEach((link, i) => {
    const thumb = document.createElement("div");
    thumb.className = "thumb-item";
    thumb.innerHTML = `<img src="${link.querySelector("img").src}" alt="" loading="lazy">`;
    thumb.addEventListener("click", () => showPhoto(i));
    thumbsTrack.append(thumb);
  });
  const thumbs = Array.from(thumbsTrack.children);

  let index = 0;
  let returnFocus = null;

  const showPhoto = (i) => {
    if (i < 0) i = links.length - 1;
    if (i >= links.length) i = 0;
    index = i;
    img.src = links[i].href;
    img.alt = links[i].querySelector("img").alt;
    counter.textContent = `${String(i + 1).padStart(2, "0")} / ${String(links.length).padStart(2, "0")}`;

    // 高亮当前缩略图
    thumbs.forEach((t, ti) => t.classList.toggle("is-active", ti === i));
    thumbs[i].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const openViewer = (i) => {
    returnFocus = document.activeElement;
    showPhoto(i);
    viewer.classList.add("is-open");
    document.body.classList.add("viewer-open");
  };

  const closeViewer = () => {
    viewer.classList.remove("is-open");
    document.body.classList.remove("viewer-open");
    if (returnFocus?.isConnected) returnFocus.focus();
  };

  // 绑定事件
  links.forEach((link, i) => {
    link.addEventListener("click", (e) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.defaultPrevented) return;
      e.preventDefault();
      openViewer(i);
    });
  });

  prevBtn.addEventListener("click", () => showPhoto(index - 1));
  nextBtn.addEventListener("click", () => showPhoto(index + 1));
  closeBtn.addEventListener("click", closeViewer);

  fullscreenBtn.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      viewer.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  });

  downloadBtn.addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = links[index].href;
    a.download = "";
    a.target = "_blank";
    a.click();
  });

  // 点击背景关闭
  viewer.querySelector(".viewer-stage").addEventListener("click", (e) => {
    if (e.target === img) return;
    closeViewer();
  });

  // 键盘快捷键
  document.addEventListener("keydown", (e) => {
    if (!viewer.classList.contains("is-open")) return;
    if (e.key === "Escape") closeViewer();
    if (e.key === "ArrowLeft") showPhoto(index - 1);
    if (e.key === "ArrowRight") showPhoto(index + 1);
    if (e.key.toLowerCase() === "f") fullscreenBtn.click();
    if (e.key.toLowerCase() === "d") downloadBtn.click();
  });

  // 触摸滑动
  let touchStartX = 0;
  viewer.querySelector(".viewer-stage").addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  viewer.querySelector(".viewer-stage").addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      showPhoto(index + (dx < 0 ? 1 : -1));
    }
  }, { passive: true });

// ===== 滚动入场动画 =====
if ("IntersectionObserver" in window) {
  const motionOk = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
  if (motionOk) {
    const animatedSelector = ".series-card, .about-content, .section-heading, .gallery-heading, .airport-index, .series-introduction, .series-navigation, .china-map";
    const targets = document.querySelectorAll(animatedSelector);
    if (targets.length) {
      targets.forEach((el) => el.classList.add("animate-hidden"));
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
      targets.forEach((el) => observer.observe(el));
    }
  }
}