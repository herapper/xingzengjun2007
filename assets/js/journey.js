/* Native horizontal scrolling remains usable without JavaScript. */
(() => {
  'use strict';
  const track = document.querySelector('.journey-track');
  if (!track) return;
  const progress = document.querySelector('.journey-progress');
  const position = document.querySelector('.journey-position');
  const cards = Array.from(track.children);
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const maximum = () => Math.max(0, track.scrollWidth - track.clientWidth);
  const update = () => {
    progress.value = maximum() ? Math.round(track.scrollLeft / maximum() * 1000) : 0;
    const left = track.getBoundingClientRect().left + parseFloat(getComputedStyle(track).paddingLeft);
    let closest = 0;
    cards.forEach((card, i) => { if (Math.abs(card.getBoundingClientRect().left - left) < Math.abs(cards[closest].getBoundingClientRect().left - left)) closest = i; });
    if (maximum() && track.scrollLeft >= maximum() - 2) closest = cards.length - 1;
    position.textContent = `${String(closest + 1).padStart(2, '0')} / ${cards.length}`;
    progress.setAttribute('aria-valuetext', position.textContent);
  };
  progress.hidden = false;
  progress.addEventListener('input', () => { track.scrollLeft = maximum() * progress.value / 1000; });
  track.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(track);
  track.addEventListener('wheel', event => {
    if (!finePointer.matches || event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? track.clientWidth : 1);
    // At either end, return vertical scrolling to the page instead of trapping it.
    if ((delta < 0 && track.scrollLeft <= 0) || (delta > 0 && track.scrollLeft >= maximum() - 1)) return;
    event.preventDefault();
    track.scrollLeft += delta;
  }, { passive: false });
  let drag = null, suppressClick = false;
  track.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    suppressClick = false;
    drag = { id: event.pointerId, x: event.clientX, left: track.scrollLeft, moved: false };
  });
  track.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const delta = event.clientX - drag.x;
    if (!drag.moved && Math.abs(delta) < 6) return;
    drag.moved = true;
    track.setPointerCapture(event.pointerId);
    track.classList.add('is-dragging');
    track.scrollLeft = drag.left - delta;
    event.preventDefault();
  });
  const finish = event => {
    if (!drag || event.pointerId !== drag.id) return;
    suppressClick = drag.moved;
    drag = null;
    track.classList.remove('is-dragging');
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
  };
  window.addEventListener('pointerup', finish);
  track.addEventListener('pointercancel', finish);
  track.addEventListener('lostpointercapture', finish);
  track.addEventListener('dragstart', event => event.preventDefault());
  track.addEventListener('click', event => {
    if (suppressClick && event.detail !== 0) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; }
  }, true);
  track.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') track.scrollLeft = 0;
    else if (event.key === 'End') track.scrollLeft = maximum();
    else track.scrollLeft += (event.key === 'ArrowRight' ? 1 : -1) * (cards[0].clientWidth + parseFloat(getComputedStyle(track).gap));
  });
  update();
})();
