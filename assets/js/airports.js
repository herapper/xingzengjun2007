/* Enhance static galleries; every airport remains available without JavaScript. */
(() => {
  "use strict";
  const navigation = document.querySelector('.airport-index');
  if (!navigation) return;
  const sections = Array.from(document.querySelectorAll('.gallery-section[id]'));
  const links = Array.from(navigation.querySelectorAll('a'));
  const findSection = hash => sections.find(section => `#${section.id}` === hash);
  const show = (section, scroll = false) => {
    sections.forEach(item => item.classList.toggle('is-active', item === section));
    links.forEach(link => {
      const active = link.hash === `#${section.id}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    if (scroll) section.scrollIntoView({ block: 'start' });
  };
  if (!sections.length) return;
  show(findSection(location.hash) || sections[0]);
  document.body.classList.add('airports-enhanced');
  if (findSection(location.hash)) requestAnimationFrame(() => show(findSection(location.hash), true));
  navigation.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const section = findSection(link.hash);
    if (!section) return;
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    show(section, true);
  });
  const followHash = () => show(findSection(location.hash) || sections[0], Boolean(location.hash));
  window.addEventListener('popstate', followHash);
  window.addEventListener('hashchange', followHash);
})();
