// Screenshot Selection Logic

let isSelecting = false;
let startX = 0;
let startY = 0;
let selectionOverlay: HTMLDivElement | null = null;
let selectionBox: HTMLDivElement | null = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startScreenshot') {
        startSelection();
    }
    if (request.action === 'getPageContent') {
        const content = document.body.innerText || document.documentElement.innerText;
        sendResponse({ content, title: document.title });
    }
});

function startSelection() {
    if (selectionOverlay) return;

    selectionOverlay = document.createElement('div');
    selectionOverlay.style.position = 'fixed';
    selectionOverlay.style.top = '0';
    selectionOverlay.style.left = '0';
    selectionOverlay.style.width = '100vw';
    selectionOverlay.style.height = '100vh';
    selectionOverlay.style.zIndex = '2147483647'; // Max z-index
    selectionOverlay.style.cursor = 'crosshair';
    selectionOverlay.style.background = 'rgba(0, 0, 0, 0.2)'; // Slight dim handling

    document.body.appendChild(selectionOverlay);

    selectionOverlay.addEventListener('mousedown', onMouseDown);
}

function onMouseDown(e: MouseEvent) {
    if (!selectionOverlay) return;
    e.preventDefault();
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;

    selectionBox = document.createElement('div');
    selectionBox.style.position = 'fixed';
    selectionBox.style.border = '2px dashed #FFF';
    selectionBox.style.background = 'rgba(255, 255, 255, 0.1)';
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.pointerEvents = 'none'; // Allow mouse events to pass through to overlay
    selectionOverlay.appendChild(selectionBox);

    selectionOverlay.addEventListener('mousemove', onMouseMove);
    selectionOverlay.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e: MouseEvent) {
    if (!isSelecting || !selectionBox) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const left = Math.min(currentX, startX);
    const top = Math.min(currentY, startY);

    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
}

function onMouseUp(e: MouseEvent) {
    if (!isSelecting || !selectionBox || !selectionOverlay) return;

    isSelecting = false;

    // Cleanup
    selectionOverlay.removeEventListener('mousemove', onMouseMove);
    selectionOverlay.removeEventListener('mouseup', onMouseUp);
    selectionOverlay.removeEventListener('mousedown', onMouseDown); // Ensure cleanup

    const rect = {
        x: parseInt(selectionBox.style.left),
        y: parseInt(selectionBox.style.top),
        width: parseInt(selectionBox.style.width),
        height: parseInt(selectionBox.style.height)
    };

    // Remove overlay BEFORE capturing so it's not in the screenshot
    document.body.removeChild(selectionOverlay);
    selectionOverlay = null;
    selectionBox = null;

    // Small delay to let the browser repaint without the overlay
    setTimeout(() => {
        try {
            chrome.runtime.sendMessage({
                action: 'screenshotAreaSelected',
                rect: rect,
                devicePixelRatio: window.devicePixelRatio || 1
            });
        } catch (err) {
            console.error('Failed to send screenshot area:', err);
        }
    }, 100);
}
