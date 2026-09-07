(function () {
  var root = document.documentElement;
  var header = document.querySelector('[data-header]');
  var themeToggle = document.querySelector('[data-theme-toggle]');
  var themeIcon = document.querySelector('[data-theme-icon]');
  var searchToggle = document.querySelector('[data-search-toggle]');
  var searchDrawer = document.querySelector('[data-search-drawer]');
  var searchInput = document.querySelector('#site-search');
  var searchResults = document.querySelector('[data-search-results]');
  var mobileSearch = document.querySelector('[data-mobile-search]');
  var menuToggle = document.querySelector('[data-menu-toggle]');
  var mobileMenu = document.querySelector('[data-mobile-menu]');
  var currentYear = document.querySelector('[data-current-year]');

  function setTheme(theme) {
    root.dataset.theme = theme;
    if (themeIcon) themeIcon.textContent = theme === 'dark' ? '☾' : '☼';
    if (themeToggle) themeToggle.setAttribute('aria-label', theme === 'dark' ? '切换浅色模式' : '切换深色模式');
    if (themeToggle) themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
    try { localStorage.setItem('z-blog-theme', theme); } catch (error) {}
  }

  var savedTheme = null;
  try { savedTheme = localStorage.getItem('z-blog-theme'); } catch (error) {}
  if (savedTheme === 'dark' || savedTheme === 'light') setTheme(savedTheme);
  else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');

  if (themeToggle) themeToggle.addEventListener('click', function () {
    setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  function setSearchOpen(open) {
    if (!searchDrawer) return;
    searchDrawer.classList.toggle('is-open', open);
    if (searchToggle) searchToggle.setAttribute('aria-expanded', String(open));
    if (open && searchInput) window.setTimeout(function () { searchInput.focus(); }, 150);
    if (!open && searchInput) { searchInput.value = ''; renderSearchResults(''); }
  }

  if (searchToggle && searchDrawer) searchToggle.addEventListener('click', function () {
    setSearchOpen(!searchDrawer.classList.contains('is-open'));
  });

  if (mobileSearch) mobileSearch.addEventListener('click', function () {
    if (mobileMenu) mobileMenu.classList.remove('is-open');
    if (menuToggle) { menuToggle.classList.remove('is-open'); menuToggle.setAttribute('aria-expanded', 'false'); }
    setSearchOpen(true);
  });

  if (menuToggle && mobileMenu) menuToggle.addEventListener('click', function () {
    var open = mobileMenu.classList.toggle('is-open');
    menuToggle.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      setSearchOpen(false);
      if (mobileMenu) mobileMenu.classList.remove('is-open');
      if (menuToggle) { menuToggle.classList.remove('is-open'); menuToggle.setAttribute('aria-expanded', 'false'); }
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === '/' && document.activeElement !== searchInput && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      event.preventDefault();
      setSearchOpen(true);
    }
  });

  document.querySelectorAll('.mobile-menu a, .mobile-search-link').forEach(function (link) {
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
  var searchIndex = Array.prototype.map.call(noteCards, function (card) {
    return {
      href: card.getAttribute('href'),
      title: (card.querySelector('h3') || {}).textContent || '',
      description: (card.querySelector('p') || {}).textContent || '',
      category: card.dataset.category || ''
    };
  });

  function renderSearchResults(value) {
    if (!searchResults) return;
    var query = value.trim().toLowerCase();
    searchResults.innerHTML = '';
    if (!query) return;
    var matches = searchIndex.filter(function (item) {
      return (item.title + ' ' + item.description + ' ' + item.category).toLowerCase().indexOf(query) !== -1;
    }).slice(0, 6);
    if (!matches.length) {
      var empty = document.createElement('p');
      empty.className = 'search-empty';
      empty.textContent = '没有找到相关文章，试试 AI、Agent 或项目。';
      searchResults.appendChild(empty);
      return;
    }
    matches.forEach(function (item) {
      var link = document.createElement('a');
      link.className = 'search-result';
      link.href = item.href;
      var title = document.createElement('span');
      title.textContent = item.title;
      var category = document.createElement('small');
      category.textContent = item.category;
      link.appendChild(title);
      link.appendChild(category);
      searchResults.appendChild(link);
    });
  }

  if (searchInput) searchInput.addEventListener('input', function () { renderSearchResults(searchInput.value); });

  filterButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var filter = button.dataset.filter;
      filterButtons.forEach(function (item) {
        item.classList.toggle('is-active', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      });
      noteCards.forEach(function (card) { card.classList.toggle('hidden', filter !== 'all' && card.dataset.category !== filter); });
    });
  });

  if (currentYear) currentYear.textContent = String(new Date().getFullYear());
}());
