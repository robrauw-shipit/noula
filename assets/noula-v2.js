/* NOULA v2 — small behaviours: countdown, accordions, scrollers, read-more, review grid, sticky bar */
(function () {
  'use strict';

  /* ---------- countdown (rolling, per-visitor) ---------- */
  function initCountdown(el) {
    var hours = parseFloat(el.getAttribute('data-hours') || '12');
    var key = 'nv_countdown_end_' + (el.getAttribute('data-key') || 'default');
    var end;
    try { end = parseInt(sessionStorage.getItem(key), 10); } catch (e) { end = NaN; }
    var now = Date.now();
    if (!end || isNaN(end) || end < now) {
      end = now + hours * 3600 * 1000;
      try { sessionStorage.setItem(key, String(end)); } catch (e) {}
    }
    var h = el.querySelector('[data-h]'), m = el.querySelector('[data-m]'), s = el.querySelector('[data-s]');
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function tick() {
      var left = Math.max(0, end - Date.now());
      var sec = Math.floor(left / 1000);
      if (h) h.textContent = pad(Math.floor(sec / 3600));
      if (m) m.textContent = pad(Math.floor((sec % 3600) / 60));
      if (s) s.textContent = pad(sec % 60);
    }
    tick();
    if (el._nvTimer) clearInterval(el._nvTimer);
    el._nvTimer = setInterval(tick, 1000);
  }

  /* ---------- accordion ---------- */
  function initAccordion(acc) {
    var single = acc.getAttribute('data-single') !== 'false';
    acc.querySelectorAll('.nv-acc__q').forEach(function (q) {
      q.addEventListener('click', function () {
        var item = q.closest('.nv-acc__item');
        var panel = item.querySelector('.nv-acc__a');
        var open = item.classList.contains('is-open');
        if (single) {
          acc.querySelectorAll('.nv-acc__item.is-open').forEach(function (i) {
            i.classList.remove('is-open');
            i.querySelector('.nv-acc__a').style.maxHeight = null;
            i.querySelector('.nv-acc__q').setAttribute('aria-expanded', 'false');
          });
        }
        if (!open) {
          item.classList.add('is-open');
          panel.style.maxHeight = panel.scrollHeight + 'px';
          q.setAttribute('aria-expanded', 'true');
        } else {
          item.classList.remove('is-open');
          panel.style.maxHeight = null;
          q.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  /* ---------- horizontal scroller arrows ---------- */
  function initScroller(sc) {
    var track = sc.querySelector('.nv-track');
    if (!track) return;
    sc.querySelectorAll('.nv-arrow').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var dir = btn.classList.contains('nv-arrow--prev') ? -1 : 1;
        var first = track.firstElementChild;
        var step = first ? first.getBoundingClientRect().width + 16 : track.clientWidth * 0.8;
        track.scrollBy({ left: dir * step, behavior: 'smooth' });
      });
    });
  }

  /* ---------- read more on review cards ---------- */
  function initReadMore(card) {
    var text = card.querySelector('.nv-review__text');
    var btn = card.querySelector('.nv-review__more');
    if (!text || !btn) return;
    text.classList.add('is-clamped');
    requestAnimationFrame(function () {
      if (text.scrollHeight <= text.clientHeight + 2) { btn.hidden = true; }
    });
    btn.addEventListener('click', function () {
      var clamped = text.classList.toggle('is-clamped');
      btn.textContent = clamped ? btn.getAttribute('data-more') : btn.getAttribute('data-less');
    });
  }

  /* ---------- review grid show more ---------- */
  function initGrid(wrap) {
    var btn = wrap.querySelector('.nv-grid__more button');
    if (!btn) return;
    btn.addEventListener('click', function () {
      wrap.querySelectorAll('.nv-gcard.is-hidden').forEach(function (c) { c.classList.remove('is-hidden'); });
      wrap.querySelector('.nv-grid__more').hidden = true;
    });
  }

  /* ---------- sticky bar: show once the buy button scrolls out ---------- */
  function initSticky(bar) {
    var target = document.querySelector(bar.getAttribute('data-watch') || '.product-form__submit');
    if (!target || !('IntersectionObserver' in window)) { bar.classList.add('is-visible'); return; }
    if (bar._nvIO) bar._nvIO.disconnect();
    var io = bar._nvIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var below = e.boundingClientRect.top < 0;
        bar.classList.toggle('is-visible', !e.isIntersecting && below);
      });
    }, { threshold: 0 });
    io.observe(target);
    var cta = bar.querySelector('[data-scroll-to]');
    if (cta) cta.addEventListener('click', function (ev) {
      ev.preventDefault();
      var t = document.querySelector(cta.getAttribute('data-scroll-to'));
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /* ---------- ATC button mirrors the selected KaChing deal price ---------- */
  function initAtcPrice() {
    var btn = document.querySelector('.product-form__submit');
    var host = document.querySelector('.kaching-bundles');
    if (!btn || !host) return;
    var label = btn.querySelector('span');
    if (!label) return;
    var base = (label.getAttribute('data-base-label') || label.textContent).trim();
    label.setAttribute('data-base-label', base);
    function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
    function update() {
      if (btn.disabled) return;
      var bar = host.querySelector('.kaching-bundles__bar--selected');
      var price = txt(bar && bar.querySelector('.kaching-bundles__bar-price'));
      var full = txt(bar && bar.querySelector('.kaching-bundles__bar-full-price'));
      if (!price) { label.textContent = base; return; }
      label.innerHTML = base + ' \u00b7 ' + price + (full && full !== price ? ' <s class="nv-atc-compare">' + full + '</s>' : '');
    }
    update();
    if (host._nvObserver) host._nvObserver.disconnect();
    var scheduled = false;
    host._nvObserver = new MutationObserver(function () {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () { scheduled = false; update(); });
    });
    host._nvObserver.observe(host, { subtree: true, childList: true, characterData: true });
  }

  function init(root) {
    root = root || document;
    root.querySelectorAll('[data-nv-countdown]').forEach(initCountdown);
    root.querySelectorAll('.nv-acc').forEach(initAccordion);
    root.querySelectorAll('.nv-scroller').forEach(initScroller);
    root.querySelectorAll('.nv-review').forEach(initReadMore);
    root.querySelectorAll('[data-nv-grid]').forEach(initGrid);
    root.querySelectorAll('.nv-sticky').forEach(initSticky);
    initAtcPrice();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();
  /* theme editor re-renders */
  document.addEventListener('shopify:section:load', function (e) { init(e.target); });
})();
