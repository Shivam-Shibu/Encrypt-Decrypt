/**
 * SecureCrypt — Application Logic
 * 
 * Encryption: AES-256-GCM via Web Crypto API (browser native)
 * Key Derivation: PBKDF2 with SHA-256 (100,000 iterations)
 * File I/O: Electron IPC via window.electronAPI
 * 
 * Architecture:
 *   CryptoEngine   — encryption/decryption operations
 *   HistoryManager — persistent operation history
 *   UIController   — page navigation and UI state
 *   EncryptPage    — encrypt page logic
 *   DecryptPage    — decrypt page logic
 *   HistoryPage    — history page logic
 *   SettingsPage   — settings logic
 *   ToastManager   — notification system
 */

'use strict';

// ─── Environment Detection ────────────────────────────────────────────────────
const isElectron = typeof window !== 'undefined' && window.electronAPI != null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getFileExtIcon(ext) {
  return (ext || 'FILE').toUpperCase().slice(0, 4);
}

// ─── Toast Manager ────────────────────────────────────────────────────────────

const ToastManager = (() => {
  const container = document.getElementById('toast-container');

  const icons = {
    success: `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4,10 8,14 16,6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    error:   `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 6v5M10 14h.01" stroke-linecap="round"/><circle cx="10" cy="10" r="8"/></svg>`,
    info:    `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="8"/><path d="M10 9v5M10 7h.01" stroke-linecap="round"/></svg>`,
  };

  function show(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return { show };
})();

// ─── Crypto Engine (AES-256-GCM + PBKDF2) ────────────────────────────────────

const CryptoEngine = (() => {
  const SALT_BYTES   = 16;
  const IV_BYTES     = 12;
  const ITERATIONS   = 100_000;
  const KEY_BITS     = 256;
  const MAGIC        = new Uint8Array([0x53, 0x43, 0x52, 0x59]); // "SCRY" header

  /**
   * Derives an AES-256-GCM CryptoKey from a password string using PBKDF2.
   * @param {string} password
   * @param {Uint8Array} salt
   * @returns {Promise<CryptoKey>}
   */
  async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: KEY_BITS },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts arbitrary binary data with AES-256-GCM.
   * Output format: [MAGIC 4B][SALT 16B][IV 12B][CIPHERTEXT + AUTH_TAG]
   * 
   * @param {Uint8Array} plainData
   * @param {string} password
   * @returns {Promise<Uint8Array>} encrypted blob
   */
  async function encrypt(plainData, password) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv   = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const key  = await deriveKey(password, salt);

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plainData
    );
    const cipherData = new Uint8Array(cipherBuffer);

    // Assemble output: MAGIC + SALT + IV + CIPHERTEXT
    const result = new Uint8Array(MAGIC.length + SALT_BYTES + IV_BYTES + cipherData.length);
    let offset = 0;
    result.set(MAGIC,      offset); offset += MAGIC.length;
    result.set(salt,       offset); offset += SALT_BYTES;
    result.set(iv,         offset); offset += IV_BYTES;
    result.set(cipherData, offset);

    return result;
  }

  /**
   * Decrypts a SecureCrypt encrypted blob.
   * @param {Uint8Array} encData
   * @param {string} password
   * @returns {Promise<Uint8Array>} decrypted data
   * @throws {Error} if magic mismatch or wrong password
   */
  async function decrypt(encData, password) {
    // Validate magic bytes
    for (let i = 0; i < MAGIC.length; i++) {
      if (encData[i] !== MAGIC[i]) {
        throw new Error('INVALID_FORMAT: This file was not encrypted by SecureCrypt, or the file is corrupted.');
      }
    }

    let offset = MAGIC.length;
    const salt       = encData.slice(offset, offset + SALT_BYTES); offset += SALT_BYTES;
    const iv         = encData.slice(offset, offset + IV_BYTES);   offset += IV_BYTES;
    const cipherData = encData.slice(offset);

    const key = await deriveKey(password, salt);

    let plainBuffer;
    try {
      plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        cipherData
      );
    } catch {
      throw new Error('WRONG_PASSWORD: Decryption failed. The password is incorrect or the file is corrupted.');
    }

    return new Uint8Array(plainBuffer);
  }

  return { encrypt, decrypt };
})();

