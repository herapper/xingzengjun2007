(() => {
  "use strict";
  const hero = document.querySelector("[data-slideshow]");
  if (!hero) return;
  const slides = Array.from(hero.querySelectorAll(".hero-media"));
  const controls = hero.querySelector(".slideshow-controls");
  const toggle = controls.querySelector("[data-slide-toggle]");
  const count = controls.querySelector(".slideshow-count");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let index = 0, timer, busy = false, inView = true, paused = motion.matches;
  const loads = new Map();
  const load = (i) => {
    if (loads.has(i)) return loads.get(i);
    const img = slides[i];
    const promise = new Promise((resolve) => {
      if (img.complete && img.naturalWidth) return resolve(true);
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      if (img.dataset.src) img.src = img.dataset.src;
    });
    loads.set(i, promise);
    return promise;
  };
  const schedule = () => {
    clearTimeout(timer);
    if (!paused && !document.hidden && inView && !busy)
      timer = setTimeout(() => change(1), 6000);
  };
  const updateToggle = () => {
    toggle.textContent = paused ? "播放轮播" : "暂停轮播";
  };
  const change = async (direction, manual = false) => {
    if (busy) return;
    busy = true;
    clearTimeout(timer);
    for (let step = 1; step < slides.length; step++) {
      const next = (index + direction * step + slides.length) % slides.length;
      if (!(await load(next))) continue;
      if (!manual && (paused || document.hidden || !inView)) break;
      slides[index].classList.remove("is-active");
      slides[next].classList.add("is-active");
      index = next;
      count.textContent = `${String(index + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
      break;
    }
    busy = false;
    schedule();
  };
  slides[0].classList.add("is-active");
  hero.classList.add("slideshow-ready");
  controls.hidden = false;
  controls.querySelector("[data-slide-prev]").addEventListener("click", () => { paused = true; updateToggle(); change(-1, true); });
  controls.querySelector("[data-slide-next]").addEventListener("click", () => { paused = true; updateToggle(); change(1, true); });
  toggle.addEventListener("click", () => { paused = !paused; updateToggle(); schedule(); });
  document.addEventListener("visibilitychange", schedule);
  if ("IntersectionObserver" in window) new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    schedule();
  }).observe(hero);
  motion.addEventListener("change", () => { paused = motion.matches; updateToggle(); schedule(); });
  updateToggle();
  load(1);
  schedule();
})();
