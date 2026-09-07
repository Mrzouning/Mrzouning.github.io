(function () {
  var root = document.documentElement;
  var header = document.querySelector('[data-header]');
  var themeToggle = document.querySelector('[data-theme-toggle]');
  var themeIcon = document.querySelector('[data-theme-icon]');
  var searchToggle = document.querySelector('[data-search-toggle]');
  var searchDrawer = document.querySelector('[data-search-drawer]');
  var searchInput = document.querySelector('#site-search');
  var menuToggle = document.querySelector('[data-menu-toggle]');
  var mobileMenu = document.querySelector('[data-mobile-menu]');
  var currentYear = document.querySelector('[data-current-year]');

  function setTheme(theme) {
    root.dataset.theme = theme;
    if (themeIcon) themeIcon.textContent = theme === 'dark' ? '☾' : '☼';
    if (themeToggle) themeToggle.setAttribute('aria-label', theme === 'dark' ? '切换浅色模式' : '切换深色模式');
    try { localStorage.setItem('z-blog-theme', theme); } catch (error) {}
  }

  var savedTheme = null;
  try { savedTheme = localStorage.getItem('z-blog-theme'); } catch (error) {}
  if (savedTheme === 'dark' || savedTheme === 'light') setTheme(savedTheme);
  else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');

  if (themeToggle) themeToggle.addEventListener('click', function () {
    setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  if (searchToggle && searchDrawer) searchToggle.addEventListener('click', function () {
    var open = searchDrawer.classList.toggle('is-open');
    searchToggle.setAttribute('aria-expanded', String(open));
    if (open && searchInput) window.setTimeout(function () { searchInput.focus(); }, 150);
  });

  if (menuToggle && mobileMenu) menuToggle.addEventListener('click', function () {
    var open = mobileMenu.classList.toggle('is-open');
    menuToggle.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      if (searchDrawer) searchDrawer.classList.remove('is-open');
      if (searchToggle) searchToggle.setAttribute('aria-expanded', 'false');
      if (mobileMenu) mobileMenu.classList.remove('is-open');
      if (menuToggle) { menuToggle.classList.remove('is-open'); menuToggle.setAttribute('aria-expanded', 'false'); }
    }
  });

  document.querySelectorAll('.mobile-menu a').forEach(function (link) {
    link.addEventListener('click', function () {
      if (mobileMenu) mobileMenu.classList.remove('is-open');
      if (menuToggle) { menuToggle.classList.remove('is-open'); menuToggle.setAttribute('aria-expanded', 'false'); }
    });
  });

  function updateHeader() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 10); }
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  var revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: .12 });
    revealItems.forEach(function (item) { revealObserver.observe(item); });
  } else revealItems.forEach(function (item) { item.classList.add('is-visible'); });

  var filterButtons = document.querySelectorAll('[data-filter]');
  var noteCards = document.querySelectorAll('[data-category]');
  filterButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var filter = button.dataset.filter;
      filterButtons.forEach(function (item) { item.classList.toggle('is-active', item === button); });
      noteCards.forEach(function (card) { card.classList.toggle('hidden', filter !== 'all' && card.dataset.category !== filter); });
    });
  });

  if (currentYear) currentYear.textContent = String(new Date().getFullYear());
}());