// ─── History Manager ──────────────────────────────────────────────────────────

const HistoryManager = (() => {
  let records = [];

  async function load() {
    if (isElectron) {
      records = (await window.electronAPI.loadHistory()) || [];
    } else {
      try { records = JSON.parse(localStorage.getItem('sc_history') || '[]'); } catch { records = []; }
    }
    _updateBadge();
    return records;
  }

  async function save() {
    if (isElectron) {
      await window.electronAPI.saveHistory(records);
    } else {
      localStorage.setItem('sc_history', JSON.stringify(records));
    }
  }

  function add(entry) {
    records.unshift({ id: Date.now(), ...entry });
    if (records.length > 500) records.pop(); // cap history
    save();
    _updateBadge();
  }

  async function clear() {
    records = [];
    if (isElectron) {
      await window.electronAPI.clearHistory();
    } else {
      localStorage.removeItem('sc_history');
    }
    _updateBadge();
  }

  function getAll() { return [...records]; }

  function _updateBadge() {
    const badge = document.getElementById('history-count');
    if (badge) badge.textContent = records.length;
  }

  return { load, add, clear, getAll };
})();

// ─── UI Controller ────────────────────────────────────────────────────────────

const UIController = (() => {
  let currentPage = 'encrypt';

  function init() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.page));
    });

    // Title bar controls (Electron only)
    if (isElectron) {
      document.getElementById('btn-minimize')?.addEventListener('click', () => window.electronAPI.minimize());
      document.getElementById('btn-maximize')?.addEventListener('click', () => window.electronAPI.maximize());
      document.getElementById('btn-close')?.addEventListener('click',    () => window.electronAPI.close());
    } else {
      // Hide title bar in browser mode
      const tb = document.getElementById('title-bar');
      if (tb) { tb.style.display = 'none'; document.getElementById('app').style.paddingTop = '0'; }
    }

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    const darkIcon  = document.getElementById('theme-icon-dark');
    const lightIcon = document.getElementById('theme-icon-light');

    const savedTheme = localStorage.getItem('sc_theme') || 'dark';
    applyTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
      const current = document.body.dataset.theme;
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('sc_theme', next);
    });

    function applyTheme(theme) {
      document.body.dataset.theme = theme;
      darkIcon.style.display  = theme === 'dark'  ? 'none' : 'block';
      lightIcon.style.display = theme === 'light' ? 'none' : 'block';
    }
  }

  function navigate(page) {
    if (page === currentPage) return;
    currentPage = page;

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

    const targetPage = document.getElementById(`page-${page}`);
    const targetNav  = document.getElementById(`nav-${page}`);
    if (targetPage) targetPage.classList.add('active');
    if (targetNav)  targetNav.classList.add('active');

    if (page === 'history') HistoryPage.render();
  }

  return { init, navigate };
})();

// ─── Encrypt Page ─────────────────────────────────────────────────────────────

