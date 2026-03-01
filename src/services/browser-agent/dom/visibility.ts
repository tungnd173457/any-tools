// Browser Agent - DOM Visibility Utilities
// Element visibility detection and bounding box utilities.
// Adapted from browser-use's service.py visibility logic.
// These functions run in page context via chrome.scripting.executeScript.

// ============================================================
// Element Visibility
// ============================================================

/**
 * Check if an element is visible based on computed style and bounding rect.
 * Combines CSS visibility checks with geometric checks.
 */
export function isElementVisible(el: Element): boolean {
    // Geometric check first (cheapest)
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;

    // Computed style check
    try {
        const style = window.getComputedStyle(el);
        if (style.display === 'none') return false;
        if (style.visibility === 'hidden') return false;
        if (style.opacity === '0') return false;

        // Check for zero-height clip (common CSS hiding technique)
        if (style.clip === 'rect(0px, 0px, 0px, 0px)' || style.clipPath === 'inset(100%)') return false;

        // Check for off-screen positioning
        const position = style.position;
        if (position === 'absolute' || position === 'fixed') {
            // Element might be positioned off-screen
            if (rect.right < 0 || rect.bottom < 0) return false;
            if (rect.left > window.innerWidth || rect.top > window.innerHeight * 3) return false;
        }
    } catch {
        // getComputedStyle may fail for some elements
        return true;
    }

    return true;
}

/**
 * Check if an element is within the current viewport.
 */
export function isInViewport(el: Element): boolean {
    const rect = el.getBoundingClientRect();
    return (
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
    );
}

/**
 * Check if a child element is contained within parent bounds.
 * Used for bounding box filtering of propagating interactive elements (e.g., <a>, <button>).
 * Adapted from browser-use's DOMTreeSerializer._is_contained.
 *
 * @param childRect - Bounding rect of the child element
 * @param parentRect - Bounding rect of the parent element
 * @param threshold - Percentage (0.0-1.0) of child that must be within parent
 */
export function isContained(
    childRect: { x: number; y: number; width: number; height: number },
    parentRect: { x: number; y: number; width: number; height: number },
    threshold: number = 0.8
): boolean {
    const xOverlap = Math.max(0,
        Math.min(childRect.x + childRect.width, parentRect.x + parentRect.width)
        - Math.max(childRect.x, parentRect.x)
    );
    const yOverlap = Math.max(0,
        Math.min(childRect.y + childRect.height, parentRect.y + parentRect.height)
        - Math.max(childRect.y, parentRect.y)
    );

    const intersectionArea = xOverlap * yOverlap;
    const childArea = childRect.width * childRect.height;

    if (childArea === 0) return false;

    return (intersectionArea / childArea) >= threshold;
}

// ============================================================
// Scroll Detection
// ============================================================

/**
 * Check if an element is scrollable.
 * Adapted from browser-use's EnhancedDOMTreeNode.is_actually_scrollable.
 */
export function isElementScrollable(el: Element): boolean {
    // Quick check: does content overflow?
    if (el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth) {
        return false;
    }

    // Check CSS overflow property
    try {
        const style = window.getComputedStyle(el);
        const overflow = style.overflow;
        const overflowX = style.overflowX;
        const overflowY = style.overflowY;

        const allowsScroll =
            ['auto', 'scroll', 'overlay'].includes(overflow) ||
            ['auto', 'scroll', 'overlay'].includes(overflowX) ||
            ['auto', 'scroll', 'overlay'].includes(overflowY);

        if (!allowsScroll) return false;

        // Content must actually overflow
        const hasVerticalScroll = el.scrollHeight > el.clientHeight + 1;
        const hasHorizontalScroll = el.scrollWidth > el.clientWidth + 1;

        return hasVerticalScroll || hasHorizontalScroll;
    } catch {
        return false;
    }
}

/**
 * Get scroll information for an element or the page.
 * Adapted from browser-use's EnhancedDOMTreeNode.scroll_info.
 */
