// Options page script
import { Settings } from '../shared/types';

// Load saved settings
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupTabs();
    setupApiKeyToggle();

    // Add event listeners
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
    }
});

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = (btn as HTMLElement).dataset.tab;
            if (!tabId) return;

            // Deactivate all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Activate selected
            btn.classList.add('active');
            const content = document.getElementById(`tab-${tabId}`);
            if (content) content.classList.add('active');
        });
    });
}

function setupApiKeyToggle() {
    // OpenAI API Key toggle
    const openaiToggleBtn = document.getElementById('toggleApiKeyVisibility');
    const openaiApiKeyInput = document.getElementById('openaiApiKey') as HTMLInputElement;

    if (openaiToggleBtn && openaiApiKeyInput) {
        openaiToggleBtn.addEventListener('click', () => {
            if (openaiApiKeyInput.type === 'password') {
                openaiApiKeyInput.type = 'text';
                openaiToggleBtn.textContent = '🙈';
            } else {
                openaiApiKeyInput.type = 'password';
                openaiToggleBtn.textContent = '👁';
            }
        });
    }

    // Google API Key toggle
    const googleToggleBtn = document.getElementById('toggleGoogleApiKeyVisibility');
    const googleApiKeyInput = document.getElementById('googleApiKey') as HTMLInputElement;

    if (googleToggleBtn && googleApiKeyInput) {
        googleToggleBtn.addEventListener('click', () => {
            if (googleApiKeyInput.type === 'password') {
                googleApiKeyInput.type = 'text';
                googleToggleBtn.textContent = '🙈';
            } else {
                googleApiKeyInput.type = 'password';
                googleToggleBtn.textContent = '👁';
            }
        });
    }
}

function loadSettings() {
    chrome.storage.sync.get({
        sourceLang: 'auto',
        targetLang: 'vi',
        popupMode: 'button',
        googleApiKey: '',
        openaiApiKey: '',
        chatModel: 'gpt-4.1-mini',
    }, (settings: Settings) => {
        const sourceLangSelect = document.getElementById('sourceLang') as HTMLSelectElement;
        const targetLangSelect = document.getElementById('targetLang') as HTMLSelectElement;
        const googleApiKeyInput = document.getElementById('googleApiKey') as HTMLInputElement;
        const openaiApiKeyInput = document.getElementById('openaiApiKey') as HTMLInputElement;
        const chatModelSelect = document.getElementById('chatModel') as HTMLSelectElement;

        if (sourceLangSelect) sourceLangSelect.value = settings.sourceLang;
        if (targetLangSelect) targetLangSelect.value = settings.targetLang;
        if (googleApiKeyInput) googleApiKeyInput.value = settings.googleApiKey || '';
        if (openaiApiKeyInput) openaiApiKeyInput.value = settings.openaiApiKey || '';
        if (chatModelSelect) chatModelSelect.value = settings.chatModel || 'gpt-4.1-mini';

        // Set radio button
        const modeRadio = document.getElementById(`mode${capitalize(settings.popupMode)}`) as HTMLInputElement;
        if (modeRadio) {
            modeRadio.checked = true;
        }
    });
}

function saveSettings() {
    const sourceLangSelect = document.getElementById('sourceLang') as HTMLSelectElement;
    const targetLangSelect = document.getElementById('targetLang') as HTMLSelectElement;
    const checkedRadio = document.querySelector('input[name="popupMode"]:checked') as HTMLInputElement;
    const chatModelSelect = document.getElementById('chatModel') as HTMLSelectElement;

    if (!sourceLangSelect || !targetLangSelect || !checkedRadio) return;

    const sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;
    const popupMode = checkedRadio.value as Settings['popupMode'];

    // Validate that source and target are different (unless source is auto)
    if (sourceLang !== 'auto' && sourceLang === targetLang) {
        showStatus('Source and target languages should be different', 'error');
        return;
    }

    const settingsToSave: Record<string, any> = {
        sourceLang: sourceLang,
        targetLang: targetLang,
        popupMode: popupMode,
    };

    // Translator settings
    const googleApiKeyInput = document.getElementById('googleApiKey') as HTMLInputElement;
    if (googleApiKeyInput) {
        settingsToSave.googleApiKey = googleApiKeyInput.value.trim();
    }

    // Chat settings
    const openaiApiKeyInput = document.getElementById('openaiApiKey') as HTMLInputElement;
    if (openaiApiKeyInput) {
        settingsToSave.openaiApiKey = openaiApiKeyInput.value.trim();
    }
    if (chatModelSelect) {
        settingsToSave.chatModel = chatModelSelect.value;
    }

    chrome.storage.sync.set(settingsToSave, () => {
        showStatus('Settings saved successfully!', 'success');
    });
}

function showStatus(message: string, type: 'success' | 'error') {
    const statusDiv = document.getElementById('status');
    if (!statusDiv) return;

    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';

    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}

function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
