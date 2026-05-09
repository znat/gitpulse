/* gitpulse unlock bootstrap. Shipped to out/_gp/unlock.js by encrypt.mjs.
 *
 * Reads the {iv, ct} envelope from <script id="gp">, prompts for the
 * password, derives a key with hardcoded params (matching encrypt.mjs),
 * decrypts, and document.writes the original HTML back into the page.
 *
 * Vanilla JS, no imports, no bundler. Same wire format as the {iv, ct}
 * envelopes shipped under data/ — PRPanelProvider reuses window.__gitpulseKey
 * to decrypt them at fetch time. AES-GCM auth-tag failure = wrong password.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'gp.k';
  var KEY_GLOBAL = '__gitpulseKey';
  var ITERATIONS = 600000;
  var SALT = new Uint8Array(16);

  var payloadEl = document.getElementById('gp');
  if (!payloadEl) return;
  var envelope;
  try {
    envelope = JSON.parse(payloadEl.textContent || '{}');
  } catch (_) {
    return;
  }
  if (!envelope || !envelope.iv || !envelope.ct) return;

  function b64decode(s) {
    var bin = atob(s);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }
  function b64encode(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }

  async function deriveKey(password) {
    var baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: SALT, iterations: ITERATIONS, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt'],
    );
  }

  async function importRawKey(rawB64) {
    return crypto.subtle.importKey(
      'raw',
      b64decode(rawB64),
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt'],
    );
  }

  async function decryptWithKey(env, key) {
    var plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64decode(env.iv) },
      key,
      b64decode(env.ct),
    );
    return new TextDecoder().decode(plain);
  }

  async function unlock(key, html) {
    window[KEY_GLOBAL] = key;
    try {
      window.dispatchEvent(new Event('gp:unlocked'));
    } catch (_) {}
    document.open();
    document.write(html);
    document.close();
  }

  function clearStored() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  async function tryStoredKey() {
    var raw = null;
    try { raw = sessionStorage.getItem(STORAGE_KEY); } catch (_) {}
    if (!raw) {
      try { raw = localStorage.getItem(STORAGE_KEY); } catch (_) {}
    }
    if (!raw) return false;
    try {
      var key = await importRawKey(raw);
      var html = await decryptWithKey(envelope, key);
      await unlock(key, html);
      return true;
    } catch (_) {
      clearStored();
      return false;
    }
  }

  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = [
      ':root{color-scheme:light dark;--gp-bg:#faf8f3;--gp-fg:#1a1a17;--gp-muted:#6b6862;--gp-accent:#b8860b;--gp-line:#d8d4ca;--gp-input:#fff;--gp-err:#a83232;}',
      '@media (prefers-color-scheme: dark){:root{--gp-bg:#0d0d0c;--gp-fg:#f0ede8;--gp-muted:#8a8780;--gp-accent:#d4a74a;--gp-line:#2a2a26;--gp-input:#161614;}}',
      'html,body{margin:0;padding:0;background:var(--gp-bg);color:var(--gp-fg);min-height:100vh;}',
      'body{font-family:Georgia,"Times New Roman",serif;display:flex;align-items:center;justify-content:center;}',
      '.gp-unlock{max-width:28rem;width:100%;padding:2rem 1.5rem;}',
      '.gp-kicker{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.7rem;letter-spacing:.32em;text-transform:uppercase;color:var(--gp-muted);margin:0 0 1.25rem;}',
      '.gp-headline{font-size:2rem;line-height:1.15;font-weight:700;letter-spacing:-.01em;margin:0 0 .75rem;}',
      '.gp-standfirst{font-style:italic;color:var(--gp-muted);margin:0 0 2rem;font-size:1.05rem;line-height:1.5;}',
      '#gp-form{display:flex;flex-direction:column;gap:.75rem;}',
      '#gp-pw{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.95rem;padding:.65rem .75rem;background:var(--gp-input);color:var(--gp-fg);border:1px solid var(--gp-line);border-radius:2px;outline:none;}',
      '#gp-pw:focus{border-color:var(--gp-accent);}',
      '.gp-remember{display:flex;align-items:center;gap:.5rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.75rem;color:var(--gp-muted);user-select:none;}',
      '.gp-remember input{margin:0;}',
      '#gp-submit{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.75rem;letter-spacing:.18em;text-transform:uppercase;padding:.7rem 1rem;background:var(--gp-fg);color:var(--gp-bg);border:none;border-radius:2px;cursor:pointer;margin-top:.25rem;}',
      '#gp-submit:disabled{opacity:.5;cursor:wait;}',
      '#gp-submit:hover:not(:disabled){background:var(--gp-accent);color:var(--gp-bg);}',
      '.gp-msg{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.85rem;margin:.25rem 0 0;}',
      '.gp-err{color:var(--gp-err);}',
      '.gp-pending{color:var(--gp-muted);}',
      '.gp-rule{width:4rem;height:3px;background:var(--gp-accent);margin:0 0 1.5rem;}',
    ].join('');
    document.head.appendChild(style);
  }

  function renderUnlockUI() {
    injectStyles();
    document.body.innerHTML =
      '<main class="gp-unlock">' +
      '<p class="gp-kicker">Gitpulse</p>' +
      '<div class="gp-rule"></div>' +
      '<h1 class="gp-headline">This publication is private</h1>' +
      '<p class="gp-standfirst">Enter the password to read this issue.</p>' +
      '<form id="gp-form" autocomplete="on">' +
      '<input id="gp-pw" type="password" name="password" autocomplete="current-password" autofocus required placeholder="Password" aria-label="Password">' +
      '<label class="gp-remember"><input id="gp-remember" type="checkbox" name="remember"><span>Remember on this device</span></label>' +
      '<button type="submit" id="gp-submit">Unlock</button>' +
      '<p id="gp-msg" class="gp-msg" hidden></p>' +
      '</form>' +
      '</main>';
    var form = document.getElementById('gp-form');
    var pw = document.getElementById('gp-pw');
    var remember = document.getElementById('gp-remember');
    var submit = document.getElementById('gp-submit');
    var msg = document.getElementById('gp-msg');

    function showError(text) {
      msg.textContent = text;
      msg.className = 'gp-msg gp-err';
      msg.hidden = false;
    }
    function showPending() {
      msg.textContent = 'Unlocking…';
      msg.className = 'gp-msg gp-pending';
      msg.hidden = false;
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      msg.hidden = true;
      submit.disabled = true;
      showPending();
      try {
        var key = await deriveKey(pw.value);
        var html = await decryptWithKey(envelope, key);
        // AES-GCM didn't throw → password is right. Persist key bytes.
        var raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
        var rawB64 = b64encode(raw);
        try { sessionStorage.setItem(STORAGE_KEY, rawB64); } catch (_) {}
        if (remember.checked) {
          try { localStorage.setItem(STORAGE_KEY, rawB64); } catch (_) {}
        } else {
          try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
        }
        await unlock(key, html);
      } catch (_) {
        submit.disabled = false;
        showError('Wrong password.');
        pw.select();
      }
    });
  }

  function start() {
    tryStoredKey().then(function (unlocked) {
      if (!unlocked) renderUnlockUI();
    }).catch(function () {
      renderUnlockUI();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
