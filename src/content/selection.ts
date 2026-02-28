// Chat module selection listener
// Listens for text selection and sends it to the sidepanel

import { debounce } from '../shared/utils';

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

const debouncedHandleSelection = debounce(handleSelection, 100);

document.addEventListener('mouseup', debouncedHandleSelection);
document.addEventListener('keyup', debouncedHandleSelection);
