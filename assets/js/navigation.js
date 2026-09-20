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
})();
