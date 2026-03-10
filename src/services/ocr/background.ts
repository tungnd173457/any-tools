// OCR module background script
// Handles OCR API calls, screenshot capture, and image picker activation

import { extractTextFromImage } from './OCRService';

// Crop screenshot using OffscreenCanvas (works in service worker)
async function cropScreenshot(
    dataUrl: string,
    rect: { x: number; y: number; width: number; height: number },
    devicePixelRatio: number
): Promise<string> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const sx = Math.round(rect.x * devicePixelRatio);
    const sy = Math.round(rect.y * devicePixelRatio);
    const sw = Math.round(rect.width * devicePixelRatio);
    const sh = Math.round(rect.height * devicePixelRatio);

    const clampedW = Math.min(sw, bitmap.width - sx);
    const clampedH = Math.min(sh, bitmap.height - sy);

    const canvas = new OffscreenCanvas(clampedW, clampedH);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, sx, sy, clampedW, clampedH, 0, 0, clampedW, clampedH);
    bitmap.close();

    const resultBlob = await canvas.convertToBlob({ type: 'image/png' });
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(resultBlob);
    });
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    // --- OCR: Extract text from image ---
    if (request.action === 'ocrExtractText') {
        const { imageDataUrl } = request;

        chrome.storage.sync.get(['openaiApiKey'], async (data: any) => {
            try {
                const text = await extractTextFromImage(
                    imageDataUrl,
                    data.openaiApiKey || ''
                );
                chrome.runtime.sendMessage({
                    action: 'ocrResult',
                    text,
                });
            } catch (err: any) {
                chrome.runtime.sendMessage({
                    action: 'ocrError',
                    error: err.message || 'OCR extraction failed',
                });
            }
        });

        sendResponse({ success: true });
        return true;
    }

    // --- OCR: Capture screenshot for OCR ---
    if (request.action === 'ocrScreenshotAreaSelected') {
        const rect = request.rect;
        const devicePixelRatio = request.devicePixelRatio || 1;

        if (!rect || rect.width < 5 || rect.height < 5) {
            return false;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, async () => {
            try {
                const dataUrl = await chrome.tabs.captureVisibleTab(
                    undefined as any,
                    { format: 'png' }
                );

                const croppedDataUrl = await cropScreenshot(dataUrl, rect, devicePixelRatio);

                chrome.runtime.sendMessage({
                    action: 'ocrScreenshotCaptured',
                    imageUrl: croppedDataUrl,
                });
            } catch (err: any) {
                console.error('OCR screenshot capture failed:', err);
                chrome.runtime.sendMessage({
                    action: 'ocrError',
                    error: err.message || 'Failed to capture screenshot',
                });
            }
        });

        return true;
    }

    // --- OCR: Start image picker on active tab ---
    if (request.action === 'ocrStartImagePicker') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0]?.id;
            if (tabId) {
                chrome.tabs.sendMessage(tabId, { action: 'ocrStartImagePicker' });
            }
        });
        sendResponse({ success: true });
        return true;
    }

    // --- OCR: Start screenshot selection on active tab ---
    if (request.action === 'ocrStartScreenshot') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0]?.id;
            if (tabId) {
                chrome.tabs.sendMessage(tabId, { action: 'ocrStartScreenshot' });
            }
        });
        sendResponse({ success: true });
        return true;
    }
});
