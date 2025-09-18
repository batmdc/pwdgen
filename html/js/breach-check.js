// breach-check.js
// Performs a k-anonymity lookup against the Have I Been Pwned password range API.
// Only the first 5 chars of the SHA-1 hash are sent. The full password never leaves the browser.

(function() {
  const passwordInput = document.getElementById('passphrase');
  const statusContainer = document.querySelector('.breach-status');
  const statusText = document.querySelector('.breach-status-text');
  if (!passwordInput || !statusContainer || !statusText) return;

  const API_ROOT = 'https://api.pwnedpasswords.com/range/';
  const DEBOUNCE_MS = 600;

  let debounceTimer = null;

  function setStatus(state, message) {
    statusContainer.classList.remove('ok', 'pwned', 'neutral');
    statusContainer.classList.add(state);
    statusText.textContent = message;
  }

  async function sha1Hex(message) {
    const enc = new TextEncoder();
    const data = enc.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  async function checkPassword(pw) {
    if (!pw) {
      setStatus('neutral', 'Enter a password to check');
      return;
    }

    try {
      setStatus('neutral', 'Checking...');
      const hash = await sha1Hex(pw);
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);

      // Fetch the hash range (Add-Padding header to reduce inference) – optional
      const res = await fetch(API_ROOT + prefix, {
        headers: { 'Add-Padding': 'true' }
      });
      if (!res.ok) {
        throw new Error('Network response was not ok');
      }
      const body = await res.text();
      const lines = body.split('\n');
      let foundCount = 0;
      for (const line of lines) {
        const [hashSuffix, countStr] = line.trim().split(':');
        if (!hashSuffix) continue;
        if (hashSuffix.toUpperCase() === suffix) {
          foundCount = parseInt(countStr.replace(/\D/g, ''), 10) || 0;
          break;
        }
      }

      if (foundCount > 0) {
        setStatus('pwned', `Found in public breaches (seen ${foundCount.toLocaleString()} times)`);
      } else {
        setStatus('ok', 'Not found in known breach datasets');
      }
    } catch (e) {
      // If offline or blocked, show unavailable but keep neutral state
      setStatus('neutral', 'Breach check unavailable (offline?)');
      // Optionally log to console for debugging only
      console.debug('Breach check error:', e);
    }
  }

  function scheduleCheck() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => checkPassword(passwordInput.value), DEBOUNCE_MS);
  }

  passwordInput.addEventListener('input', scheduleCheck);
  // Trigger initial check for the generated password after other onload scripts run.
  window.addEventListener('load', () => {
    scheduleCheck();
  });

})();
