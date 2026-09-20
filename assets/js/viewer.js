/* The viewer and its thumbnails are created only after a photograph is opened. */
(() => {
  "use strict";
  if (!document.querySelector('.gallery .photo-link')) return;
  let viewer, image, counter, original, status, track, observer;
  let links = [], index = 0, returnFocus, touchStartX = 0;
  const isOpen = () => viewer?.classList.contains('is-open');

  function close() {
    if (document.fullscreenElement === viewer) document.exitFullscreen?.().catch(() => {});
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('viewer-open');
    observer?.disconnect();
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }

  function show(next) {
    index = (next + links.length) % links.length;
    const photo = links[index].querySelector('img');
    status.textContent = '正在加载照片…';
    image.style.opacity = '0';
    image.alt = photo.alt;
    image.src = photo.dataset.viewer || photo.currentSrc || photo.src;
    original.href = links[index].href;
    counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(links.length).padStart(2, '0')}`;
    Array.from(track.children).forEach((button, i) => {
      button.setAttribute('aria-pressed', String(i === index));
      button.classList.toggle('is-active', i === index);
    });
    track.children[index].scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function createViewer() {
    viewer = document.createElement('div');
    viewer.className = 'photo-viewer';
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-modal', 'true');
    viewer.setAttribute('aria-label', '照片查看器');
    viewer.innerHTML = `
      <div class="viewer-top">
        <span class="viewer-counter" aria-live="polite"></span>
        <div class="viewer-actions">
          <button type="button" class="viewer-btn" data-action="fullscreen" aria-label="全屏">⛶</button>
          <a class="viewer-btn" data-action="original" target="_blank" rel="noopener" download aria-label="下载原图">⤓</a>
          <button type="button" class="viewer-btn" data-action="close" aria-label="关闭">×</button>
        </div>
      </div>
      <button type="button" class="viewer-arrow viewer-prev" aria-label="上一张">←</button>
      <div class="viewer-stage">
        <img class="viewer-image" alt="" decoding="async" draggable="false">
        <span class="viewer-status" role="status"></span>
      </div>
      <button type="button" class="viewer-arrow viewer-next" aria-label="下一张">→</button>
      <div class="viewer-thumbs"><div class="thumbs-track" aria-label="照片缩略图"></div></div>`;
    document.body.append(viewer);
    image = viewer.querySelector('.viewer-image');
    status = viewer.querySelector('.viewer-status');
    counter = viewer.querySelector('.viewer-counter');
    original = viewer.querySelector('[data-action="original"]');
    track = viewer.querySelector('.thumbs-track');
    image.addEventListener('load', () => {
      status.textContent = '';
      image.style.opacity = '1';
    });
    image.addEventListener('error', () => {
      status.textContent = '照片加载失败，请切换后重试，或点击右上角下载原图。';
    });
    viewer.querySelector('[data-action="close"]').addEventListener('click', close);
    viewer.querySelector('.viewer-prev').addEventListener('click', () => show(index - 1));
    viewer.querySelector('.viewer-next').addEventListener('click', () => show(index + 1));
    viewer.querySelector('[data-action="fullscreen"]').addEventListener('click', () => {
      const action = document.fullscreenElement ? document.exitFullscreen?.() : viewer.requestFullscreen?.();
      action?.catch(() => {});
    });
    const stage = viewer.querySelector('.viewer-stage');
    stage.addEventListener('click', event => { if (event.target === stage) close(); });
    stage.addEventListener('touchstart', event => { touchStartX = event.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', event => {
      const delta = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(delta) > 50) show(index + (delta < 0 ? 1 : -1));
    }, { passive: true });
    document.addEventListener('keydown', event => {
      if (!isOpen()) return;
      if (event.key === 'Escape') close();
      if (event.key.toLowerCase() === 'f') viewer.querySelector('[data-action="fullscreen"]').click();
      if (event.key.toLowerCase() === 'd') original.click();
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        show(index + (event.key === 'ArrowLeft' ? -1 : 1));
      }
      if (event.key === 'Tab') {
        const focusable = Array.from(viewer.querySelectorAll('button, a[href]'));
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('.gallery .photo-link');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    returnFocus = link;
    if (!viewer) createViewer();
    // Keep an airport's viewer scoped to the selected airport.
    links = Array.from(link.closest('.gallery').querySelectorAll('.photo-link'));
    observer?.disconnect();
    track.replaceChildren();
    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('viewer-open');
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const thumb = entry.target.querySelector('img');
        thumb.src = thumb.dataset.src;
        observer.unobserve(entry.target);
      }), { root: track, rootMargin: '0px 144px' });
    }
    links.forEach((item, i) => {
      const photo = item.querySelector('img');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'thumb-item';
      button.setAttribute('aria-label', `查看第 ${i + 1} 张：${photo.alt}`);
      const thumb = document.createElement('img');
      thumb.alt = '';
      thumb.decoding = 'async';
      thumb.dataset.src = photo.dataset.thumb || photo.currentSrc || photo.src;
      button.append(thumb);
      button.addEventListener('click', () => show(i));
      track.append(button);
      if (observer) observer.observe(button);
      else { thumb.loading = 'lazy'; thumb.src = thumb.dataset.src; }
    });
    show(links.indexOf(link));
    viewer.querySelector('[data-action="close"]').focus({ preventScroll: true });
  });
})();
