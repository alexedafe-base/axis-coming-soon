/* ============================================================================
   AXIO "Coming Soon" — behaviour
   Config lives in config.js (window.AXIO_CONFIG). This file wires the DOM.
   ============================================================================ */
(function () {
  'use strict';
  var CFG = window.AXIO_CONFIG || {};

  /* ── small helpers ──────────────────────────────────────────────────── */
  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ── apply configurable content to the DOM (brand, links, footer) ───── */
  function applyConfig() {
    // legal entity + copyright
    var entity = CFG.legalEntity || 'AXIO Advisory';
    document.querySelectorAll('[data-entity]').forEach(function (el) { el.textContent = entity; });
    document.querySelectorAll('[data-copyright]').forEach(function (el) {
      el.textContent = '© ' + (CFG.copyrightYear || new Date().getFullYear());
    });

    // contact email
    document.querySelectorAll('[data-contact-email]').forEach(function (el) {
      var email = CFG.contactEmail || '';
      el.textContent = email;
      el.setAttribute('href', 'mailto:' + email);
    });

    // privacy links: real URL when set, otherwise render as plain text (no dead '#')
    document.querySelectorAll('[data-privacy-link]').forEach(function (a) {
      var url = (CFG.privacyUrl || '').trim();
      if (url) {
        a.setAttribute('href', url);
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener');
      } else {
        var span = document.createElement('span');
        span.className = a.className;
        span.textContent = a.textContent;
        a.parentNode.replaceChild(span, a);
      }
    });

    // social channels: show only configured (live) URLs — PRD §16 / P1
    var social = CFG.social || {};
    document.querySelectorAll('[data-social]').forEach(function (a) {
      var key = a.getAttribute('data-social');
      var url = (social[key] || '').trim();
      if (url) { a.setAttribute('href', url); a.setAttribute('rel', 'noopener'); a.setAttribute('target', '_blank'); }
      else { a.parentNode.removeChild(a); }
    });

    // structured data: mirror the same live social URLs into JSON-LD sameAs
    // so search engines see exactly what the footer links to (no separate list to maintain)
    var ld = document.querySelector('script[type="application/ld+json"]');
    var sameAs = Object.keys(social).map(function (k) { return (social[k] || '').trim(); }).filter(Boolean);
    if (ld && sameAs.length) {
      try {
        var data = JSON.parse(ld.textContent);
        data.sameAs = sameAs;
        ld.textContent = JSON.stringify(data);
      } catch (_) {}
    }
  }

  /* ── service chips ──────────────────────────────────────────────────── */
  var selected = new Set();                 // holds canonical service IDs
  function buildChips() {
    var wrap = $('chips');
    var check = '<svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6.5l2.5 2.5 5-6" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    (CFG.services || []).forEach(function (s, idx) {
      var c = document.createElement('div');
      c.className = 'chip';
      c.setAttribute('role', 'button');
      c.setAttribute('tabindex', '0');
      c.setAttribute('aria-pressed', 'false');
      var descId = 'svc-desc-' + idx;
      c.setAttribute('aria-label', s.name + ' — ' + s.tier);
      c.setAttribute('aria-describedby', descId);
      c.innerHTML =
        '<span class="mk">' + check + '</span>' +
        '<span class="body"><span class="name">' + s.name + '</span><span class="ctier">' + s.tier + '</span></span>' +
        '<button type="button" class="info" aria-label="About ' + s.name + '" aria-expanded="false">' +
          '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/><path d="M8 7v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="4.6" r="0.9" fill="currentColor"/></svg>' +
        '</button>' +
        '<span class="pop" id="' + descId + '" role="tooltip">' + s.desc + '</span>';

      var info = c.querySelector('.info');
      function openPop()  { c.classList.add('show-pop');  info.setAttribute('aria-expanded', 'true'); }
      function closePop() { c.classList.remove('show-pop'); info.setAttribute('aria-expanded', 'false'); }
      info.addEventListener('mouseenter', openPop);
      info.addEventListener('mouseleave', closePop);
      info.addEventListener('focus', openPop);
      info.addEventListener('blur', closePop);
      info.addEventListener('click', function (e) {
        e.stopPropagation();
        c.classList.contains('show-pop') ? closePop() : openPop();
      });
      // dismiss popover with Escape (PRD §9.3)
      c.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePop(); });

      function toggleSelect() {
        if (selected.has(s.id)) { selected.delete(s.id); c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); }
        else { selected.add(s.id); c.classList.add('on'); c.setAttribute('aria-pressed', 'true'); }
        $('svc-err').classList.remove('show');
      }
      c.addEventListener('click', toggleSelect);
      c.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleSelect(); }
      });
      wrap.appendChild(c);
    });
  }

  /* ── countdown (PRD §4.2) ───────────────────────────────────────────── */
  function startCountdown() {
    var LAUNCH = new Date(CFG.launchISO || '2026-10-01T09:00:00Z').getTime();
    function tick() {
      var diff = Math.max(0, LAUNCH - Date.now());
      var s = Math.floor(diff / 1000);
      var d = Math.floor(s / 86400); s -= d * 86400;
      var h = Math.floor(s / 3600);  s -= h * 3600;
      var m = Math.floor(s / 60);    s -= m * 60;
      $('cd-d').textContent = pad(d);
      $('cd-h').textContent = pad(h);
      $('cd-m').textContent = pad(m);
      $('cd-s').textContent = pad(s);
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ── hero rotator height sync ────────────────────────────────────────
     Slides are absolutely positioned except the active one, so the
     rotator's box normally sizes to whichever slide is showing — that
     makes the countdown below jump up/down as shorter/taller slides
     rotate in. Pin the rotator to the tallest slide's height instead,
     so everything below it stays put regardless of copy length. */
  function syncHeroHeight() {
    var rot = $('heroRotator');
    var slides = rot ? rot.querySelectorAll('.hero-slide') : [];
    if (!slides.length) return;
    var max = 0;
    slides.forEach(function (s) { max = Math.max(max, s.offsetHeight); });
    rot.style.minHeight = max + 'px';
  }

  /* ── hero rotator (PRD §4.1: crossfade, pause on hover/focus, RM-safe) ─ */
  function startRotator() {
    var rot = $('heroRotator');
    var slides = rot ? rot.querySelectorAll('.hero-slide') : [];
    if (slides.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var i = 0, timer = null, DELAY = 5500;
    function go() {
      slides[i].classList.remove('is-active');
      i = (i + 1) % slides.length;
      slides[i].classList.add('is-active');
    }
    function start() { timer = setInterval(go, DELAY); }
    function stop()  { clearInterval(timer); }
    rot.addEventListener('mouseenter', stop);
    rot.addEventListener('mouseleave', start);
    rot.addEventListener('focusin', stop);      // pause when keyboard focus enters
    rot.addEventListener('focusout', start);
    start();
  }

  /* ── form (PRD §4.3–4.4, §5.2 payload) ──────────────────────────────── */
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function buildPayload(email, fname) {
    var loc = 'en-GB', tz = 'Europe/London';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (_) {}
    try { loc = navigator.language || loc; } catch (_) {}
    return {
      firstName: fname || null,
      email: email,
      serviceIds: Array.from(selected),                 // canonical IDs, per §5.1
      consent: { accepted: true, version: CFG.consentVersion || 'unknown' },
      client: { locale: loc, timezone: tz }
    };
  }

  function showSuccess(email, fname) {
    var msg = (fname ? 'Thank you, <strong>' + fname + '</strong>. ' : '') +
      'Please check <strong>' + email + '</strong> to confirm your email address. ' +
      "We'll be in touch when AXIO opens its doors.";
    $('success-msg').innerHTML = msg;
    var echo = $('echo-svc'); echo.innerHTML = '';
    var byId = {}; (CFG.services || []).forEach(function (s) { byId[s.id] = s.name; });
    Array.from(selected).forEach(function (id) {
      var t = document.createElement('span'); t.className = 't'; t.textContent = byId[id] || id; echo.appendChild(t);
    });

    var pageUrl = location.href.split(/[?#]/)[0];
    var shareText = (CFG.shareMessage || 'Join the AXIO Advisory waitlist: {url}').replace('{url}', pageUrl);

    var waLink = $('share-wa');
    if (waLink) waLink.href = 'https://wa.me/?text=' + encodeURIComponent(shareText);

    var smsLink = $('share-sms');
    if (smsLink) {
      // iOS wants "sms:&body=", Android wants "sms:?body=" — no single URI satisfies both.
      var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      smsLink.href = 'sms:' + (isIOS ? '&body=' : '?body=') + encodeURIComponent(shareText);
    }

    var fbLink = $('share-fb');
    if (fbLink) fbLink.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(pageUrl);

    $('form-view').style.display = 'none';
    $('success-view').style.display = 'block';
  }

  function bindForm() {
    var form = $('signup');
    var emailIn = $('email');
    var emailErr = $('email-err');
    var fnameIn = $('fname');
    var fnameErr = $('fname-err');
    var submitBtn = form.querySelector('.submit');

    emailIn.addEventListener('input', function () {
      if (validEmail(emailIn.value.trim())) { emailIn.classList.remove('invalid'); emailErr.classList.remove('show'); }
    });
    fnameIn.addEventListener('input', function () {
      if (fnameIn.value.trim()) { fnameIn.classList.remove('invalid'); fnameErr.classList.remove('show'); }
    });
    $('consent').addEventListener('change', function () {
      if (this.checked) { this.classList.remove('invalid'); $('consent-err').classList.remove('show'); }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = emailIn.value.trim();
      var fname = fnameIn.value.trim();
      var consentEl = $('consent');
      var ok = true;

      if (!fname) { fnameIn.classList.add('invalid'); fnameErr.classList.add('show'); ok = false; }
      if (!validEmail(email)) { emailIn.classList.add('invalid'); emailErr.classList.add('show'); ok = false; }
      if (selected.size === 0) { $('svc-err').classList.add('show'); ok = false; }
      if (!consentEl.checked) { consentEl.classList.add('invalid'); $('consent-err').classList.add('show'); ok = false; }
      if (!ok) return;

      var payload = buildPayload(email, fname);

      // Static/dev mode: no backend configured → validate + show success locally.
      if (!CFG.apiUrl) {
        try {
          var key = 'axio_waitlist';
          var list = JSON.parse(localStorage.getItem(key) || '[]');
          list.push(Object.assign({ ts: new Date().toISOString() }, payload));
          localStorage.setItem(key, JSON.stringify(list));
        } catch (_) {}
        showSuccess(email, fname);
        return;
      }

      var origHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Adding you to the list…';

      // worker/index.js handles this route: writes to D1, sends the
      // confirmation email, and returns { ok:true, duplicate:bool } — a
      // duplicate email is treated as success, not an error.
      fetch(CFG.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      }).then(function () {
        showSuccess(email, fname);
      }).catch(function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origHtml;
        var apiErr = $('api-err');
        if (apiErr) apiErr.classList.add('show');
      });
    });
  }

  /* ── init ───────────────────────────────────────────────────────────── */
  function init() {
    applyConfig();
    buildChips();
    startCountdown();
    startRotator();
    bindForm();

    syncHeroHeight();
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(syncHeroHeight, 150);
    });
    // clamp()-based type can reflow once web fonts finish swapping in
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncHeroHeight);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
