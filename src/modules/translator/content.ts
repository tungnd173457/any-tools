// Content script for text selection and translation popup
import { Settings, TranslationResult, TranslationResponse } from '../../shared/types';

// ── State ────────────────────────────────────────────────────────────────────
let translationPopup: HTMLDivElement | null = null;
let translateButton: HTMLDivElement | null = null;
let selectionTimer: number | null = null;
let lastSelectedText = '';
let lastRect: DOMRect | null = null;

let settings: Settings = {
  sourceLang: 'auto',
  targetLang: 'vi',
  popupMode: 'button',
};

// ── Language list ─────────────────────────────────────────────────────────────
const LANGUAGES: { code: string; name: string }[] = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'th', name: 'Thai' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function log(...args: any[]) {
  console.log('[Quick Translate]:', ...args);
}

function escapeHtml(text: string): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function langName(code: string): string {
  return LANGUAGES.find(l => l.code === code)?.name ?? code.toUpperCase();
}

function buildLangOptions(selectedCode: string, includeAuto: boolean): string {
  return LANGUAGES
    .filter(l => includeAuto || l.code !== 'auto')
    .map(l => `<option value="${l.code}" ${l.code === selectedCode ? 'selected' : ''}>${l.name}</option>`)
    .join('');
}

// ── Settings ──────────────────────────────────────────────────────────────────
function loadSettings() {
  chrome.runtime.sendMessage({ action: 'getSettings' }, (response: TranslationResponse) => {
    if (chrome.runtime.lastError) return;
    if (response?.success && response.data) {
      settings = response.data as unknown as Settings;
    }
  });
}

function saveSettings() {
  chrome.storage.sync.set({
    sourceLang: settings.sourceLang,
    targetLang: settings.targetLang,
  });
}

loadSettings();

// ── Selection listener ────────────────────────────────────────────────────────
document.addEventListener('mouseup', handleTextSelection);
document.addEventListener('keyup', handleTextSelection);

function handleTextSelection(event: MouseEvent | KeyboardEvent) {
  if (selectionTimer) clearTimeout(selectionTimer);

  selectionTimer = window.setTimeout(() => {
    const selection = window.getSelection();
    if (!selection) return;

    const selectedText = selection.toString().trim();

    removeTranslateButton();

    const target = event.target as HTMLElement;
    if (target.closest('.quick-translate-popup') || target.closest('.quick-translate-button')) return;

    removeTranslationPopup();

    if (selectedText.length === 0) return;
    if (settings.popupMode === 'disabled') return;

    if (selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) return;

    lastSelectedText = selectedText;
    lastRect = rect;

    if (settings.popupMode === 'button') {
      showTranslateButton(rect, selectedText);
    } else if (settings.popupMode === 'auto') {
      translateText(selectedText, rect);
    }
  }, 50);
}

