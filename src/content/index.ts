
// Main content script
// Integrates all tool modules

// Import translator module logic and styles
import '../modules/translator/content.css';
import '../modules/translator/content.ts';

// Chat module selection listener
// Listens for text selection and sends it to the sidepanel

let lastSelection = '';

const handleSelection = () => {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';

    if (text !== lastSelection && text.length > 0) {
        lastSelection = text;
        try {
            chrome.runtime.sendMessage({
                action: 'textSelected',
                text: text
            });
        } catch (e) {
            // Extension context invalidated or sidepanel not open
        }
    } else if (text.length === 0 && lastSelection.length > 0) {
        lastSelection = '';
        try {
            chrome.runtime.sendMessage({
                action: 'textSelected',
                text: ''
            });
        } catch (e) {
            // Extension context invalidated
        }
    }
};

// Debounce function to limit message frequency
function debounce(func: Function, wait: number) {
    let timeout: any;
    return function executedFunction(...args: any[]) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const debouncedHandleSelection = debounce(handleSelection, 500);

document.addEventListener('mouseup', debouncedHandleSelection);
document.addEventListener('keyup', debouncedHandleSelection);

console.log('AnyTools Content Script Loaded');
