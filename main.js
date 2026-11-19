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
  var themeColorMetas = document.querySelectorAll('meta[name="theme-color"]');
  var themeOrder = ['light', 'dark', 'system'];
  var systemDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var currentMode = 'system';

  /* 风格与明暗是两个正交维度：data-style 负责配色/字体/装饰，data-theme 负责明暗。
     新增风格只需在 STYLES 加一项 + 在 STYLE_COLORS 加两个 theme-color，HTML 无需改动。
     swatch 是下拉里的双色预览块（纸色 / 强调色），hint 是选项下方的一句说明。 */
  var STYLES = [
    { id: 'editorial', label: '纸感手稿', hint: '米黄纸 · 墨绿砖红', swatch: ['#f7f1e6', '#2e5d4d'] },
    { id: 'tech', label: '科技风', hint: '冷蓝网格 · 等宽标题', swatch: ['#f2f6fa', '#0b63c9'] },
    { id: 'retro', label: '复古风', hint: '牛皮纸 · 打字机小字', swatch: ['#eee1c4', '#7b4a2c'] },
    { id: 'minimal', label: '简约风', hint: '纯白留白 · 零装饰', swatch: ['#ffffff', '#1c1c1c'] },
    { id: 'sage', label: '护眼豆沙绿', hint: '低饱和 · 久读不累', swatch: ['#e9e7d9', '#4a6b52'] },
    { id: 'terminal', label: '终端绿', hint: '黑底荧光 · 等宽字', swatch: ['#050d07', '#4ce07a'] },
    { id: 'auto', label: '自动 · 随时间', hint: '白天纸感 / 夜间科技', swatch: ['#f7f1e6', '#0a1320'] }
  ];
  var STYLE_COLORS = {
    editorial: { light: '#f7f1e6', dark: '#17211e' },
    tech: { light: '#f2f6fa', dark: '#0a1320' },
    retro: { light: '#eee1c4', dark: '#241b13' },
    minimal: { light: '#ffffff', dark: '#131313' },
    sage: { light: '#e9e7d9', dark: '#1b241d' },
    terminal: { light: '#eef2e9', dark: '#050d07' }
  };
  var STYLE_KEY = 'z-blog-style';
  var currentStyle = 'editorial';   /* 解析后的实际风格：写进 data-style、用于 theme-color */
  var currentChoice = 'editorial';  /* 用户的选择，可能是 auto */
  var stylePickers = [];
  var styleStatus = null;
  var footerStyleLabel = null;
  var switchTimer = null;
  var menuSeq = 0;
  var highContrast = window.matchMedia ? window.matchMedia('(prefers-contrast: more)') : null;

  function resolveTheme(mode) {
    if (mode === 'light' || mode === 'dark') return mode;
    return systemDark && systemDark.matches ? 'dark' : 'light';
  }

  function ensureSearchUI() {
    if (!header) return;
    var headerActions = header.querySelector('.header-actions');
    if (!headerActions) return;

    if (!searchToggle) {
      searchToggle = document.createElement('button');
      searchToggle.className = 'icon-button';
      searchToggle.type = 'button';
      searchToggle.setAttribute('data-search-toggle', '');
      searchToggle.setAttribute('aria-expanded', 'false');
      searchToggle.setAttribute('aria-controls', 'site-search-drawer');
      searchToggle.setAttribute('aria-label', '打开搜索');
      searchToggle.title = '搜索';
      searchToggle.innerHTML = '<span aria-hidden="true">⌕</span>';
      headerActions.insertBefore(searchToggle, headerActions.firstChild);
    }

    if (!searchDrawer) {
      searchDrawer = document.createElement('div');
      searchDrawer.className = 'search-drawer';
      searchDrawer.id = 'site-search-drawer';
      searchDrawer.setAttribute('data-search-drawer', '');
      searchDrawer.innerHTML = '<label for="site-search">搜索这个博客</label><input id="site-search" type="search" placeholder="输入关键词，比如：AI、Agent、项目" autocomplete="off"><span class="search-hint">Esc 关闭</span><div class="search-results" data-search-results aria-live="polite"></div>';
      header.appendChild(searchDrawer);
    }

    searchInput = searchDrawer.querySelector('#site-search');
    searchResults = searchDrawer.querySelector('[data-search-results]');
  }

  function styleMeta(id) {
    for (var i = 0; i < STYLES.length; i++) if (STYLES[i].id === id) return STYLES[i];
    return STYLES[0];
  }

  function isValidChoice(value) {
    return value === 'auto' || Object.prototype.hasOwnProperty.call(STYLE_COLORS, value);
  }

  /* auto 的解析规则必须与各页 head 引导脚本保持一致，否则刷新会闪一下。
     prefers-contrast: more 优先（无障碍），其次按本地时间：白天纸感、夜间科技。 */
  function resolveChoice(choice) {
    if (choice !== 'auto') return choice;
    if (highContrast && highContrast.matches) return 'minimal';
    var h = new Date().getHours();
    return h >= 7 && h < 19 ? 'editorial' : 'tech';
  }

  function updateThemeColor() {
    var theme = root.dataset.theme === 'dark' ? 'dark' : 'light';
    var pair = STYLE_COLORS[currentStyle] || STYLE_COLORS.editorial;
    var color = pair[theme] || pair.light;
    themeColorMetas.forEach(function (meta) { meta.setAttribute('content', color); });
  }

  function announceStyle(choice) {
    if (!styleStatus) return;
    styleStatus.textContent = choice === 'auto'
      ? '已切换为自动风格，当前使用' + styleMeta(currentStyle).label
      : '已切换为' + styleMeta(choice).label + '风格';
  }

  function flashStyleTransition() {
    if (reducedMotion && reducedMotion.matches) return;
    root.classList.add('is-style-switching');
    window.clearTimeout(switchTimer);
    switchTimer = window.setTimeout(function () { root.classList.remove('is-style-switching'); }, 380);
  }

  /* 同步所有下拉实例、原生 select 与页脚标识 */
  function syncStyleUI() {
    stylePickers.forEach(function (picker) {
      var meta = styleMeta(currentChoice);
      var trigger = picker.querySelector('[data-style-trigger]');
      if (trigger) {
        var sw = trigger.querySelector('.style-picker__swatch');
        var label = trigger.querySelector('.style-picker__label');
        if (sw) { sw.style.setProperty('--sw-bg', meta.swatch[0]); sw.style.setProperty('--sw-fg', meta.swatch[1]); }
        if (label) label.textContent = meta.label;
        trigger.setAttribute('aria-label', '博客风格：' + meta.label + '，点击切换');
        trigger.title = '切换博客风格（当前：' + meta.label + '）';
      }
      var select = picker.querySelector('[data-style-select]');
      if (select && select.value !== currentChoice) select.value = currentChoice;
      picker.querySelectorAll('[data-value]').forEach(function (option) {
        var selected = option.getAttribute('data-value') === currentChoice;
        option.setAttribute('aria-selected', String(selected));
        option.classList.toggle('is-selected', selected);
      });
    });
    if (footerStyleLabel) {
      footerStyleLabel.textContent = currentChoice === 'auto'
        ? styleMeta(currentStyle).label + '（自动）'
        : styleMeta(currentChoice).label;
    }
  }

  function applyStyle(choice, animate) {
    if (!isValidChoice(choice)) choice = 'editorial';
    var resolved = resolveChoice(choice);
    var changed = currentStyle !== resolved || currentChoice !== choice;
    currentChoice = choice;
    currentStyle = resolved;
    root.dataset.style = resolved;
    syncStyleUI();
    updateThemeColor();
    if (animate && changed) { flashStyleTransition(); announceStyle(choice); }
  }

  function chooseStyle(choice) {
    applyStyle(choice, true);
    try { localStorage.setItem(STYLE_KEY, choice); } catch (error) {}
  }

  function closePickers(except) {
    stylePickers.forEach(function (picker) {
      if (picker === except || !picker.classList.contains('is-open')) return;
      picker.classList.remove('is-open');
      var trigger = picker.querySelector('[data-style-trigger]');
      var menu = picker.querySelector('[data-style-menu]');
      if (trigger) { trigger.setAttribute('aria-expanded', 'false'); trigger.removeAttribute('aria-activedescendant'); }
      if (menu) menu.hidden = true;
    });
  }

  function setActiveOption(picker, index) {
    var options = picker.querySelectorAll('[data-value]');
    if (!options.length) return;
    var active = Math.max(0, Math.min(options.length - 1, index));
    options.forEach(function (option, i) { option.classList.toggle('is-active', i === active); });
    var trigger = picker.querySelector('[data-style-trigger]');
    if (trigger) trigger.setAttribute('aria-activedescendant', options[active].id);
    picker.dataset.activeIndex = String(active);
  }

  function openPicker(picker, focusIndex) {
    closePickers(picker);
    var trigger = picker.querySelector('[data-style-trigger]');
    var menu = picker.querySelector('[data-style-menu]');
    if (!trigger || !menu) return;
    menu.hidden = false;
    picker.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    var current = 0;
    menu.querySelectorAll('[data-value]').forEach(function (option, i) {
      if (option.getAttribute('data-value') === currentChoice) current = i;
    });
    setActiveOption(picker, typeof focusIndex === 'number' ? focusIndex : current);
  }

  function wirePicker(picker) {
    var trigger = picker.querySelector('[data-style-trigger]');
    var menu = picker.querySelector('[data-style-menu]');
    var select = picker.querySelector('[data-style-select]');
    var openKeys = { ArrowDown: 1, ArrowUp: 1, Enter: 1, ' ': 1, Spacebar: 1 };

    /* 原生 select 是无 JS 时的兜底；增强后仍保持值同步 */
    if (select) select.addEventListener('change', function () { chooseStyle(select.value); });

    trigger.addEventListener('click', function () {
      if (picker.classList.contains('is-open')) closePickers();
      else openPicker(picker);
    });

    /* 焦点始终留在 trigger 上，用 aria-activedescendant 指向高亮项 */
    trigger.addEventListener('keydown', function (event) {
      if (picker.classList.contains('is-open')) return;
      if (!openKeys[event.key]) return;
      event.preventDefault();
      event.stopPropagation();
      var count = menu.querySelectorAll('[data-value]').length;
      openPicker(picker, event.key === 'ArrowUp' ? count - 1 : undefined);
    });

    picker.addEventListener('keydown', function (event) {
      if (!picker.classList.contains('is-open')) return;
      var options = Array.prototype.slice.call(menu.querySelectorAll('[data-value]'));
      var idx = Number(picker.dataset.activeIndex || 0);
      var key = event.key;
      if (key === 'ArrowDown') { event.preventDefault(); setActiveOption(picker, idx + 1); }
      else if (key === 'ArrowUp') { event.preventDefault(); setActiveOption(picker, idx - 1); }
      else if (key === 'Home') { event.preventDefault(); setActiveOption(picker, 0); }
      else if (key === 'End') { event.preventDefault(); setActiveOption(picker, options.length - 1); }
      else if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
        event.preventDefault();
        chooseStyle(options[idx].getAttribute('data-value'));
        closePickers(); trigger.focus();
      } else if (key === 'Escape') { event.preventDefault(); closePickers(); trigger.focus(); }
      else if (key === 'Tab') closePickers();
    });

    menu.addEventListener('click', function (event) {
      var option = event.target.closest ? event.target.closest('[data-value]') : null;
      if (!option) return;
      chooseStyle(option.getAttribute('data-value'));
      closePickers();
      trigger.focus();
    });

    menu.addEventListener('mouseover', function (event) {
      var option = event.target.closest ? event.target.closest('[data-value]') : null;
      if (!option) return;
      var list = Array.prototype.slice.call(menu.querySelectorAll('[data-value]'));
      setActiveOption(picker, list.indexOf(option));
    });
  }

  function buildPicker(host, mobile, before) {
    var wrap = document.createElement('div');
    wrap.className = 'style-picker' + (mobile ? ' style-picker--mobile' : '');
    wrap.setAttribute('data-style-picker', '');
    menuSeq += 1;
    var uid = 'style-menu-' + menuSeq;
    var options = STYLES.map(function (item, i) {
      return '<li class="style-picker__option" role="option" id="' + uid + '-opt-' + i + '" data-value="' + item.id + '" aria-selected="false" tabindex="-1">'
        + '<span class="style-picker__swatch" aria-hidden="true" style="--sw-bg:' + item.swatch[0] + ';--sw-fg:' + item.swatch[1] + '"></span>'
        + '<span class="style-picker__text"><b>' + item.label + '</b><small>' + item.hint + '</small></span>'
        + '<span class="style-picker__check" aria-hidden="true">✓</span></li>';
    }).join('');
    var nativeOptions = STYLES.map(function (item) {
      return '<option value="' + item.id + '">' + item.label + '</option>';
    }).join('');
    wrap.innerHTML = '<label class="sr-only" for="' + uid + '-native">选择博客风格</label>'
      + '<select id="' + uid + '-native" data-style-select aria-label="选择博客风格">' + nativeOptions + '</select>'
      + '<button class="style-picker__trigger" type="button" data-style-trigger aria-haspopup="listbox" aria-expanded="false" aria-controls="' + uid + '">'
      + '<span class="style-picker__swatch" aria-hidden="true"></span>'
      + '<span class="style-picker__label">纸感手稿</span>'
      + '<span class="style-picker__caret" aria-hidden="true"></span></button>'
      + '<ul class="style-picker__menu" id="' + uid + '" data-style-menu role="listbox" aria-label="选择博客风格" hidden>' + options + '</ul>';
    wrap.classList.add('is-enhanced');
    if (before) host.insertBefore(wrap, before);
    else host.appendChild(wrap);
    stylePickers.push(wrap);
    wirePicker(wrap);
  }

  function ensureFooterStyle() {
    var bottom = document.querySelector('.footer-bottom');
    if (!bottom || bottom.querySelector('.footer-style')) return;
    var badge = document.createElement('span');
    badge.className = 'footer-style';
    badge.innerHTML = '风格：<b data-style-label>纸感手稿</b> · <button type="button" data-style-jump>切换</button>';
    bottom.insertBefore(badge, bottom.lastElementChild || null);
    footerStyleLabel = badge.querySelector('[data-style-label]');
    badge.querySelector('[data-style-jump]').addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      var target = null;
      if (window.innerWidth <= 900 && mobileMenu && menuToggle) {
        mobileMenu.classList.add('is-open');
        menuToggle.classList.add('is-open');
        menuToggle.setAttribute('aria-expanded', 'true');
        target = mobileMenu.querySelector('[data-style-trigger]');
      } else {
        target = document.querySelector('.header-actions [data-style-trigger]');
      }
      window.setTimeout(function () {
        if (!target) return;
        target.focus();
        var picker = target.closest && target.closest('[data-style-picker]');
        if (picker) openPicker(picker);
      }, 280);
    });
  }

  function ensureStyleUI() {
    if (!header) return;
    var actions = header.querySelector('.header-actions');
    var mobile = document.querySelector('[data-mobile-menu]');

    if (actions && !actions.querySelector('[data-style-picker]')) {
      buildPicker(actions, false, actions.querySelector('[data-theme-toggle]') || null);
    }
    if (mobile && !mobile.querySelector('[data-style-picker]')) {
      var row = document.createElement('div');
      row.className = 'mobile-style';
      row.innerHTML = '<span>风格 / STYLE</span>';
      mobile.appendChild(row);
      buildPicker(row, true, null);
    }

    if (!styleStatus) {
      styleStatus = document.createElement('span');
      styleStatus.className = 'sr-only';
      styleStatus.setAttribute('role', 'status');
      styleStatus.setAttribute('aria-live', 'polite');
      document.body.appendChild(styleStatus);
    }

    ensureFooterStyle();
    document.addEventListener('click', function (event) {
      if (!event.target.closest || !event.target.closest('[data-style-picker]')) closePickers();
    });
    syncStyleUI();
  }

  function styleFromUrl() {
    try {
      var value = new URLSearchParams(window.location.search).get('style');
      return value && isValidChoice(value) ? value : null;
    } catch (error) { return null; }
  }

  ensureSearchUI();
  ensureStyleUI();
  ensureSearchUI();
  ensureStyleUI();

  function setTheme(mode) {
    currentMode = mode;
    var theme = resolveTheme(mode);
    root.dataset.theme = theme;
    if (themeIcon) themeIcon.textContent = mode === 'system' ? '◐' : theme === 'dark' ? '☾' : '☼';
    if (themeToggle) {
      var label = mode === 'light' ? '当前浅色模式，点击切换深色模式'
        : mode === 'dark' ? '当前深色模式，点击切换为跟随系统'
        : '跟随系统，当前' + (theme === 'dark' ? '深色' : '浅色') + '，点击切换浅色模式';
      themeToggle.setAttribute('aria-label', label);
      themeToggle.title = label;
      themeToggle.removeAttribute('aria-pressed');
    }
    updateThemeColor();
    try { localStorage.setItem('z-blog-theme', mode); } catch (error) {}
  }

  var urlStyle = styleFromUrl();
  var savedStyle = null;
  try { savedStyle = localStorage.getItem(STYLE_KEY); } catch (error) {}
  var initialChoice = isValidChoice(urlStyle) ? urlStyle
    : isValidChoice(savedStyle) ? savedStyle : 'editorial';
  applyStyle(initialChoice, false);

  /* ?style=tech&theme=dark 这类链接可分享特定外观：应用、记住，随后清掉参数，
     避免之后刷新时反复覆盖用户自己的选择。?style=auto 同样可分享。 */
  var urlTheme = null;
  try { urlTheme = new URLSearchParams(window.location.search).get('theme'); } catch (error) {}
  var forcedTheme = themeOrder.indexOf(urlTheme) !== -1 ? urlTheme : null;

  if (urlStyle || forcedTheme) {
    if (urlStyle) { try { localStorage.setItem(STYLE_KEY, urlStyle); } catch (error) {} }
    try {
      var cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('style');
      cleanUrl.searchParams.delete('theme');
      window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
    } catch (error) {}
  }

  var savedMode = null;
  try { savedMode = localStorage.getItem('z-blog-theme'); } catch (error) {}
  if (forcedTheme) setTheme(forcedTheme);
  else if (themeOrder.indexOf(savedMode) !== -1) setTheme(savedMode);
  else setTheme('system');

  /* 自动模式：整点或页面重新可见时重算；自动变化静默进行，不弹播报打扰阅读 */
  function autoRecheck() {
    if (currentChoice !== 'auto') return;
    if (resolveChoice('auto') !== currentStyle) applyStyle('auto', false);
  }
  document.addEventListener('visibilitychange', autoRecheck);
  window.setInterval(autoRecheck, 60000);
  if (highContrast) {
    var onContrastChange = function () { autoRecheck(); };
    if (highContrast.addEventListener) highContrast.addEventListener('change', onContrastChange);
    else if (highContrast.addListener) highContrast.addListener(onContrastChange);
  }

  if (themeToggle) themeToggle.addEventListener('click', function () {
    setTheme(themeOrder[(themeOrder.indexOf(currentMode) + 1) % themeOrder.length]);
  });

  if (systemDark) {
    var onSystemChange = function () { if (currentMode === 'system') setTheme('system'); };
    if (systemDark.addEventListener) systemDark.addEventListener('change', onSystemChange);
    else if (systemDark.addListener) systemDark.addListener(onSystemChange);
  }

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
      closePickers();
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

  var tocLinks = document.querySelectorAll('.article-aside a[href^="#"]');
  var tocSections = Array.prototype.map.call(tocLinks, function (link) {
    return document.querySelector(link.getAttribute('href'));
  }).filter(Boolean);
  function setActiveToc(sectionId) {
    tocLinks.forEach(function (link) {
      var active = link.getAttribute('href') === '#' + sectionId;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  if (tocSections.length) {
    setActiveToc(tocSections[0].id);
    if ('IntersectionObserver' in window) {
      var tocObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActiveToc(entry.target.id);
        });
      }, { rootMargin: '-18% 0px -68% 0px', threshold: 0 });
      tocSections.forEach(function (section) { tocObserver.observe(section); });
    }
  }

  var filterButtons = document.querySelectorAll('[data-filter]');
  var noteCards = document.querySelectorAll('[data-category]');
  var cardSearchIndex = Array.prototype.map.call(noteCards, function (card) {
    return {
      href: card.getAttribute('href'),
      title: (card.querySelector('h3') || {}).textContent || '',
      description: (card.querySelector('p') || {}).textContent || '',
      category: card.dataset.category || '',
      categoryLabel: card.dataset.category || ''
    };
  });
  var searchIndex = Array.isArray(window.blogSearchIndex) && window.blogSearchIndex.length ? window.blogSearchIndex : cardSearchIndex;

  function renderSearchResults(value) {
    if (!searchResults) return;
    var query = value.trim().toLowerCase();
    searchResults.innerHTML = '';
    if (!query) return;
    var matches = searchIndex.filter(function (item) {
      return (item.title + ' ' + item.description + ' ' + item.category + ' ' + (item.content || '') + ' ' + (item.keywords || '')).toLowerCase().indexOf(query) !== -1;
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
      category.textContent = item.categoryLabel || item.category;
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

/* ==========================================================================
   点击 +1 飘字：每次点击都在指针处生成一枚独立飘字，随后缓缓上浮淡出。
   - 纯装饰层不接收指针事件，链接/按钮/下拉等交互完全不受影响；
   - 不做节流，连点几次就同时出现几枚；动画结束即移除节点；
   - 拖拽选字、长按、右键、修饰键点击、输入控件内点击均不触发。
   ========================================================================== */
(function () {
  if (!window.PointerEvent) return;

  var MAX_ON_SCREEN = 40;
  var layer = null;
  var active = [];
  var down = null;

  function ensureLayer() {
    if (layer && layer.isConnected) return layer;
    layer = document.createElement('div');
    layer.className = 'click-pop-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    return layer;
  }

  function spawn(x, y) {
    var host = ensureLayer();
    var el = document.createElement('span');
    el.className = 'click-pop';
    el.textContent = '+1';
    /* 轻微随机，让连点时几枚飘字不会呆板地叠在一起 */
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.setProperty('--pop-dx', ((Math.random() * 2 - 1) * 26).toFixed(1) + 'px');
    el.style.setProperty('--pop-rot', ((Math.random() * 2 - 1) * 9).toFixed(1) + 'deg');
    el.style.setProperty('--pop-scale', (0.9 + Math.random() * 0.28).toFixed(2));
    host.appendChild(el);
    active.push(el);
    if (active.length > MAX_ON_SCREEN) {
      var oldest = active.shift();
      if (oldest) oldest.remove();
    }

    var done = false;
    function remove() {
      if (done) return;
      done = true;
      el.remove();
      var i = active.indexOf(el);
      if (i !== -1) active.splice(i, 1);
    }
    el.addEventListener('animationend', remove, { once: true });
    /* 兜底：标签页切后台导致动画被暂停时，仍能保证节点被回收 */
    window.setTimeout(remove, 1800);
  }

  function isFormControl(node) {
    return !!(node && node.closest && node.closest('input, textarea, select, [contenteditable]'));
  }

  function init() {
    document.addEventListener('pointerdown', function (event) {
      down = null;
      if (event.button !== 0 || event.isPrimary === false) return;
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (isFormControl(event.target)) return;
      down = { x: event.clientX, y: event.clientY, at: Date.now(), id: event.pointerId };
    }, { passive: true });

    document.addEventListener('pointerup', function (event) {
      var start = down;
      down = null;
      if (!start || event.pointerId !== start.id) return;
      if (Date.now() - start.at > 700) return;                 /* 长按不算点击 */
      if (Math.abs(event.clientX - start.x) > 10 || Math.abs(event.clientY - start.y) > 10) return; /* 拖拽/选字 */
      spawn(event.clientX, event.clientY);
    }, { passive: true });

    document.addEventListener('pointercancel', function () { down = null; }, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
