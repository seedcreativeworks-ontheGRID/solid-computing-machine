/* ==========================================================================
   MAREN VOSS — PORTFOLIO INTERACTION LAYER
   Theme persistence, nav behavior, scroll reveal, TOC tracking.
   No external dependencies. Respects prefers-reduced-motion throughout.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* ---------- Theme ---------- */
  var THEME_KEY = 'mv-theme';
  var toggle = document.querySelector('[data-theme-toggle]');

  function getStoredTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function setStoredTheme(t) {
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  }
  function applyTheme(t) {
    if (t === 'dark' || t === 'light') {
      root.setAttribute('data-theme', t);
    } else {
      root.removeAttribute('data-theme');
    }
    if (toggle) {
      var isDark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
      toggle.setAttribute('aria-pressed', String(isDark));
    }
  }

  applyTheme(getStoredTheme());

  if (toggle) {
    toggle.addEventListener('click', function () {
      var current = root.getAttribute('data-theme');
      var isDark = current === 'dark' || (!current && window.matchMedia('(prefers-color-scheme: dark)').matches);
      var next = isDark ? 'light' : 'dark';
      applyTheme(next);
      setStoredTheme(next);
    });
  }

  /* ---------- Nav: scroll state, hide-on-scroll-down, progress ---------- */
  var nav = document.querySelector('.site-nav');
  var progressBar = document.querySelector('[data-nav-progress]');
  var lastY = window.scrollY;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    if (nav) {
      nav.classList.toggle('is-scrolled', y > 8);
      if (y > lastY && y > 160) {
        nav.classList.add('is-hidden');
      } else {
        nav.classList.remove('is-hidden');
      }
    }
    if (progressBar) {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docH > 0 ? Math.min(100, (y / docH) * 100) : 0;
      progressBar.style.width = pct + '%';
    }
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var navToggle = document.querySelector('[data-nav-toggle]');
  var mobilePanel = document.querySelector('[data-mobile-panel]');

  function closeMobile() {
    if (!mobilePanel) return;
    mobilePanel.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
  }
  function openMobile() {
    mobilePanel.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
  }
  if (navToggle && mobilePanel) {
    navToggle.addEventListener('click', function () {
      var expanded = navToggle.getAttribute('aria-expanded') === 'true';
      expanded ? closeMobile() : openMobile();
    });
    mobilePanel.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMobile);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMobile();
    });
  }

  /* ---------- Active nav link on scroll (index page) ---------- */
  var sections = document.querySelectorAll('main [id]');
  var navLinks = document.querySelectorAll('.nav-links a[href^="#"], .mobile-panel a[href^="#"]');
  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.getAttribute('id');
          navLinks.forEach(function (link) {
            var match = link.getAttribute('href') === '#' + id;
            link.toggleAttribute('aria-current', match);
            if (match) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
          });
        }
      });
    }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { navObserver.observe(s); });
  }

  /* ---------- Scroll reveal ----------
     Only opt into the animated (opacity:0-until-visible) presentation once
     we've confirmed IntersectionObserver exists and motion isn't reduced.
     Content is fully visible by default otherwise — see .js-reveal gate in CSS. */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length && 'IntersectionObserver' in window && !reduceMotion) {
    root.classList.add('js-reveal');
    var counters = new WeakMap();
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var group = el.closest('[data-reveal-group]');
          if (group) {
            var count = counters.get(group) || 0;
            el.style.setProperty('--i', count);
            counters.set(group, count + 1);
          }
          el.classList.add('is-visible');
          revealObserver.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- Case study TOC scrollspy ---------- */
  var tocLinks = document.querySelectorAll('.cs-toc a');
  var csBlocks = document.querySelectorAll('.cs-block[id]');
  if (tocLinks.length && csBlocks.length && 'IntersectionObserver' in window) {
    var tocObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.getAttribute('id');
          tocLinks.forEach(function (l) {
            l.classList.toggle('is-active', l.getAttribute('href') === '#' + id);
          });
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });
    csBlocks.forEach(function (b) { tocObserver.observe(b); });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Magnetic buttons (subtle, desktop only, motion-respecting) ---------- */
  if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('[data-magnetic]').forEach(function (btn) {
      var strength = 10;
      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = 'translate(' + (x / rect.width) * strength + 'px,' + (y / rect.height) * strength + 'px)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = '';
      });
    });
  }

  /* ---------- Contact form (mailto handoff — static site, no backend) ---------- */
  var contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = contactForm.querySelector('#cf-name').value.trim();
      var email = contactForm.querySelector('#cf-email').value.trim();
      var message = contactForm.querySelector('#cf-message').value.trim();
      var subject = 'Portfolio inquiry from ' + (name || 'website visitor');
      var body = message + (email ? '\n\n— ' + name + ' (' + email + ')' : '\n\n— ' + name);
      var href = 'mailto:muhammadshahid@moandco.org?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      window.location.href = href;
    });
  }

  /* ---------- Smooth-scroll with header offset for in-page anchors ---------- */
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      var navH = nav ? nav.offsetHeight : 0;
      var top = target.getBoundingClientRect().top + window.scrollY - navH - 16;
      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
      history.pushState(null, '', '#' + id);
    });
  });
})();
