/* DailyVet i18n — English <-> Bangla toggle (standalone; touches no other script).
 * Looks up exact English text in window.DV_BN (js/i18n-bn.js) and swaps it in the DOM.
 * Anything without a dictionary entry stays English. Originals are kept so EN restores perfectly.
 * Console helpers:  DVI18N.missing()  -> English strings seen on this page that have no Bangla yet.
 */
(function () {
  'use strict';
  var KEY = 'dv_lang';
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1, SVG: 1 };
  var DICT = {}, PATTERNS = [];
  var lang = 'en';
  var nodeOrig = new WeakMap();   // text node -> {en, bn}
  var attrOrig = new WeakMap();   // element -> {attr: {en, bn}}
  var seenMissing = {};
  var busy = false;

  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }

  function loadDict() {
    var src = window.DV_BN || {};
    DICT = {}; LOWER = {};
    Object.keys(src).forEach(function (k) { var n = norm(k); DICT[n] = src[k]; var l = n.toLowerCase(); if (!LOWER.hasOwnProperty(l)) LOWER[l] = src[k]; });
    PATTERNS = window.DV_BN_PATTERNS || [];
  }

  // Split "🐕 Dog" / "Step 1/2:" style strings into prefix + core + suffix, so emoji/punctuation need no own entry.
  var EDGE = /^([^A-Za-z0-9ঀ-৿]*)([\s\S]*?)([^A-Za-z0-9ঀ-৿%)]*)$/;

  var BN_DIGITS = '০১২৩৪৫৬৭৮৯';
  function bnDigits(t) { return t.replace(/[0-9]/g, function (d) { return BN_DIGITS.charAt(+d); }); }
  // a bare number with an optional short unit: "40", "79.0 THI", "149 AQI", "52%"
  var NUMLIKE = /^[\s\d.,:%+\-–\/°]*\d[\s\d.,:%+\-–\/°]*[A-Za-z%°]{0,6}$/;
  var LOWER = {};

  function lookup(k) {
    if (DICT.hasOwnProperty(k)) return DICT[k];
    var l = k.toLowerCase();
    if (LOWER.hasOwnProperty(l)) return LOWER[l];
    return null;
  }

  function translate(text) {
    var core = norm(text);
    if (!core) return null;
    if (!/[A-Za-z]{2}/.test(core)) return null;
    var hit = lookup(core);
    if (hit !== null) return hit;
    var pm = core.match(/^([^A-Za-z0-9ঀ-৿]+)([\s\S]+)$/);
    if (pm && (hit = lookup(pm[2])) !== null) return pm[1] + hit;
    var m = core.match(EDGE);
    if (m && m[2] && (m[1] || m[3]) && (hit = lookup(m[2])) !== null) return m[1] + hit + m[3];
    for (var i = 0; i < PATTERNS.length; i++) {
      var p = PATTERNS[i];
      if (p[0].test(core)) {
        var r = core.replace(p[0], p[1]);
        if (r === core) continue;          // pattern matched but decided not to change anything
        return bnDigits(r);
      }
    }
    // "Gulshan, Dhaka" / "Dhaka, Bangladesh": translate each comma-separated part we know
    if (core.length < 120 && core.indexOf(',') > 0) {
      var parts = core.split(/\s*,\s*/);
      if (parts.length <= 6) {
        var hits = 0;
        var outp = parts.map(function (x) { var h = lookup(x); if (h !== null) { hits++; return h; } return x; });
        if (hits * 2 >= parts.length) return outp.join(', ');
      }
    }
    return null;
  }

  // Bangla sentences that embed an English animal name (e.g. "cow-এর টিকার সময়...")
  var WORDS = {
    cow: 'গরু', cows: 'গরু', cattle: 'গবাদিপশু', bull: 'ষাঁড়', calf: 'বাছুর', buffalo: 'মহিষ', goat: 'ছাগল', goats: 'ছাগল',
    sheep: 'ভেড়া', chicken: 'মুরগি', hen: 'মুরগি', poultry: 'হাঁস-মুরগি', duck: 'হাঁস', dog: 'কুকুর', cat: 'বিড়াল',
    horse: 'ঘোড়া', rabbit: 'খরগোশ', pigeon: 'কবুতর', fish: 'মাছ', bird: 'পাখি', parrot: 'টিয়া', quail: 'কোয়েল'
  };
  function translateMixed(text) {
    if (!/[ঀ-৿]/.test(text) || !/[A-Za-z]/.test(text)) return null;
    var changed = false;
    var out = text.replace(/([A-Za-z]+)(-এর|-কে|-র)?/g, function (all, w, suf) {
      var v = WORDS[w.toLowerCase()];
      if (!v) return all;
      changed = true;
      if (!suf) return v;
      if (suf === '-কে') return v + 'কে';
      return v + (/[ুিা]$/.test(v) ? 'র' : 'ের');   // ু ি া -> র, otherwise -ের
    });
    return changed ? bnDigits(out) : null;
  }

  // numbers like "40" or "79.0 THI" -> Bangla digits (only plain number-ish text)
  function translateNumber(text) {
    var core = norm(text);
    if (core && /[0-9]/.test(core) && (NUMLIKE.test(core) || /[ঀ-৿]/.test(core))) return bnDigits(core);
    return null;
  }

  function keepSpacing(orig, bn) {
    var lead = orig.match(/^\s*/)[0], trail = orig.match(/\s*$/)[0];
    return lead + bn + trail;
  }

  function skipEl(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentNode) {
      if (SKIP_TAGS[n.tagName.toUpperCase()]) return true;
      if (n.classList && n.classList.contains('notranslate')) return true;
      if (n.getAttribute && (n.getAttribute('translate') === 'no' || n.isContentEditable)) return true;
      if (n.id === 'dv-lang-toggle') return true;
    }
    return false;
  }

  function doTextNode(node) {
    var rec = nodeOrig.get(node);
    var cur = node.nodeValue;
    if (rec && cur === rec.bn) { // already ours
      if (lang === 'en') { node.nodeValue = rec.en; }
      return;
    }
    // new text, or the page changed it after we translated: treat as new original
    if (lang === 'en') { if (rec) nodeOrig.delete(node); noteMissingIfNeeded(cur, false); return; }
    var bn = translate(cur);
    if (bn == null) bn = translateMixed(cur);
    if (bn == null) bn = translateNumber(cur);
    if (bn == null) { nodeOrig.delete(node); noteMissingIfNeeded(cur, true); return; }
    var out = keepSpacing(cur, bn);
    nodeOrig.set(node, { en: cur, bn: out });
    node.nodeValue = out;
  }

  function noteMissingIfNeeded(t, count) {
    var c = norm(t);
    if (c && /[A-Za-z]{3}/.test(c) && !translate(c)) seenMissing[c] = 1;
  }

  function doAttrs(el) {
    var store = attrOrig.get(el) || {};
    var names = ATTRS.slice();
    if (el.tagName === 'INPUT' && /^(submit|button|reset)$/i.test(el.type)) names.push('value');
    names.forEach(function (a) {
      if (!el.hasAttribute(a)) return;
      var cur = el.getAttribute(a), rec = store[a];
      if (rec && cur === rec.bn) { if (lang === 'en') el.setAttribute(a, rec.en); return; }
      if (lang === 'en') { delete store[a]; noteMissingIfNeeded(cur); return; }
      var bn = translate(cur);
      if (bn == null) { delete store[a]; noteMissingIfNeeded(cur); return; }
      store[a] = { en: cur, bn: bn };
      el.setAttribute(a, bn);
    });
    attrOrig.set(el, store);
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (root.parentNode && !skipEl(root.parentNode)) doTextNode(root); return; }
    if (root.nodeType !== 1 || skipEl(root)) return;
    doAttrs(root);
    var w = document.createTreeWalker(root, 1 | 4, {
      acceptNode: function (n) {
        if (n.nodeType === 1) return skipEl(n) ? 2 /*REJECT subtree*/ : 1;
        return 1;
      }
    });
    var n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) doTextNode(n); else doAttrs(n);
    }
  }

  var titleEn = null, titleBn = null;
  function doTitle() {
    var cur = document.title;
    // first run, or the page set a brand-new title itself: remember it as the English original
    if (titleEn === null || (cur !== titleEn && cur !== titleBn)) titleEn = cur;
    if (lang === 'bn') {
      titleBn = translate(titleEn) || titleEn;
      document.title = titleBn;
    } else {
      document.title = titleEn;
    }
  }

  function run() {
    busy = true;
    try { walk(document.body); doTitle(); } catch (e) { /* never break the page */ }
    busy = false;
  }

  var mo = null;
  // Runs inside the MutationObserver callback (a microtask), i.e. BEFORE the browser paints:
  // text the page rewrites (live clock, counters...) is translated before it can be seen in English.
  function onMutations(list) {
    if (lang !== 'bn') return;
    busy = true;
    try {
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m.type === 'childList') {
          for (var j = 0; j < m.addedNodes.length; j++) { var n = m.addedNodes[j]; if (n.isConnected) walk(n); }
        } else if (m.type === 'characterData') {
          if (m.target.isConnected) walk(m.target);
        } else if (m.type === 'attributes') {
          if (m.target.isConnected && !skipEl(m.target)) doAttrs(m.target);
        }
      }
    } catch (e) { /* never break the page */ }
    busy = false;
    try { mo.takeRecords(); } catch (e) {}   // drop the mutations we just made ourselves
  }
  function startObserver() {
    if (mo || !document.body) return;
    mo = new MutationObserver(onMutations);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  // ---- UI ----
  function injectStyle() {
    if (document.getElementById('dv-lang-style')) return;
    var s = document.createElement('style'); s.id = 'dv-lang-style';
    s.textContent =
      '#dv-lang-toggle{position:fixed;left:12px;bottom:84px;z-index:99999;display:flex;border-radius:999px;overflow:hidden;' +
      'box-shadow:0 4px 14px rgba(0,0,0,.22);border:1px solid rgba(15,81,50,.25);font:600 13px/1 Inter,system-ui,sans-serif;background:#fff}' +
      '#dv-lang-toggle button{border:0;background:transparent;padding:9px 13px;cursor:pointer;color:#0F5132;font:inherit;min-width:44px}' +
      '#dv-lang-toggle button.on{background:#0F5132;color:#fff}' +
      '#dv-lang-toggle button:focus-visible{outline:2px solid #7fffd4;outline-offset:-2px}' +
      'html[lang="bn"] body,html[lang="bn"] input,html[lang="bn"] button,html[lang="bn"] select,html[lang="bn"] textarea' +
      '{font-family:"Noto Sans Bengali",Inter,system-ui,sans-serif}' +
      'html[lang="bn"] body{line-height:1.7}' +
      'html[lang="bn"] #hrmLiveClock{display:inline-block;min-width:15.5em;font-variant-numeric:tabular-nums;white-space:nowrap}' +
      '@media print{#dv-lang-toggle{display:none}}';
    document.head.appendChild(s);
    if (!document.querySelector('link[href*="Noto+Sans+Bengali"]')) {
      var l = document.createElement('link'); l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap';
      document.head.appendChild(l);
    }
  }

  function buildToggle() {
    if (document.getElementById('dv-lang-toggle')) return;
    var box = document.createElement('div'); box.id = 'dv-lang-toggle'; box.className = 'notranslate';
    box.setAttribute('translate', 'no'); box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Language');
    box.innerHTML = '<button type="button" data-l="en">EN</button><button type="button" data-l="bn">বাং</button>';
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (b) setLang(b.getAttribute('data-l'));
    });
    document.body.appendChild(box);
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.auth-lang-btn[data-lang]');
      if (b) setLang(b.getAttribute('data-lang'));
    });
    paintToggle();
  }
  function paintToggle() {
    // the login/reset pages ship their own BN/EN pills: keep them in sync
    [].forEach.call(document.querySelectorAll('.auth-lang-btn[data-lang]'), function (b) {
      b.classList.toggle('auth-lang-active', b.getAttribute('data-lang') === lang);
    });
    var box = document.getElementById('dv-lang-toggle'); if (!box) return;
    [].forEach.call(box.querySelectorAll('button'), function (b) {
      var on = b.getAttribute('data-l') === lang;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function setLang(l) {
    if (l !== 'bn') l = 'en';
    lang = l;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    document.documentElement.setAttribute('lang', l);
    paintToggle();
    run();
    try { document.dispatchEvent(new CustomEvent('dv-lang-change', { detail: { lang: l } })); } catch (e) {}
  }

  function init() {
    loadDict();
    injectStyle();
    buildToggle();
    startObserver();
    var saved = 'en';
    try { saved = localStorage.getItem(KEY) || 'en'; } catch (e) {}
    setLang(saved);
  }

  // Browser popups (alert/confirm/prompt) are not in the DOM; translate their message text too.
  ['alert', 'confirm', 'prompt'].forEach(function (fn) {
    var orig = window[fn];
    if (typeof orig !== 'function') return;
    window[fn] = function (msg) {
      var a = arguments;
      try {
        if (lang === 'bn' && typeof msg === 'string') {
          var t = translate(msg);
          if (t) { a = [].slice.call(arguments); a[0] = t; }
        }
      } catch (e) {}
      return orig.apply(window, a);
    };
  });

  window.DVI18N = {
    get lang() { return lang; },
    set: setLang,
    t: function (s) { return lang === 'bn' ? (translate(s) || s) : s; },
    refresh: function () { loadDict(); run(); },
    missing: function () { var k = Object.keys(seenMissing); console.log(k.length + ' untranslated strings'); return k; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