// ── Translate trigger button ──────────────────────────────────────────────────
function showTranslateButton(rect: DOMRect, text: string) {
  translateButton = document.createElement('div');
  translateButton.className = 'quick-translate-button';
  translateButton.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
      <span style="font-size:10.5px;font-weight:700;letter-spacing:0.2px">Translate</span>
    `;

  translateButton.style.position = 'absolute';
  translateButton.style.left = `${rect.left + window.scrollX + rect.width / 2 - 46}px`;
  translateButton.style.top = `${rect.top + window.scrollY - 38}px`;
  translateButton.style.zIndex = '2147483647';

  document.body.appendChild(translateButton);

  translateButton.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
  translateButton.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    removeTranslateButton();
    translateText(text, rect);
  });
}

function removeTranslateButton() {
  translateButton?.remove();
  translateButton = null;
}

// ── Translation call ──────────────────────────────────────────────────────────
function translateText(text: string, rect: DOMRect) {
  showLoadingPopup(rect);

  chrome.runtime.sendMessage(
    { action: 'translate', text, sourceLang: settings.sourceLang, targetLang: settings.targetLang },
    (response: TranslationResponse) => {
      if (chrome.runtime.lastError) { showErrorPopup('Connection error', rect); return; }
      if (response?.success && response.data) {
        showTranslationPopup(text, response.data as unknown as TranslationResult, rect);
      } else {
        showErrorPopup(response?.error || 'Translation failed', rect);
      }
    }
  );
}

// ── Loading popup ─────────────────────────────────────────────────────────────
function showLoadingPopup(rect: DOMRect) {
  removeTranslationPopup();
  translationPopup = document.createElement('div');
  translationPopup.className = 'quick-translate-popup';
  translationPopup.innerHTML = `
      <div class="qt-loading">
        <div class="qt-spinner"></div>
        <span>Translating…</span>
      </div>
    `;
  positionPopup(translationPopup, rect);
}

// ── Result popup ──────────────────────────────────────────────────────────────
function buildHeader(sourceVal: string, targetVal: string): string {
  return `
      <div class="qt-header" id="qt-header">
        <select class="qt-lang-select" id="qt-src-select" title="Source language">
          ${buildLangOptions(sourceVal, true)}
        </select>

        <button class="qt-swap-btn" id="qt-swap" title="Swap languages">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
          </svg>
        </button>

        <select class="qt-lang-select" id="qt-tgt-select" title="Target language">
          ${buildLangOptions(targetVal, false)}
        </select>

        <button class="qt-close-btn" id="qt-close" title="Close">&times;</button>
      </div>
    `;
}

function showTranslationPopup(originalText: string, translationData: TranslationResult, rect: DOMRect) {
  removeTranslationPopup();

  const translation = translationData.translation || 'No translation available';
  const detectedLang = translationData.detectedLanguage;

  translationPopup = document.createElement('div');
  translationPopup.className = 'quick-translate-popup';

  translationPopup.innerHTML = `
      ${buildHeader(settings.sourceLang, settings.targetLang)}

      <div class="qt-body">
        <div class="qt-section">
          <div class="qt-section-label">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Original
            ${detectedLang ? `<span class="qt-detected">🔍 ${escapeHtml(detectedLang)}</span>` : ''}
          </div>
          <div class="qt-text">${escapeHtml(originalText)}</div>
        </div>

        <div class="qt-section">
          <div class="qt-section-label">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            Translation
          </div>
          <div class="qt-text qt-text-result">${escapeHtml(translation)}</div>
        </div>
      </div>

      <div class="qt-footer">
        <button class="qt-copy-btn" id="qt-copy">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy
        </button>
      </div>
    `;

  positionPopup(translationPopup, rect);

  bindPopupEvents(translationPopup, originalText, rect, translation);
}

function bindPopupEvents(
  popup: HTMLDivElement,
  originalText: string,
  rect: DOMRect,
  currentTranslation: string
) {
  // Close
  popup.querySelector('#qt-close')?.addEventListener('click', e => {
    e.stopPropagation();
    removeTranslationPopup();
  });

  // Copy translation
  const copyBtn = popup.querySelector('#qt-copy') as HTMLButtonElement | null;
  copyBtn?.addEventListener('click', e => {
    e.stopPropagation();
    navigator.clipboard.writeText(currentTranslation).then(() => {
      if (!copyBtn) return;
      copyBtn.classList.add('copied');
      copyBtn.innerHTML = `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              Copied!
            `;
      setTimeout(() => {
        if (!copyBtn) return;
        copyBtn.classList.remove('copied');
        copyBtn.innerHTML = `
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copy
                `;
      }, 1800);
    });
  });

  // Source lang change → re-translate
  const srcSelect = popup.querySelector('#qt-src-select') as HTMLSelectElement | null;
  srcSelect?.addEventListener('change', e => {
    e.stopPropagation();
    settings.sourceLang = srcSelect.value;
    saveSettings();
    translateText(originalText, rect);
  });

  // Target lang change → re-translate
  const tgtSelect = popup.querySelector('#qt-tgt-select') as HTMLSelectElement | null;
  tgtSelect?.addEventListener('change', e => {
    e.stopPropagation();
    settings.targetLang = tgtSelect.value;
    saveSettings();
    translateText(originalText, rect);
  });

  // Swap button: swap src ↔ tgt (skip auto → tgt direction)
  popup.querySelector('#qt-swap')?.addEventListener('click', e => {
    e.stopPropagation();
    if (settings.sourceLang === 'auto') return; // nothing to swap when detecting
    const tmp = settings.sourceLang;
    settings.sourceLang = settings.targetLang;
    settings.targetLang = tmp;
    saveSettings();
    translateText(originalText, rect);
  });

  // Prevent closing on inside click
  popup.addEventListener('click', e => e.stopPropagation());
  popup.addEventListener('mousedown', e => e.stopPropagation());

  // Close on outside click (deferred)
  window.setTimeout(() => {
    document.addEventListener('mousedown', handleOutsideClick);
  }, 120);
}

// ── Error popup ───────────────────────────────────────────────────────────────
function showErrorPopup(errorMessage: string, rect: DOMRect) {
  removeTranslationPopup();

  translationPopup = document.createElement('div');
  translationPopup.className = 'quick-translate-popup';
  translationPopup.innerHTML = `
      ${buildHeader(settings.sourceLang, settings.targetLang)}
      <div class="qt-error">
        <div class="qt-error-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div class="qt-error-content">
          <div class="qt-error-title">Translation failed</div>
          <div class="qt-error-msg">${escapeHtml(errorMessage)}</div>
        </div>
      </div>
    `;

  positionPopup(translationPopup, rect);

  translationPopup.querySelector('#qt-close')?.addEventListener('click', removeTranslationPopup);
  translationPopup.addEventListener('click', e => e.stopPropagation());
}

// ── Popup positioning ─────────────────────────────────────────────────────────
// Uses position:fixed so rect (viewport coords) maps directly — no scroll math needed.
// ── Popup positioning ─────────────────────────────────────────────────────────
// Uses position:absolute so it stays with the text when scrolling.
function positionPopup(popup: HTMLDivElement, rect: DOMRect) {
  popup.style.position = 'absolute';
  popup.style.zIndex = '2147483647';
  // Mount off-screen first so we can measure real rendered dimensions
  popup.style.visibility = 'hidden';
  popup.style.top = '-9999px';
  popup.style.left = '-9999px';
  document.body.appendChild(popup);

  const pw = popup.offsetWidth || 360;
  const ph = popup.offsetHeight || 240;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const GAP = 10;

  // ── Vertical logic (using viewport coordinates to decide direction) ────────
  const spaceBelow = vh - rect.bottom;
  const spaceAbove = rect.top;

  let vTop: number; // Viewport-relative top
  if (spaceBelow >= ph + GAP) {
    vTop = rect.bottom + GAP;
  } else if (spaceAbove >= ph + GAP) {
    vTop = rect.top - ph - GAP;
  } else {
    vTop = spaceBelow >= spaceAbove ? rect.bottom + GAP : Math.max(GAP, rect.top - ph - GAP);
  }

  // ── Horizontal logic: center relative to selection ────────────────────────
  let left = rect.left + (rect.width / 2) - (pw / 2);

  // Clamp within viewport horizontally
  if (left + pw > vw - GAP) left = vw - pw - GAP;
  if (left < GAP) left = GAP;

  // Convert to absolute coordinates (relative to document)
  popup.style.top = `${vTop + window.scrollY}px`;
  popup.style.left = `${left + window.scrollX}px`;
  popup.style.visibility = 'visible';
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
function removeTranslationPopup() {
  translationPopup?.remove();
  translationPopup = null;
  document.removeEventListener('mousedown', handleOutsideClick);
}

function handleOutsideClick(event: MouseEvent) {
  const target = event.target as Node;
  if (translationPopup && !translationPopup.contains(target)) {
    removeTranslationPopup();
  }
}

// ── Settings sync ─────────────────────────────────────────────────────────────
chrome.storage.onChanged.addListener((_changes, namespace) => {
  if (namespace === 'sync') loadSettings();
});
