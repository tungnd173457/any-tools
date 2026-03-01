// Browser Agent - DOM Serializer
// Utilities for serializing DOM tree data into text format for LLM consumption.
// These are standalone helper functions used by dom-tree-builder.ts
// or for post-processing serialized output.
// Adapted from browser-use's serializer/serializer.py.

// ============================================================
// Attribute Helpers
// ============================================================

/** Attributes to include in serialized output */
const DEFAULT_ATTRIBUTES = [
    'title', 'type', 'checked', 'id', 'name', 'role', 'value',
    'placeholder', 'alt', 'aria-label', 'aria-expanded', 'aria-checked',
    'aria-selected', 'data-state', 'disabled', 'readonly', 'required',
    'selected', 'href', 'src', 'for', 'action', 'method',
    'pattern', 'min', 'max', 'minlength', 'maxlength', 'step',
    'accept', 'multiple', 'inputmode', 'autocomplete', 'contenteditable',
];

/**
 * Build a formatted attributes string for an element.
 * Adapted from browser-use's DOMTreeSerializer._build_attributes_string.
 *
 * @param el - DOM element
 * @param includeAttributes - List of attribute names to include
 * @returns Formatted string like 'type=text placeholder=Search name=q'
 */
export function buildAttributesString(
    el: Element,
    includeAttributes: string[] = DEFAULT_ATTRIBUTES
): string {
    const parts: string[] = [];

    for (const attrName of includeAttributes) {
        let value: string | null = null;

        // Special handling for live values
        if (attrName === 'value') {
            const tag = el.tagName.toLowerCase();
            if (tag === 'input' || tag === 'textarea') {
                value = (el as HTMLInputElement).value || null;
            } else if (tag === 'select') {
                value = (el as HTMLSelectElement).value || null;
            } else {
                value = el.getAttribute(attrName);
            }
        } else if (attrName === 'checked') {
            if ((el as HTMLInputElement).checked) {
                value = 'true';
            } else {
                continue;
            }
        } else {
            value = el.getAttribute(attrName);
        }

        if (value !== null && value.trim() !== '') {
            const capped = capTextLength(value.trim(), 100);
            parts.push(`${attrName}=${capped}`);
        }
    }

    // Add format hints for date/time inputs (browser-use style)
    if (el.tagName.toLowerCase() === 'input') {
        const inputType = el.getAttribute('type')?.toLowerCase() || '';
        const FORMAT_MAP: Record<string, string> = {
            'date': 'YYYY-MM-DD',
            'time': 'HH:MM',
            'datetime-local': 'YYYY-MM-DDTHH:MM',
            'month': 'YYYY-MM',
            'week': 'YYYY-W##',
        };
        if (FORMAT_MAP[inputType]) {
            parts.push(`format=${FORMAT_MAP[inputType]}`);
        }
    }

    // Deduplicate values (keep first occurrence)
    const seen = new Map<string, string>();
    const result: string[] = [];
    const protectedAttrs = new Set(['value', 'aria-label', 'placeholder', 'title', 'alt', 'format']);

    for (const part of parts) {
        const eqIdx = part.indexOf('=');
        const key = part.slice(0, eqIdx);
        const val = part.slice(eqIdx + 1);
        if (val.length > 5 && seen.has(val) && !protectedAttrs.has(key)) continue;
        seen.set(val, key);
        result.push(part);
    }

    return result.join(' ');
}

// ============================================================
// Text Utilities
// ============================================================

/**
 * Cap text length for display.
 * Adapted from browser-use's cap_text_length.
 */
export function capTextLength(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}

/**
 * Clean up serialized tree text — remove excessive whitespace.
 */
export function cleanSerializedText(text: string, maxLength?: number): string {
    // Remove excessive blank lines
    let cleaned = text.replace(/\n{3,}/g, '\n\n');
    // Remove trailing whitespace on lines
    cleaned = cleaned.replace(/[ \t]+$/gm, '');
    // Trim
    cleaned = cleaned.trim();

    if (maxLength && cleaned.length > maxLength) {
        cleaned = cleaned.slice(0, maxLength) + '\n... [truncated]';
    }

    return cleaned;
}

// ============================================================
// Select/Dropdown Helpers
// ============================================================

/**
 * Extract options from a <select> element for display.
 * Adapted from browser-use's _extract_select_options.
 */
export function extractSelectOptions(selectEl: HTMLSelectElement): {
    options: Array<{ value: string; text: string; selected: boolean; disabled: boolean }>;
    selectedIndex: number;
    selectedText: string;
} {
    const options = Array.from(selectEl.options).map(opt => ({
        value: opt.value,
        text: opt.text.trim(),
        selected: opt.selected,
        disabled: opt.disabled,
    }));

    return {
        options,
        selectedIndex: selectEl.selectedIndex,
        selectedText: selectEl.options[selectEl.selectedIndex]?.text?.trim() || '',
    };
}

/**
 * Format select options into a compact string for LLM display.
 * Shows first few options + selected option.
 */
export function formatSelectOptionsCompact(selectEl: HTMLSelectElement, maxOptions: number = 4): string {
    const { options, selectedText } = extractSelectOptions(selectEl);
    if (options.length === 0) return '';

    const optTexts = options.slice(0, maxOptions).map(o => o.text);
    const more = options.length > maxOptions ? `... +${options.length - maxOptions} more` : '';

    let result = `options=${optTexts.join('|')}${more ? '|' + more : ''}`;
    if (selectedText) result += ` selected=${selectedText}`;

    return result;
}
