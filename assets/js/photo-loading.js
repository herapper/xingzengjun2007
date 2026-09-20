/* Independent image readiness: never depends on gallery/lightbox initialization. */
(() => {
  const seen = new WeakSet();
  const selector = '.series-card-image img, .gallery-item img, .airport-card-media img, .profile-portrait img';
  function setup(img) {
    if (seen.has(img)) return;
    seen.add(img);
    const frame = img.parentElement;
    frame.classList.add('photo-frame');
    if (img.width && img.height) frame.style.aspectRatio = `${img.width} / ${img.height}`;
    // Fixed-size cover containers retain their existing aspect ratios.
    if (frame.matches('.series-card-image, .airport-card-media')) frame.style.removeProperty('aspect-ratio');
    let button;
    function ready() {
      if (!img.naturalWidth) return;
      img.classList.add('is-loaded');
      frame.classList.remove('photo-pending', 'photo-failed');
      button?.remove();
    }
    function failed() {
      frame.classList.remove('photo-pending');
      frame.classList.add('photo-failed');
      img.classList.remove('is-loaded');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'photo-retry';
        button.textContent = '照片加载失败 · 点击重试';
        button.onclick = event => {
          event.preventDefault(); event.stopPropagation();
          frame.classList.remove('photo-failed'); frame.classList.add('photo-pending');
          button.remove();
          const url = new URL(img.currentSrc || img.src, document.baseURI);
          img.removeAttribute('srcset');
          url.searchParams.set('retry', Date.now());
          img.src = url.href;
        };
      }
      frame.append(button);
    }
    img.addEventListener('load', ready);
    img.addEventListener('error', failed);
    frame.classList.add('photo-pending');
    if (img.complete && img.getAttribute('src')) img.naturalWidth ? ready() : failed();
  }
  function scan(root) {
    if (root.matches?.(selector)) setup(root);
    root.querySelectorAll?.(selector).forEach(setup);
  }
  scan(document);
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(scan)))
    .observe(document.body, { childList: true, subtree: true });
})();