const EncryptPage = (() => {
  let selectedFile = null; // { path, name, size, ext, data: Uint8Array }

  function init() {
    setupDropZone();
    setupPassword();
    setupButtons();
  }

  // ── Drop Zone ───────────────────────────────────────────────────────────────
  function setupDropZone() {
    const zone    = document.getElementById('enc-drop-zone');
    const browse  = document.getElementById('enc-browse-btn');
    const remove  = document.getElementById('enc-remove-file');

    // Click to browse
    zone.addEventListener('click', (e) => {
      if (selectedFile && (e.target === remove || remove.contains(e.target))) return;
      if (!selectedFile) triggerFilePick();
    });
    browse.addEventListener('click', (e) => { e.stopPropagation(); triggerFilePick(); });
    remove.addEventListener('click', (e) => { e.stopPropagation(); clearFile(); });

    // Keyboard
    zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') triggerFilePick(); });

    // Drag & Drop
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) await loadFileFromNative(file);
    });
  }

  async function triggerFilePick() {
    if (isElectron) {
      const info = await window.electronAPI.openFile({ filters: [{ name: 'All Files', extensions: ['*'] }] });
      if (!info) return;
      const result = await window.electronAPI.readFile(info.path);
      if (!result.success) { ToastManager.show('Failed to read file: ' + result.error, 'error'); return; }
      const data = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));
      setFile({ path: info.path, name: info.name, size: info.size, ext: info.ext, data });
    } else {
      // Browser fallback: hidden file input
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = async () => { if (input.files[0]) await loadFileFromNative(input.files[0]); };
      input.click();
    }
  }

  async function loadFileFromNative(file) {
    const data = new Uint8Array(await file.arrayBuffer());
    setFile({
      path: file.path || file.name,
      name: file.name,
      size: file.size,
      ext: file.name.split('.').pop() || 'file',
      data
    });
  }

  function setFile(file) {
    selectedFile = file;
    const zone    = document.getElementById('enc-drop-zone');
    const inner   = document.getElementById('enc-drop-inner');
    const preview = document.getElementById('enc-file-preview');

    inner.classList.add('hidden');
    preview.classList.remove('hidden');
    zone.classList.add('has-file');
    zone.style.cursor = 'default';

    document.getElementById('enc-file-ext-badge').textContent = getFileExtIcon(file.ext);
    document.getElementById('enc-file-name').textContent = file.name;
    document.getElementById('enc-file-size').textContent = formatBytes(file.size);
    document.getElementById('enc-file-type').textContent = (file.ext || 'unknown').toUpperCase();

    checkEncryptReady();
  }

  function clearFile() {
    selectedFile = null;
    const zone    = document.getElementById('enc-drop-zone');
    const inner   = document.getElementById('enc-drop-inner');
    const preview = document.getElementById('enc-file-preview');

    inner.classList.remove('hidden');
    preview.classList.add('hidden');
    zone.classList.remove('has-file', 'drag-over');
    zone.style.cursor = 'pointer';
    checkEncryptReady();
  }

  // ── Password ─────────────────────────────────────────────────────────────────
  function setupPassword() {
    const passInput    = document.getElementById('enc-password');
    const confirmInput = document.getElementById('enc-confirm-password');
    const toggle       = document.getElementById('enc-pass-toggle');
    const genBtn       = document.getElementById('enc-generate-btn');

    // Show/hide toggle
    toggle.addEventListener('click', () => togglePassVisibility(passInput, toggle));

    // Strength meter
    passInput.addEventListener('input', () => {
      updateStrengthMeter(passInput.value);
      validateMatch();
      checkEncryptReady();
    });
    confirmInput.addEventListener('input', () => { validateMatch(); checkEncryptReady(); });

    // Generate password
    genBtn.addEventListener('click', () => {
      const pwd = generateSecurePassword(20);
      passInput.value    = pwd;
      confirmInput.value = pwd;
      updateStrengthMeter(pwd);
      validateMatch();
      checkEncryptReady();
      ToastManager.show('Strong password generated!', 'success', 3000);
    });
  }

  function togglePassVisibility(input, btn) {
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.querySelector('.eye-open').style.display  = isHidden ? 'none'  : '';
    btn.querySelector('.eye-closed').style.display = isHidden ? '' : 'none';
  }

  function updateStrengthMeter(password) {
    const fill  = document.getElementById('enc-strength-fill');
    const label = document.getElementById('enc-strength-label');
    if (!password) { fill.className = 'strength-fill'; fill.style.width = '0%'; label.textContent = 'Enter password'; label.style.color = ''; return; }

    const score = scorePassword(password);
    const levels = [
      { class: 'weak',   label: 'Weak',   color: '#ef4444' },
      { class: 'fair',   label: 'Fair',   color: '#f59e0b' },
      { class: 'good',   label: 'Good',   color: '#3b82f6' },
      { class: 'strong', label: 'Strong', color: '#10b981' },
    ];
    const level = levels[score];
    fill.className = `strength-fill ${level.class}`;
    label.textContent = level.label;
    label.style.color = level.color;
  }

  function scorePassword(pw) {
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 14) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return Math.min(3, Math.floor(score * 3 / 5));
  }

  function validateMatch() {
    const hint = document.getElementById('enc-match-hint');
    const pw   = document.getElementById('enc-password').value;
    const cpw  = document.getElementById('enc-confirm-password').value;
    if (!cpw) { hint.textContent = ''; hint.className = 'form-hint'; return; }
    if (pw === cpw) { hint.textContent = '✓ Passwords match'; hint.className = 'form-hint hint-success'; }
    else            { hint.textContent = '✗ Passwords do not match'; hint.className = 'form-hint hint-error'; }
  }

  function generateSecurePassword(len = 20) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|';
    const arr = crypto.getRandomValues(new Uint8Array(len * 2));
    let result = '';
    for (let i = 0; i < arr.length && result.length < len; i++) {
      if (arr[i] < 248) result += chars[arr[i] % chars.length];
    }
    return result;
  }

  function checkEncryptReady() {
    const btn  = document.getElementById('enc-encrypt-btn');
    const pw   = document.getElementById('enc-password').value;
    const cpw  = document.getElementById('enc-confirm-password').value;
    btn.disabled = !(selectedFile && pw && pw === cpw && pw.length >= 6);
  }

  // ── Buttons ──────────────────────────────────────────────────────────────────
  function setupButtons() {
    document.getElementById('enc-encrypt-btn').addEventListener('click', handleEncrypt);
    document.getElementById('enc-clear-btn').addEventListener('click', clearAll);
    document.getElementById('enc-pick-output').addEventListener('click', async () => {
      if (isElectron) {
        const folder = await window.electronAPI.openFolder();
        if (folder) document.getElementById('enc-output-path').value = folder;
      }
    });
  }

  async function handleEncrypt() {
    const password     = document.getElementById('enc-password').value;
    const outputFolder = document.getElementById('enc-output-path').value;
    const btn          = document.getElementById('enc-encrypt-btn');
    const progress     = document.getElementById('enc-progress');
    const progressBar  = document.getElementById('enc-progress-bar');
    const status       = document.getElementById('enc-progress-status');
    const result       = document.getElementById('enc-result');

    // Animate to loading state
    btn.querySelector('.btn-text').classList.add('hidden');
    btn.querySelector('.btn-loader').classList.remove('hidden');
    btn.disabled = true;

    result.classList.add('hidden');
    progress.classList.remove('hidden');

    try {
      // Progress step 1: reading
      progressBar.style.width = '20%';
      status.textContent = 'Reading file...';
      await new Promise(r => setTimeout(r, 200));

      // Progress step 2: deriving key
      progressBar.style.width = '45%';
      status.textContent = 'Deriving encryption key (PBKDF2-SHA256)...';
      await new Promise(r => setTimeout(r, 100));

      // Progress step 3: encrypting
      progressBar.style.width = '70%';
      status.textContent = 'Encrypting with AES-256-GCM...';
      const encryptedData = await CryptoEngine.encrypt(selectedFile.data, password);

      // Progress step 4: saving
      progressBar.style.width = '90%';
      status.textContent = 'Saving encrypted file...';
      await new Promise(r => setTimeout(r, 100));

      // Determine output path
      const outName = selectedFile.name + '.enc';
      let savedPath = outName;

      if (isElectron) {
        const suggestedPath = outputFolder
          ? outputFolder + '\\' + outName
          : (selectedFile.path ? selectedFile.path + '.enc' : outName);

        savedPath = await window.electronAPI.saveFile({
          defaultPath: suggestedPath,
          filters: [{ name: 'Encrypted Files', extensions: ['enc'] }]
        });

        if (!savedPath) {
          throw new Error('CANCELLED: Save was cancelled by user.');
        }

        // Convert Uint8Array to base64 for IPC transfer
        const b64 = btoa(String.fromCharCode(...encryptedData));
        const writeResult = await window.electronAPI.writeFile(savedPath, b64);
        if (!writeResult.success) throw new Error(writeResult.error);
      } else {
        // Browser download
        const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = outName; a.click();
        URL.revokeObjectURL(url);
      }

      progressBar.style.width = '100%';
      status.textContent = 'Encryption complete!';

      // Add to history
      HistoryManager.add({
        fileName:  selectedFile.name,
        operation: 'encrypt',
        timestamp: new Date().toISOString(),
        size:      selectedFile.size,
        outputPath: savedPath,
        status:    'success'
      });

      // Show success
      result.className = 'result-alert result-success';
      result.innerHTML = `
        <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="#10b981" stroke-width="2.2">
          <circle cx="10" cy="10" r="8"/><polyline class="check-animated" points="6,10 9,13 14,7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div>
          <strong>File Encrypted Successfully</strong>
          <p>${selectedFile.name} → ${savedPath.split(/[\\/]/).pop()} (${formatBytes(encryptedData.length)})</p>
          <p style="margin-top:4px; font-size:11px; opacity:0.7; font-family:'JetBrains Mono',monospace">AES-256-GCM · PBKDF2-SHA256 · ${encryptedData.length} bytes</p>
        </div>
      `;
      result.classList.remove('hidden');

      ToastManager.show(`"${selectedFile.name}" encrypted successfully!`, 'success');

      // Auto-clear password if setting is on
      const autoClear = document.getElementById('settings-auto-clear');
      if (autoClear?.checked) {
        document.getElementById('enc-password').value = '';
        document.getElementById('enc-confirm-password').value = '';
        updateStrengthMeter('');
        document.getElementById('enc-match-hint').textContent = '';
      }

    } catch (err) {
      progressBar.style.width = '100%';
      progressBar.style.background = 'var(--danger)';
      status.textContent = 'Encryption failed.';

      const message = err.message || 'Unknown error';
      if (!message.startsWith('CANCELLED')) {
        result.className = 'result-alert result-error';
        result.innerHTML = `
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="#ef4444" stroke-width="2">
            <circle cx="10" cy="10" r="8"/><path d="M10 6v5M10 14h.01" stroke-linecap="round"/>
          </svg>
          <div><strong>Encryption Failed</strong><p>${sanitizeHtml(message)}</p></div>
        `;
        result.classList.remove('hidden');
        ToastManager.show('Encryption failed: ' + message, 'error');

        HistoryManager.add({
          fileName:  selectedFile?.name || 'Unknown',
          operation: 'encrypt',
          timestamp: new Date().toISOString(),
          size:      selectedFile?.size || 0,
          status:    'error'
        });
      }

      // Reset progress bar color
      setTimeout(() => { progressBar.style.background = ''; }, 2000);
    } finally {
      btn.querySelector('.btn-text').classList.remove('hidden');
      btn.querySelector('.btn-loader').classList.add('hidden');
      btn.disabled = false;
      setTimeout(() => {
        progress.classList.add('hidden');
        progressBar.style.width = '0%';
      }, 3000);
    }
  }

  function clearAll() {
    clearFile();
    document.getElementById('enc-password').value = '';
    document.getElementById('enc-confirm-password').value = '';
    document.getElementById('enc-output-path').value = '';
    document.getElementById('enc-result').classList.add('hidden');
    document.getElementById('enc-progress').classList.add('hidden');
    updateStrengthMeter('');
    document.getElementById('enc-match-hint').textContent = '';
    checkEncryptReady();
  }

  return { init };
})();

