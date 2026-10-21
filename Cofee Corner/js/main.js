
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------------------- */
  /* Navbar: solid state on scroll                                            */
  /* ----------------------------------------------------------------------- */
  function initNavScroll() {
    var nav = document.querySelector(".site-nav");
    if (!nav) return;
    var onScroll = function () {
      nav.classList.toggle("scrolled", window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ----------------------------------------------------------------------- */
  /* Mobile menu: close on link click (Bootstrap collapse drives open/close)  */
  /* ----------------------------------------------------------------------- */
  function initMobileMenu() {
    var collapse = document.getElementById("navMenu");
    if (!collapse) return;
    collapse.querySelectorAll("a.nav-link").forEach(function (link) {
      link.addEventListener("click", function () {
        if (collapse.classList.contains("show") && window.bootstrap) {
          var inst = window.bootstrap.Collapse.getInstance(collapse);
          if (inst) inst.hide();
        }
      });
    });
  }

  /* ----------------------------------------------------------------------- */
  /* Scroll-reveal via IntersectionObserver                                   */
  /* ----------------------------------------------------------------------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------------- */
  /* Count-up numbers                                                         */
  /* ----------------------------------------------------------------------- */
  function initCountUp() {
    var nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;
    var run = function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var decimals = (el.getAttribute("data-count").split(".")[1] || "").length;
      var suffix = el.getAttribute("data-suffix") || "";
      var prefix = el.getAttribute("data-prefix") || "";
      if (reduceMotion) { el.textContent = prefix + target.toFixed(decimals) + suffix; return; }
      var dur = 1400, start = null;
      var step = function (ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = prefix + target.toFixed(decimals) + suffix;
      };
      requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) { nums.forEach(run); return; }
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); obs.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    nums.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------------- */
  /* Bag / cart — localStorage-backed, offcanvas UI                           */
  /* ----------------------------------------------------------------------- */
  var Bag = (function () {
    var KEY = "roast_bag_v1";
    var items = load();

    function load() {
      try { return JSON.parse(localStorage.getItem(KEY)) || []; }
      catch (e) { return []; }
    }
    function save() {
      try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
    }
    function count() { return items.reduce(function (n, i) { return n + i.qty; }, 0); }
    function total() { return items.reduce(function (s, i) { return s + i.price * i.qty; }, 0); }
    function add(product) {
      var found = items.filter(function (i) { return i.id === product.id; })[0];
      if (found) found.qty += 1;
      else items.push({ id: product.id, name: product.name, price: product.price, img: product.img, meta: product.meta || "", qty: 1 });
      save();
    }
    function remove(id) {
      items = items.filter(function (i) { return i.id !== id; });
      save();
    }
    return {
      items: function () { return items; },
      count: count, total: total, add: add, remove: remove
    };
  })();

  function money(n) { return "₱" + n.toFixed(2); }

  function initBag() {
    var countEls = document.querySelectorAll("[data-bag-count]");
    var bagBtns = document.querySelectorAll(".bag-btn");
    var linesEl = document.querySelector("[data-bag-lines]");
    var totalEl = document.querySelector("[data-bag-total]");
    var checkoutBtn = document.querySelector("[data-bag-checkout]");

    function renderBadge(bump) {
      var c = Bag.count();
      countEls.forEach(function (el) {
        el.textContent = c;
        el.style.display = c > 0 ? "" : "";
      });
      if (bump) {
        bagBtns.forEach(function (b) {
          b.classList.remove("bump");
          void b.offsetWidth;
          b.classList.add("bump");
        });
      }
    }

    function renderLines() {
      if (!linesEl) return;
      var list = Bag.items();
      if (!list.length) {
        linesEl.innerHTML = '<p class="empty-bag">Your bag is empty. Add a bag of freshly roasted beans to get started.</p>';
      } else {
        linesEl.innerHTML = list.map(function (i) {
          return '' +
            '<div class="cart-line">' +
              '<img src="' + i.img + '" alt="" width="46" height="46">' +
              '<div>' +
                '<div class="cl-name">' + i.name + '</div>' +
                '<div class="cl-meta">' + (i.meta ? i.meta + ' · ' : '') + 'Qty ' + i.qty + '</div>' +
              '</div>' +
              '<span class="cl-price">' + money(i.price * i.qty) + '</span>' +
              '<button class="cart-remove" type="button" data-remove="' + i.id + '" aria-label="Remove ' + i.name + ' from bag">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
              '</button>' +
            '</div>';
        }).join("");
      }
      if (totalEl) totalEl.textContent = money(Bag.total());
      if (checkoutBtn) checkoutBtn.toggleAttribute("disabled", !list.length);
    }

    // Add-to-bag buttons
    document.querySelectorAll("[data-add-bag]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var product = {
          id: btn.getAttribute("data-id"),
          name: btn.getAttribute("data-name"),
          price: parseFloat(btn.getAttribute("data-price")),
          img: btn.getAttribute("data-img"),
          meta: btn.getAttribute("data-meta") || ""
        };
        Bag.add(product);
        renderBadge(true);
        renderLines();
        var original = btn.getAttribute("data-label") || btn.textContent.trim();
        btn.classList.add("added");
        btn.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Added';
        showToast(product.name, "Added to your bag");
        setTimeout(function () {
          btn.classList.remove("added");
          btn.innerHTML = original;
        }, 1400);
      });
    });

    // Remove (delegated)
    if (linesEl) {
      linesEl.addEventListener("click", function (e) {
        var rm = e.target.closest("[data-remove]");
        if (!rm) return;
        Bag.remove(rm.getAttribute("data-remove"));
        renderBadge(false);
        renderLines();
      });
    }

    renderBadge(false);
    renderLines();
  }

  /* ----------------------------------------------------------------------- */
  /* Toast                                                                    */
  /* ----------------------------------------------------------------------- */
  var toastTimer;
  function showToast(title, sub) {
    var el = document.getElementById("roastToast");
    if (!el) return;
    el.querySelector(".tn-title").textContent = title;
    el.querySelector(".tn-sub").textContent = sub;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2600);
  }

  /* ----------------------------------------------------------------------- */
  /* Shop filters (menu page bean grid)                                       */
  /* ----------------------------------------------------------------------- */
  function initShopFilters() {
    var chips = document.querySelectorAll(".filter-chip");
    var cards = document.querySelectorAll("[data-roast]");
    if (!chips.length || !cards.length) return;
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) { c.classList.remove("active"); c.setAttribute("aria-pressed", "false"); });
        chip.classList.add("active");
        chip.setAttribute("aria-pressed", "true");
        var f = chip.getAttribute("data-filter");
        cards.forEach(function (card) {
          var match = f === "all" || card.getAttribute("data-roast") === f;
          var col = card.closest("[data-filter-col]") || card;
          col.style.display = match ? "" : "none";
        });
      });
    });
  }

  /* ----------------------------------------------------------------------- */
  /* Lightbox gallery                                                         */
  /* ----------------------------------------------------------------------- */
  function initLightbox() {
    var triggers = document.querySelectorAll("[data-lightbox]");
    var box = document.getElementById("lightbox");
    if (!triggers.length || !box) return;
    var imgEl = box.querySelector("img");
    var sources = [];
    triggers.forEach(function (t) { sources.push({ src: t.getAttribute("data-lightbox"), alt: t.getAttribute("data-alt") || "" }); });
    var current = 0;
    var lastFocused = null;

    function open(i) {
      current = i;
      show();
      lastFocused = document.activeElement;
      box.classList.add("open");
      box.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      box.querySelector(".lightbox-close").focus();
    }
    function close() {
      box.classList.remove("open");
      box.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocused) lastFocused.focus();
    }
    function show() {
      imgEl.src = sources[current].src;
      imgEl.alt = sources[current].alt;
    }
    function nav(dir) {
      current = (current + dir + sources.length) % sources.length;
      show();
    }

    triggers.forEach(function (t, i) {
      t.addEventListener("click", function (e) { e.preventDefault(); open(i); });
    });
    box.querySelector(".lightbox-close").addEventListener("click", close);
    box.querySelector(".lightbox-nav.prev").addEventListener("click", function () { nav(-1); });
    box.querySelector(".lightbox-nav.next").addEventListener("click", function () { nav(1); });
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") nav(-1);
      else if (e.key === "ArrowRight") nav(1);
    });
  }

  /* ----------------------------------------------------------------------- */
  /* Newsletter validation                                                    */
  /* ----------------------------------------------------------------------- */
  function initNewsletter() {
    var forms = document.querySelectorAll("[data-newsletter]");
    if (!forms.length) return;
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+₱/;
    forms.forEach(function (form) {
      var input = form.querySelector('input[type="email"]');
      var msg = form.querySelector(".news-msg");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var val = (input.value || "").trim();
        if (!re.test(val)) {
          input.classList.add("field-error");
          input.setAttribute("aria-invalid", "true");
          if (msg) { msg.className = "news-msg err"; msg.textContent = "Please enter a valid email address."; }
          input.focus();
          return;
        }
        input.classList.remove("field-error");
        input.removeAttribute("aria-invalid");
        if (msg) { msg.className = "news-msg ok"; msg.textContent = "Welcome to the Roast Club — check your inbox for a first-order treat."; }
        form.reset();
      });
      input.addEventListener("input", function () {
        input.classList.remove("field-error");
        if (msg && msg.classList.contains("err")) { msg.textContent = ""; }
      });
    });
  }

  /* ----------------------------------------------------------------------- */
  /* Marquee — duplicate content for seamless loop                            */
  /* ----------------------------------------------------------------------- */
  function initMarquee() {
    var track = document.querySelector(".marquee-track");
    if (!track || reduceMotion) return;
    track.innerHTML = track.innerHTML + track.innerHTML;
  }

  /* ----------------------------------------------------------------------- */
  /* Active nav link by scroll position (index in-page anchors)               */
  /* ----------------------------------------------------------------------- */
  function initScrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.site-nav .nav-link[href^="#"]'));
    if (links.length < 2 || !("IntersectionObserver" in window)) return;
    var map = {};
    links.forEach(function (l) {
      var id = l.getAttribute("href").slice(1);
      var sec = document.getElementById(id);
      if (sec) map[id] = l;
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          links.forEach(function (l) { l.classList.remove("active"); });
          if (map[e.target.id]) map[e.target.id].classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  }

  /* ----------------------------------------------------------------------- */
  /* Boot                                                                     */
  /* ----------------------------------------------------------------------- */
  function boot() {
    initNavScroll();
    initMobileMenu();
    initReveal();
    initCountUp();
    initBag();
    initShopFilters();
    initLightbox();
    initNewsletter();
    initMarquee();
    initScrollSpy();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
