// Content script for text selection and translation popup
import { Settings, TranslationResult, TranslationResponse } from '../../shared/types';

let translationPopup: HTMLDivElement | null = null;
let translateButton: HTMLDivElement | null = null;
let selectionTimer: number | null = null;
let settings: Settings = {
    sourceLang: 'auto',
    targetLang: 'vi',
    popupMode: 'button' // button, auto, disabled
};

// Debug flag
const DEBUG = true;

function log(...args: any[]) {
    if (DEBUG) console.log('[Quick Translate]:', ...args);
}

// Load settings on initialization
loadSettings();

// Listen for text selection
// We use mouseup for end of selection processing
document.addEventListener('mouseup', handleTextSelection);
document.addEventListener('keyup', handleTextSelection);

function loadSettings() {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (response: TranslationResponse) => {
        if (chrome.runtime.lastError) {
            log('Error loading settings:', chrome.runtime.lastError);
            return;
        }
        if (response && response.success && response.data) {
            settings = response.data as unknown as Settings;
            log('Settings loaded:', settings);
        }
    });
}

function handleTextSelection(event: MouseEvent | KeyboardEvent) {
    // Debounce to prevent multiple calls during triple-click
    if (selectionTimer) {
        clearTimeout(selectionTimer);
    }

    selectionTimer = window.setTimeout(() => {
        const selection = window.getSelection();
        if (!selection) return;

        const selectedText = selection.toString().trim();

        log('Selection detected:', selectedText.substring(0, 20) + '...');

        // Remove existing button and popup
        removeTranslateButton();

        // If clicking inside the popup, do nothing (handled by stopPropagation usually)
        const target = event.target as HTMLElement;
        if (target.closest('.quick-translate-popup') || target.closest('.quick-translate-button')) {
            return;
        }

        removeTranslationPopup();

        if (selectedText.length === 0) {
            return;
        }

        if (settings.popupMode === 'disabled') {
            log('Popup mode disabled');
            return;
        }

        // Get safe range
        if (selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Check if rect is valid
        if (rect.width === 0 || rect.height === 0) {
            log('Invalid selection rect');
            return;
        }

        if (settings.popupMode === 'button') {
            showTranslateButton(rect, selectedText);
        } else if (settings.popupMode === 'auto') {
            translateText(selectedText, rect);
        }
    }, 300); // Increased timeout to catch triple-clicks
}

function showTranslateButton(rect: DOMRect, text: string) {
    log('Showing button');
    translateButton = document.createElement('div');
    translateButton.className = 'quick-translate-button';
    translateButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
    </svg>
  `;

    // Position the button above the selection
    translateButton.style.position = 'absolute';
    translateButton.style.left = `${rect.left + window.scrollX + (rect.width / 2) - 20}px`;
    translateButton.style.top = `${rect.top + window.scrollY - 45}px`;
    translateButton.style.zIndex = '2147483647';
    translateButton.style.cursor = 'pointer';

    // Ensure it's visible
    translateButton.style.display = 'flex';
    translateButton.style.visibility = 'visible';
    translateButton.style.opacity = '1';

    document.body.appendChild(translateButton);

    translateButton.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent clearing selection
        e.stopPropagation();
    });

    translateButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        log('Button clicked');
        removeTranslateButton();
        translateText(text, rect);
    });
}

function removeTranslateButton() {
    if (translateButton) {
        translateButton.remove();
        translateButton = null;
    }
}

function translateText(text: string, rect: DOMRect) {
    log('Translating text:', text.substring(0, 20));
    // Show loading popup
    showLoadingPopup(rect);

    // Request translation from background script
    chrome.runtime.sendMessage({
        action: 'translate',
        text: text,
        sourceLang: settings.sourceLang,
        targetLang: settings.targetLang
    }, (response: TranslationResponse) => {
        if (chrome.runtime.lastError) {
            showErrorPopup('Connection error', rect);
            return;
        }

        if (response && response.success && response.data) {
            showTranslationPopup(text, response.data as unknown as TranslationResult, rect);
        } else {
            showErrorPopup(response?.error || 'Translation failed', rect);
        }
    });
}

function showLoadingPopup(rect: DOMRect) {
    removeTranslationPopup();

    translationPopup = document.createElement('div');
    translationPopup.className = 'quick-translate-popup';
    translationPopup.innerHTML = `
    <div class="translate-loading">
      <div class="loading-spinner"></div>
      <span>Translating...</span>
    </div>
  `;

    positionPopup(translationPopup, rect);
    document.body.appendChild(translationPopup);
}

function showTranslationPopup(originalText: string, translationData: TranslationResult, rect: DOMRect) {
    log('Showing translation result');
    removeTranslationPopup();

    translationPopup = document.createElement('div');
    translationPopup.className = 'quick-translate-popup';

    const translation = translationData.translation || 'No translation available';

    translationPopup.innerHTML = `
    <div class="translate-header">
      <span class="translate-title">Translation</span>
      <button class="translate-close">&times;</button>
    </div>
    <div class="translate-content">
      <div class="translate-original">
        <div class="translate-label">Original</div>
        <div class="translate-text">${escapeHtml(originalText)}</div>
      </div>
      <div class="translate-result">
        <div class="translate-label">
          ${settings.sourceLang === 'auto' ? 'Auto' : settings.sourceLang.toUpperCase()} → ${settings.targetLang.toUpperCase()}
        </div>
        <div class="translate-text translate-text-result">${escapeHtml(translation)}</div>
      </div>
    </div>
  `;

    positionPopup(translationPopup, rect);
    document.body.appendChild(translationPopup);

    // Add close button handler
    const closeBtn = translationPopup.querySelector('.translate-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeTranslationPopup();
        });
    }

    // Prevent closing when clicking inside
    translationPopup.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Close on outside click
    window.setTimeout(() => {
        document.addEventListener('mousedown', handleOutsideClick);
    }, 100);
}

function showErrorPopup(errorMessage: string, rect: DOMRect) {
    log('Showing error');
    removeTranslationPopup();

    translationPopup = document.createElement('div');
    translationPopup.className = 'quick-translate-popup';
    translationPopup.innerHTML = `
    <div class="translate-header">
      <span class="translate-title">Error</span>
      <button class="translate-close">&times;</button>
    </div>
    <div class="translate-content">
      <div class="translate-error">
        ${escapeHtml(errorMessage)}
      </div>
    </div>
  `;

    positionPopup(translationPopup, rect);
    document.body.appendChild(translationPopup);

    const closeBtn = translationPopup.querySelector('.translate-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', removeTranslationPopup);
    }
}

function positionPopup(popup: HTMLDivElement, rect: DOMRect) {
    popup.style.position = 'absolute';
    popup.style.zIndex = '2147483647';

    // Calculate position
    // Place below by default
    let top = rect.bottom + window.scrollY + 10;
    let left = rect.left + window.scrollX;

    // Adjust if popup would go off screen
    const popupWidth = 350;
    const popupHeight = 200; // Estimated

    if (left + popupWidth > window.innerWidth) {
        left = Math.max(0, window.innerWidth - popupWidth - 20);
    }

    // If bottom is too close to edge, put it above
    if (top + popupHeight > document.body.scrollHeight) {
        // Try above
        top = rect.top + window.scrollY - popupHeight - 10;
    }

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
}

function removeTranslationPopup() {
    if (translationPopup) {
        translationPopup.remove();
        translationPopup = null;
        document.removeEventListener('mousedown', handleOutsideClick);
    }
}

function handleOutsideClick(event: MouseEvent) {
    if (translationPopup && !translationPopup.contains(event.target as Node)) {
        removeTranslationPopup();
    }
}

function escapeHtml(text: string): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        loadSettings();
    }
});