// ─── Decrypt Page ─────────────────────────────────────────────────────────────

const DecryptPage = (() => {
  let selectedFile = null;

  function init() {
    setupDropZone();
    setupButtons();

    const passInput = document.getElementById('dec-password');
    const toggle    = document.getElementById('dec-pass-toggle');
    toggle.addEventListener('click', () => {
      const isHidden = passInput.type === 'password';
      passInput.type = isHidden ? 'text' : 'password';
      toggle.querySelector('.eye-open').style.display  = isHidden ? 'none' : '';
      toggle.querySelector('.eye-closed').style.display = isHidden ? '' : 'none';
    });
    passInput.addEventListener('input', checkDecryptReady);
  }

  function setupDropZone() {
    const zone   = document.getElementById('dec-drop-zone');
    const browse = document.getElementById('dec-browse-btn');
    const remove = document.getElementById('dec-remove-file');

    zone.addEventListener('click', (e) => {
      if (selectedFile && (e.target === remove || remove.contains(e.target))) return;
      if (!selectedFile) triggerFilePick();
    });
    browse.addEventListener('click', (e) => { e.stopPropagation(); triggerFilePick(); });
    remove.addEventListener('click', (e) => { e.stopPropagation(); clearFile(); });

    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) await loadFileFromNative(file);
    });
  }

  async function triggerFilePick() {
    if (isElectron) {
      const info = await window.electronAPI.openFile({
        filters: [
          { name: 'Encrypted Files', extensions: ['enc'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      if (!info) return;
      const result = await window.electronAPI.readFile(info.path);
      if (!result.success) { ToastManager.show('Failed to read file: ' + result.error, 'error'); return; }
      const data = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));
      setFile({ path: info.path, name: info.name, size: info.size, ext: info.ext, data });
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.enc,*';
      input.onchange = async () => { if (input.files[0]) await loadFileFromNative(input.files[0]); };
      input.click();
    }
  }

  async function loadFileFromNative(file) {
    const data = new Uint8Array(await file.arrayBuffer());
    setFile({ path: file.path || file.name, name: file.name, size: file.size, ext: file.name.split('.').pop() || 'enc', data });
  }

  function setFile(file) {
    selectedFile = file;
    const zone    = document.getElementById('dec-drop-zone');
    const inner   = document.getElementById('dec-drop-inner');
    const preview = document.getElementById('dec-file-preview');

    inner.classList.add('hidden');
    preview.classList.remove('hidden');
    zone.classList.add('has-file');

    document.getElementById('dec-file-ext-badge').textContent = getFileExtIcon(file.ext);
    document.getElementById('dec-file-name').textContent = file.name;
    document.getElementById('dec-file-size').textContent = formatBytes(file.size);
    checkDecryptReady();
  }

  function clearFile() {
    selectedFile = null;
    const zone    = document.getElementById('dec-drop-zone');
    const inner   = document.getElementById('dec-drop-inner');
    const preview = document.getElementById('dec-file-preview');
    inner.classList.remove('hidden');
    preview.classList.add('hidden');
    zone.classList.remove('has-file', 'drag-over');
    checkDecryptReady();
  }

  function checkDecryptReady() {
    const btn = document.getElementById('dec-decrypt-btn');
    const pw  = document.getElementById('dec-password').value;
    btn.disabled = !(selectedFile && pw.length >= 1);
  }

  function setupButtons() {
    document.getElementById('dec-decrypt-btn').addEventListener('click', handleDecrypt);
    document.getElementById('dec-clear-btn').addEventListener('click', clearAll);
    document.getElementById('dec-pick-output').addEventListener('click', async () => {
      if (isElectron) {
        const folder = await window.electronAPI.openFolder();
        if (folder) document.getElementById('dec-output-path').value = folder;
      }
    });
  }

  async function handleDecrypt() {
    const password     = document.getElementById('dec-password').value;
    const outputFolder = document.getElementById('dec-output-path').value;
    const btn          = document.getElementById('dec-decrypt-btn');
    const progress     = document.getElementById('dec-progress');
    const progressBar  = document.getElementById('dec-progress-bar');
    const status       = document.getElementById('dec-progress-status');
    const result       = document.getElementById('dec-result');

    btn.querySelector('.btn-text').classList.add('hidden');
    btn.querySelector('.btn-loader').classList.remove('hidden');
    btn.disabled = true;

    result.classList.add('hidden');
    progress.classList.remove('hidden');

    try {
      progressBar.style.width = '25%';
      status.textContent = 'Validating encrypted file...';
      await new Promise(r => setTimeout(r, 150));

      progressBar.style.width = '50%';
      status.textContent = 'Deriving key and decrypting...';

      const decryptedData = await CryptoEngine.decrypt(selectedFile.data, password);

      progressBar.style.width = '80%';
      status.textContent = 'Saving decrypted file...';
      await new Promise(r => setTimeout(r, 100));

      // Determine output name (strip .enc if present)
      const outName = selectedFile.name.endsWith('.enc')
        ? selectedFile.name.slice(0, -4)
        : 'decrypted_' + selectedFile.name;

      let savedPath = outName;

      if (isElectron) {
        const suggestedPath = outputFolder
          ? outputFolder + '\\' + outName
          : (selectedFile.path ? selectedFile.path.replace(/\.enc$/, '') : outName);

        savedPath = await window.electronAPI.saveFile({
          defaultPath: suggestedPath,
          filters: [{ name: 'All Files', extensions: ['*'] }]
        });

        if (!savedPath) throw new Error('CANCELLED');

        const b64 = btoa(String.fromCharCode(...decryptedData));
        const writeResult = await window.electronAPI.writeFile(savedPath, b64);
        if (!writeResult.success) throw new Error(writeResult.error);
      } else {
        const blob = new Blob([decryptedData], { type: 'application/octet-stream' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = outName; a.click();
        URL.revokeObjectURL(url);
      }

      progressBar.style.width = '100%';
      status.textContent = 'Decryption complete!';

      HistoryManager.add({
        fileName:  selectedFile.name,
        operation: 'decrypt',
        timestamp: new Date().toISOString(),
        size:      selectedFile.size,
        outputPath: savedPath,
        status:    'success'
      });

      result.className = 'result-alert result-success';
      result.innerHTML = `
        <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="#10b981" stroke-width="2.2">
          <circle cx="10" cy="10" r="8"/><polyline class="check-animated" points="6,10 9,13 14,7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div>
          <strong>File Decrypted Successfully</strong>
          <p>${selectedFile.name} → ${outName} (${formatBytes(decryptedData.length)})</p>
        </div>
      `;
      result.classList.remove('hidden');
      ToastManager.show(`"${selectedFile.name}" decrypted successfully!`, 'success');

    } catch (err) {
      const message = err.message || 'Unknown error';

      if (!message.startsWith('CANCELLED')) {
        progressBar.style.background = 'var(--danger)';
        status.textContent = 'Decryption failed.';

        let userMsg = message;
        let title   = 'Decryption Failed';

        if (message.includes('WRONG_PASSWORD')) {
          title   = 'Wrong Password';
          userMsg = 'The password you entered is incorrect. Please try again with the correct password.';
        } else if (message.includes('INVALID_FORMAT')) {
          title   = 'Invalid File Format';
          userMsg = 'This file was not encrypted by SecureCrypt or is corrupted. Only files encrypted with SecureCrypt can be decrypted here.';
        }

        result.className = 'result-alert result-error';
        result.innerHTML = `
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="#ef4444" stroke-width="2">
            <circle cx="10" cy="10" r="8"/><path d="M10 6v5M10 14h.01" stroke-linecap="round"/>
          </svg>
          <div><strong>${sanitizeHtml(title)}</strong><p>${sanitizeHtml(userMsg)}</p></div>
        `;
        result.classList.remove('hidden');
        ToastManager.show(title, 'error');

        HistoryManager.add({
          fileName:  selectedFile?.name || 'Unknown',
          operation: 'decrypt',
          timestamp: new Date().toISOString(),
          size:      selectedFile?.size || 0,
          status:    'error'
        });

        setTimeout(() => { progressBar.style.background = ''; }, 2000);
      }
    } finally {
      btn.querySelector('.btn-text').classList.remove('hidden');
      btn.querySelector('.btn-loader').classList.add('hidden');
      btn.disabled = false;
      setTimeout(() => {
        progress.classList.add('hidden');
        progressBar.style.width = '0%';
      }, 3000);
    }
  }

  function clearAll() {
    clearFile();
    document.getElementById('dec-password').value = '';
    document.getElementById('dec-output-path').value = '';
    document.getElementById('dec-result').classList.add('hidden');
    document.getElementById('dec-progress').classList.add('hidden');
    checkDecryptReady();
  }

  return { init };
})();

// ─── History Page ─────────────────────────────────────────────────────────────

const HistoryPage = (() => {
  let currentFilter = 'all';
  let searchQuery = '';

  function init() {
    document.getElementById('history-search').addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      render();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        render();
      });
    });

    document.getElementById('history-clear-btn').addEventListener('click', async () => {
      await HistoryManager.clear();
      render();
      ToastManager.show('History cleared', 'info');
    });
  }

  function render() {
    let records = HistoryManager.getAll();

    // Filter
    if (currentFilter !== 'all') {
      records = records.filter(r => r.operation === currentFilter);
    }

    // Search
    if (searchQuery) {
      records = records.filter(r => r.fileName.toLowerCase().includes(searchQuery));
    }

    const tbody = document.getElementById('history-table-body');
    const empty = document.getElementById('history-empty');

    if (records.length === 0) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    tbody.innerHTML = records.map(r => `
      <tr>
        <td style="font-family:'JetBrains Mono',monospace; font-size:12px; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap" title="${sanitizeHtml(r.fileName)}">${sanitizeHtml(r.fileName)}</td>
        <td><span class="op-badge ${r.operation === 'encrypt' ? 'op-encrypt' : 'op-decrypt'}">${r.operation === 'encrypt' ? '🔒 Encrypted' : '🔓 Decrypted'}</span></td>
        <td style="color:var(--text-secondary); font-size:12px">${formatDate(r.timestamp)}</td>
        <td style="font-family:'JetBrains Mono',monospace; font-size:12px">${formatBytes(r.size)}</td>
        <td><span class="${r.status === 'success' ? 'status-ok' : 'status-err'}">${r.status === 'success' ? '✓ Success' : '✗ Failed'}</span></td>
      </tr>
    `).join('');
  }

  return { init, render };
})();

