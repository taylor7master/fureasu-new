!(function($) {
  "use strict";

  let vh = window.innerHeight * 0.01;
  let vw = window.innerWidth * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  document.documentElement.style.setProperty('--vw', `${vw}px`);

  $(window).on('resize', function() {
    vh = window.innerHeight * 0.01;
    vw = window.innerWidth * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    document.documentElement.style.setProperty('--vw', `${vw}px`);
  });

  // Toggle .header-scrolled
  $(window).scroll(function() {
    if ($(this).scrollTop() > 100) {
      $('#header').addClass('header-scrolled');
    } else {
      $('#header').removeClass('header-scrolled');
    }
  });

  if ($(window).scrollTop() > 100) {
    $('#header').addClass('header-scrolled');
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function getScrollOffset() {
    var $bar = $('.hd').length ? $('.hd') : $('#header');
    return $bar.outerHeight() || 80;
  }

  function smoothScrollTo(top, durationSec) {
    durationSec = typeof durationSec === 'number' ? durationSec : 1.2;
    if (window.lenis && typeof window.lenis.scrollTo === 'function') {
      window.lenis.scrollTo(top, {
        duration: durationSec,
        lock: true
      });
      return;
    }
    $('html, body').animate({
      scrollTop: top
    }, Math.round(durationSec * 1000), 'swing');
  }

  // Smooth scroll (Lenis + in-page anchors)
  var scrolltoOffset = getScrollOffset();
  var sidebarIndexLock = 0;

  function isSidebarIndexSp() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function syncSidebarIndex() {
    var $side = $('.page-sidebar');
    var $links = $side.find('.sidebar-indexs .index-link');
    if (!$links.length || $side.hasClass('is-open') || Date.now() < sidebarIndexLock) {
      return;
    }
    var line = getScrollOffset() + 24;
    var current = $links.filter('.active').get(0) || $links.get(0);
    $links.each(function() {
      var section = this.hash ? document.querySelector(this.hash) : null;
      if (section && section.getBoundingClientRect().top <= line) {
        current = this;
      }
    });
    if (!$(current).hasClass('active')) {
      $links.removeClass('active');
      $(current).addClass('active');
    }
  }

  $(document).on('click', 'a.link, .scrollto, .nav-menu a, .mobile-nav-menu a, .footer-menu a, .ft a', function(e) {
    if ($(this).closest('.sidebar-indexs').length) {
      var $side = $(this).closest('.page-sidebar');
      if (isSidebarIndexSp() && (!$side.hasClass('is-open') || $(this).hasClass('active'))) {
        e.preventDefault();
        $side.toggleClass('is-open');
        return;
      }
      $side.find('.index-link').removeClass('active');
      $(this).addClass('active');
      $side.removeClass('is-open');
      sidebarIndexLock = Date.now() + 1400;
    }
    if (!this.hash || this.hash === '#') {
      return;
    }
    if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
      var target = $(this.hash);
      if (target.length) {
        e.preventDefault();
        scrolltoOffset = getScrollOffset();
        var scrollto = target.offset().top - scrolltoOffset;

        if ($(this).attr("href") == '#header') {
          scrollto = 0;
        }

        if ($(this).hasClass('menu-link')) {
          $('.nav-menu .menu-link, .mobile-nav-menu .menu-link').removeClass('active');
          $(this).addClass('active');
        }

        smoothScrollTo(scrollto, 1.2);

        if ($('body').hasClass('mobile-nav-active')) {
          $('body').removeClass('mobile-nav-active');
          $('.mobile-nav-toggle').toggleClass('toggle-active');
          $('.mobile-nav-overly').fadeOut();
          if (window.lenis) {
            window.lenis.start();
          }
        }

        return false;
      }
    }
  });

  var hashScrollMode = '';

  function scrollToLocationHash() {
    if (document.readyState !== 'complete') {
      return;
    }
    var hash = window.__pendingHash || window.location.hash;
    if (!hash || hash === '#') {
      return;
    }
    var $target;
    try {
      $target = $(hash);
    } catch (err) {
      return;
    }
    if (!$target.length) {
      window.__hashScrollStarted = true;
      return;
    }
    var useLenis = window.lenis && typeof window.lenis.scrollTo === 'function';
    var mode = useLenis ? 'lenis' : 'native';
    if (hashScrollMode === 'lenis' || hashScrollMode === mode) {
      return;
    }
    hashScrollMode = mode;
    window.__hashScrollStarted = true;
    if (window.__pendingHash) {
      history.replaceState(null, '', location.pathname + location.search + hash);
      window.__pendingHash = '';
    }
    var top = Math.max(0, $target.offset().top - getScrollOffset());
    var finish = function() {
      if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
    };
    if (useLenis) {
      window.lenis.scrollTo(0, { immediate: true, force: true });
      requestAnimationFrame(function() {
        window.lenis.scrollTo(top, {
          duration: 1.2,
          lerp: null,
          force: true,
          onComplete: finish
        });
      });
      return;
    }
    window.scrollTo(0, 0);
    $('html, body').stop(true).animate({ scrollTop: top }, 1200, finish);
  }

  window.addEventListener('load', scrollToLocationHash);
  if (document.readyState === 'complete') {
    scrollToLocationHash();
  }

  // Mobile Navigation（採用サイト由来の .hd があるときはそちらを使う）
  if (!$('.hd').length) {
  $('body').prepend('<button type="button" class="mobile-nav-toggle" aria-label="メニュー"><span class="toggle-icon"><span></span><span></span><span></span></span></button>');
  $('body').prepend('<div class="mobile-switch-bar"><i class="switch-icon eye-on"></i><button type="button" class="switch-color-btn" aria-pressed="false">モノクロモード <em>OFF</em></button></div>');
  $('body').append('<div class="mobile-nav-overly"></div>');

  $(document).on('click', '.mobile-nav-toggle', function(e) {
    $('body').toggleClass('mobile-nav-active');
    $('.mobile-nav-toggle').toggleClass('toggle-active');
    $('.mobile-nav-overly').toggle();
    if (window.lenis) {
      if ($('body').hasClass('mobile-nav-active')) {
        window.lenis.stop();
      } else {
        window.lenis.start();
      }
    }
  });

  $(document).click(function(e) {
    var container = $("#mobile-nav, .mobile-nav-toggle");
    if (!container.is(e.target) && container.has(e.target).length === 0) {
      if ($('body').hasClass('mobile-nav-active')) {
        $('body').removeClass('mobile-nav-active');
        $('.mobile-nav-toggle').toggleClass('toggle-active');
        $('.mobile-nav-overly').fadeOut();
        if (window.lenis) {
          window.lenis.start();
        }
      }
    }
  });
  }

  function closeMobileNav() {
    $('body').removeClass('mobile-nav-active');
    $('.mobile-nav-toggle').removeClass('toggle-active');
    $('.mobile-nav-overly').fadeOut();
    if (window.lenis) {
      window.lenis.start();
    }
  }

  $(document).on('click', '.mobile-nav-menu .dropdown > a', function(e) {
    e.preventDefault();
    $(this).next().slideToggle(300);
    $(this).parent().toggleClass('active');
  });

  $(document).on('keydown', function(e) {
    if (e.key === 'Escape' && $('body').hasClass('mobile-nav-active')) {
      closeMobileNav();
    }
  });

  // Lenis smooth scroll (tojiro.net / Luxy-like inertia)
  function initLenis() {
    if (reduceMotion || typeof Lenis === 'undefined') {
      scrollToLocationHash();
      return;
    }

    var lenis = new Lenis({
      duration: 1.4,
      easing: function(t) {
        return Math.min(1, 1.001 - Math.pow(2, -10 * t));
      },
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.4,
      infinite: false
    });

    window.lenis = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    scrollToLocationHash();
  }

  function loadLenis(callback) {
    if (typeof Lenis !== 'undefined') {
      callback();
      return;
    }
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.min.js';
    script.async = true;
    script.onload = callback;
    script.onerror = scrollToLocationHash;
    document.head.appendChild(script);
  }

  loadLenis(initLenis);

  // Custom mouse (dream-lab.work)
  function initMouse() {
    if (reduceMotion || !isFinePointer || window.innerWidth <= 768) {
      return;
    }

    if (!$('.js-mouse').length) {
      $('body').append('<div id="mouseBall" class="js-mouse"><div class="js-mouse__ball"></div></div>');
    }

    var $ball = $('.js-mouse__ball');
    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    var ballX = mouseX;
    var ballY = mouseY;
    var speed = 0.18;

    $(window).on('mousemove.fureasuMouse', function(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      $('.js-mouse').removeClass('is-out');
    });

    $(document).on('mouseleave.fureasuMouse', function() {
      $('.js-mouse').addClass('is-out');
    }).on('mouseenter.fureasuMouse', function() {
      $('.js-mouse').removeClass('is-out');
    });

    $(document).on('mouseenter.fureasuMouse', 'a, button, .link-btn, .action-btn, .js-hover, input, textarea, select, .swiper-pagination-bullet, .mobile-nav-toggle', function() {
      $ball.addClass('is-hover');
    }).on('mouseleave.fureasuMouse', 'a, button, .link-btn, .action-btn, .js-hover, input, textarea, select, .swiper-pagination-bullet, .mobile-nav-toggle', function() {
      $ball.removeClass('is-hover');
    });

    function tick() {
      ballX += (mouseX - ballX) * speed;
      ballY += (mouseY - ballY) * speed;
      $ball.css('transform', 'translate3d(' + ballX + 'px, ' + ballY + 'px, 0)');
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  initMouse();

  // Image cover reveal (daiwajyutaku.com)
  function initScrtCover() {
    var targets = document.querySelectorAll('.scrt-cover');
    if (!targets.length) {
      return;
    }

    function revealCover(el) {
      if (!el || el.classList.contains('visible')) {
        return true;
      }
      el.classList.add('visible');
      return true;
    }

    function shouldReveal(el) {
      var rect = el.getBoundingClientRect();
      if (rect.height <= 0) {
        return false;
      }
      return rect.top < window.innerHeight * 0.92;
    }

    function checkCovers() {
      Array.prototype.forEach.call(targets, function(el) {
        if (!el.classList.contains('visible') && shouldReveal(el)) {
          revealCover(el);
        }
      });
    }

    if (reduceMotion) {
      Array.prototype.forEach.call(targets, revealCover);
      return;
    }

    if (typeof IntersectionObserver !== 'undefined') {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            revealCover(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.12,
        rootMargin: '0px 0px -6% 0px'
      });

      Array.prototype.forEach.call(targets, function(el) {
        observer.observe(el);
        var img = el.querySelector('img');
        if (img) {
          if (img.complete) {
            if (shouldReveal(el)) {
              revealCover(el);
            }
          } else {
            img.addEventListener('load', function() {
              if (shouldReveal(el)) {
                revealCover(el);
              }
            }, { once: true });
          }
        }
      });
    }

    $(window).on('scroll.scrtCover resize.scrtCover', checkCovers);
    checkCovers();
  }

  initScrtCover();

  var monoKey = 'fureasuMono';

  function setMonoMode(on) {
    document.documentElement.classList.toggle('is-mono', on);
    $('.switch-color-btn')
      .toggleClass('is-active', on)
      .attr('aria-pressed', on ? 'true' : 'false')
      .find('em')
      .text(on ? 'ON' : 'OFF');
    try {
      localStorage.setItem(monoKey, on ? '1' : '0');
    } catch (e) {}
  }

  if ($('.switch-color-btn').length) {
  setMonoMode(document.documentElement.classList.contains('is-mono'));

  $(document).on('click', '.switch-color-btn', function() {
    setMonoMode(!document.documentElement.classList.contains('is-mono'));
  });
  }

  $(document).on('click', '.category-indexs .index-link', function(e) {
    if (!isSidebarIndexSp()) {
      return;
    }
    var $box = $(this).closest('.category-indexs');
    if (!$box.hasClass('is-open') || $(this).hasClass('active')) {
      e.preventDefault();
      $box.toggleClass('is-open');
      return;
    }
    $box.find('.index-link').removeClass('active');
    $(this).addClass('active');
    $box.removeClass('is-open');
    if (!this.hash || this.hash === '#') {
      if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
        e.preventDefault();
      }
    }
  });

  $(document).on('click', '.page-ir-highlight .hl-tabs .tab', function() {
    var $tab = $(this);
    var panel = $tab.attr('data-panel');
    var $root = $tab.closest('.page-ir-highlight');
    $root.find('.hl-tabs .tab').removeClass('is-active');
    $tab.addClass('is-active');
    $root.find('.hl-panel').removeClass('is-active');
    $root.find('.hl-panel[data-panel="' + panel + '"]').addClass('is-active');
  });

  function applyLibraryFilter($root) {
    var filter = $root.find('.lib-tabs .tab.is-active').attr('data-filter') || 'all';
    var year = $root.find('.lib-bar .year select').val();
    $root.find('.news-list > li').each(function() {
      var kind = $(this).attr('data-kind');
      var itemYear = $(this).attr('data-year');
      var matchKind = filter === 'all' || kind === filter;
      var matchYear = itemYear === year;
      $(this).toggle(matchKind && matchYear);
    });
  }

  $(document).on('click', '.page-ir-library .lib-tabs .tab', function() {
    var $tab = $(this);
    var $root = $tab.closest('.page-ir-library');
    $root.find('.lib-tabs .tab').removeClass('is-active');
    $tab.addClass('is-active');
    $root.find('.lib-bar .label').text($.trim($tab.text()));
    applyLibraryFilter($root);
  });

  $(document).on('change', '.page-ir-library .lib-bar .year select', function() {
    applyLibraryFilter($(this).closest('.page-ir-library'));
  });

  $('.page-ir-library').each(function() {
    applyLibraryFilter($(this));
  });

  function movieYearUrl(year) {
    var url = window.location.pathname;
    if (year) {
      url += '?year=' + encodeURIComponent(year);
    }
    return url;
  }

  $('.page-ir-movie select[name="year"]').each(function() {
    var year = new URLSearchParams(window.location.search).get('year');
    if (year) {
      $(this).val(year);
    }
  });

  $(document).on('change', '.page-ir-movie select[name="year"]', function() {
    window.location.href = movieYearUrl($(this).val());
  });

  function closeIrSidebarMenu() {
    $('.ir-sidebar-menu').removeClass('is-open').find('.menu-head').attr('aria-expanded', 'false');
  }

  $(document).on('click', '.ir-sidebar-menu .menu-head', function(e) {
    if (!isSidebarIndexSp()) {
      return;
    }
    e.preventDefault();
    var $menu = $(this).closest('.ir-sidebar-menu');
    var open = !$menu.hasClass('is-open');
    closeIrSidebarMenu();
    $menu.toggleClass('is-open', open);
    $(this).attr('aria-expanded', open ? 'true' : 'false');
  });

  $(document).on('click', function(e) {
    if (!$(e.target).closest('.page-sidebar').length) {
      $('.page-sidebar').removeClass('is-open');
    }
    if (!$(e.target).closest('.category-indexs').length) {
      $('.category-indexs').removeClass('is-open');
    }
    if (!$(e.target).closest('.ir-sidebar-menu').length) {
      closeIrSidebarMenu();
    }
  });

  $(window).on('scroll resize', function() {
    if (!isSidebarIndexSp()) {
      $('.page-sidebar, .category-indexs').removeClass('is-open');
      closeIrSidebarMenu();
    }
    syncSidebarIndex();
  });

  syncSidebarIndex();

})(jQuery);