export function getScrollInfo(el?: Element): {
    scrollTop: number;
    scrollLeft: number;
    scrollHeight: number;
    scrollWidth: number;
    clientHeight: number;
    clientWidth: number;
    pagesAbove: number;
    pagesBelow: number;
    canScrollUp: boolean;
    canScrollDown: boolean;
    canScrollLeft: boolean;
    canScrollRight: boolean;
} {
    let scrollTop: number, scrollLeft: number;
    let scrollHeight: number, scrollWidth: number;
    let clientHeight: number, clientWidth: number;

    if (!el || el === document.documentElement || el === document.body) {
        // Page-level scroll
        scrollTop = window.scrollY || document.documentElement.scrollTop;
        scrollLeft = window.scrollX || document.documentElement.scrollLeft;
        scrollHeight = document.documentElement.scrollHeight;
        scrollWidth = document.documentElement.scrollWidth;
        clientHeight = window.innerHeight;
        clientWidth = window.innerWidth;
    } else {
        scrollTop = el.scrollTop;
        scrollLeft = el.scrollLeft;
        scrollHeight = el.scrollHeight;
        scrollWidth = el.scrollWidth;
        clientHeight = el.clientHeight;
        clientWidth = el.clientWidth;
    }

    const contentAbove = Math.max(0, scrollTop);
    const contentBelow = Math.max(0, scrollHeight - clientHeight - scrollTop);
    const contentLeft = Math.max(0, scrollLeft);
    const contentRight = Math.max(0, scrollWidth - clientWidth - scrollLeft);

    return {
        scrollTop: Math.round(scrollTop),
        scrollLeft: Math.round(scrollLeft),
        scrollHeight: Math.round(scrollHeight),
        scrollWidth: Math.round(scrollWidth),
        clientHeight: Math.round(clientHeight),
        clientWidth: Math.round(clientWidth),
        pagesAbove: clientHeight > 0 ? Math.round(contentAbove / clientHeight * 10) / 10 : 0,
        pagesBelow: clientHeight > 0 ? Math.round(contentBelow / clientHeight * 10) / 10 : 0,
        canScrollUp: contentAbove > 0,
        canScrollDown: contentBelow > 0,
        canScrollLeft: contentLeft > 0,
        canScrollRight: contentRight > 0,
    };
}

/**
 * Get human-readable scroll info text for display in serialized tree.
 * Adapted from browser-use's EnhancedDOMTreeNode.get_scroll_info_text.
 */
export function getScrollInfoText(el?: Element): string {
    const info = getScrollInfo(el);
    const parts: string[] = [];

    if (info.scrollHeight > info.clientHeight) {
        parts.push(`${info.pagesAbove}↑ ${info.pagesBelow}↓`);
    }
    if (info.scrollWidth > info.clientWidth) {
        parts.push(`${Math.round(info.scrollLeft)}← ${Math.round(info.scrollWidth - info.clientWidth - info.scrollLeft)}→`);
    }

    return parts.length > 0 ? `scroll: ${parts.join(' ')}` : '';
}

// ============================================================
// Cross-Frame Visibility
// ============================================================

/**
 * Check if an element is visible across all parent frames (iframes).
 * Adapted from browser-use's DomService.is_element_visible_according_to_all_parents.
 *
 * browser-use approach:
 *   Uses CDP DOMSnapshot bounds and traverses frame hierarchy from child up to root,
 *   adjusting coordinates by iframe offsets and scroll positions.
 *
 * Chrome Extension adaptation:
 *   Uses getBoundingClientRect() (viewport-relative) and window.frameElement to
 *   traverse up through same-origin parent frames. For cross-origin iframes,
 *   traversal stops (we assume visible if CSS allows it).
 *
 * Algorithm:
 *   1. Check CSS visibility (display, visibility, opacity) — same as isElementVisible
 *   2. Check if element has non-zero bounding rect
 *   3. Check if element is within viewport + threshold in current frame
 *   4. Traverse up through parent frames via window.frameElement:
 *      - Get the iframe element's rect in parent frame
 *      - Check if the iframe itself is within parent viewport + threshold
 *      - Continue until top-level window or cross-origin boundary
 *
 * @param el - Element to check
 * @param viewportThreshold - Extra pixels beyond viewport to consider visible (default 1000)
 * @returns true if element is visible across all accessible parent frames
 */