// ─── Settings Page ────────────────────────────────────────────────────────────

const SettingsPage = (() => {
  function init() {
    // Dark mode toggle
    const darkToggle = document.getElementById('settings-dark-mode');
    darkToggle.checked = (localStorage.getItem('sc_theme') || 'dark') === 'dark';
    darkToggle.addEventListener('change', () => {
      const theme = darkToggle.checked ? 'dark' : 'light';
      document.body.dataset.theme = theme;
      localStorage.setItem('sc_theme', theme);
    });

    // Clear history
    document.getElementById('settings-clear-history').addEventListener('click', async () => {
      await HistoryManager.clear();
      ToastManager.show('History cleared successfully', 'success');
    });

    // Export logs
    document.getElementById('settings-export-logs').addEventListener('click', () => {
      const records = HistoryManager.getAll();
      const json    = JSON.stringify(records, null, 2);
      const blob    = new Blob([json], { type: 'application/json' });
      const url     = URL.createObjectURL(blob);
      const a       = document.createElement('a');
      a.href = url; a.download = `securecrypt-logs-${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
      ToastManager.show('Logs exported', 'info');
    });
  }

  return { init };
})();

// ─── Security: Sanitize HTML (prevent XSS) ───────────────────────────────────

function sanitizeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── Application Bootstrap ────────────────────────────────────────────────────

async function bootstrap() {
  // Staggered card entrance animations
  document.querySelectorAll('.card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(16px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 80 + i * 60);
  });

  // Initialize all modules
  UIController.init();
  EncryptPage.init();
  DecryptPage.init();
  HistoryPage.init();
  SettingsPage.init();

  // Load history
  await HistoryManager.load();
  HistoryPage.render();

  // Greet
  setTimeout(() => {
    ToastManager.show('SecureCrypt ready — AES-256-GCM active', 'info', 3000);
  }, 800);
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