export function isVisibleAcrossFrames(el: Element, viewportThreshold: number = 1000): boolean {
    // Step 1: Basic CSS visibility check
    try {
        const style = window.getComputedStyle(el);
        if (style.display === 'none') return false;
        if (style.visibility === 'hidden') return false;
        try {
            if (parseFloat(style.opacity) <= 0) return false;
        } catch { /* non-numeric opacity, ignore */ }
    } catch {
        // Can't get computed style — assume visible
    }

    // Step 2: Check bounding rect in current frame
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;

    // Step 3: Check if within current frame's viewport + threshold
    const currentWindow = el.ownerDocument.defaultView;
    if (!currentWindow) return false;

    const inCurrentViewport = (
        rect.left < currentWindow.innerWidth + viewportThreshold &&
        rect.right > -viewportThreshold &&
        rect.top < currentWindow.innerHeight + viewportThreshold &&
        rect.bottom > -viewportThreshold
    );

    if (!inCurrentViewport) return false;

    // Step 4: Traverse up through parent frames
    // Each iteration checks if the iframe element is visible in its parent frame
    let currentWin: Window = currentWindow;

    while (true) {
        // Check if we're in the top-level window
        if (currentWin === currentWin.parent || !currentWin.parent) {
            break; // Reached top-level, element is visible
        }

        // Try to access the iframe element in the parent frame
        // This will throw for cross-origin iframes
        let frameElement: Element | null;
        try {
            frameElement = currentWin.frameElement as Element | null;
        } catch {
            // Cross-origin: can't traverse further
            // Assume visible since CSS check passed in current frame
            break;
        }

        if (!frameElement) {
            break; // No frame element (detached or top-level)
        }

        // Check CSS visibility of the iframe element itself
        try {
            const frameStyle = frameElement.ownerDocument.defaultView!.getComputedStyle(frameElement);
            if (frameStyle.display === 'none') return false;
            if (frameStyle.visibility === 'hidden') return false;
            try {
                if (parseFloat(frameStyle.opacity) <= 0) return false;
            } catch { /* ignore */ }
        } catch {
            // Can't access parent's computed style
        }

        // Check if iframe is within parent frame's viewport + threshold
        const frameRect = frameElement.getBoundingClientRect();

        if (frameRect.width === 0 && frameRect.height === 0) return false;

        let parentWindow: Window;
        try {
            parentWindow = currentWin.parent;
        } catch {
            break; // Can't access parent
        }

        const iframeInParentViewport = (
            frameRect.left < parentWindow.innerWidth + viewportThreshold &&
            frameRect.right > -viewportThreshold &&
            frameRect.top < parentWindow.innerHeight + viewportThreshold &&
            frameRect.bottom > -viewportThreshold
        );

        if (!iframeInParentViewport) return false;

        // Move up to parent window for next iteration
        currentWin = parentWindow;
    }

    return true;
}

/**
 * Check if an element is visible within an iframe's scrollable area.
 * Helper for cross-frame visibility — checks if element's position
 * falls within the iframe's scroll viewport.
 *
 * @param el - Element inside the iframe
 * @param viewportThreshold - Extra pixels beyond visible area
 */
export function isVisibleWithinIframeScroll(el: Element, viewportThreshold: number = 1000): boolean {
    const rect = el.getBoundingClientRect();
    const win = el.ownerDocument.defaultView;
    if (!win) return false;

    // In an iframe, getBoundingClientRect is relative to the iframe's viewport
    // So we just check if element is within the viewport + threshold
    return (
        rect.bottom > -viewportThreshold &&
        rect.top < win.innerHeight + viewportThreshold &&
        rect.right > -viewportThreshold &&
        rect.left < win.innerWidth + viewportThreshold
    );
}
