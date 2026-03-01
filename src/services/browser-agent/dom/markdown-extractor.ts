// Browser Agent - Markdown Extractor
// Extract clean markdown text from page content and chunk it for LLM consumption.
// Adapted from browser-use's markdown_extractor.py.
// Runs in page context via chrome.scripting.executeScript.

// ============================================================
// Markdown Extraction
// ============================================================

/**
 * Extract clean markdown-like text from the page body.
 * Enhanced version of the existing getPageText function.
 * Handles headers, links, lists, tables, and block elements.
 *
 * @param includeLinks - Whether to preserve link URLs in markdown format
 * @param maxLength - Maximum output length
 * @returns Cleaned markdown text
 */
export function extractMarkdown(
    includeLinks: boolean = false,
    maxLength: number = 100000
): { text: string; length: number } {

    const SKIP_TAGS = new Set([
        'script', 'style', 'noscript', 'svg', 'path', 'meta', 'link',
        'head', 'template',
    ]);

    const BLOCK_TAGS = new Set([
        'div', 'p', 'section', 'article', 'main', 'aside', 'header', 'footer',
        'nav', 'ul', 'ol', 'table', 'tr', 'blockquote', 'pre', 'form',
        'fieldset', 'figure', 'figcaption', 'address',
    ]);

    function extractText(node: Node, depth: number = 0): string {
        if (depth > 50) return '';

        const parts: string[] = [];

        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text) parts.push(text);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            const tag = el.tagName.toLowerCase();

            // Skip invisible elements, scripts, styles
            if (SKIP_TAGS.has(tag)) return '';

            try {
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden') return '';
            } catch { /* skip */ }

            // Headers
            if (/^h[1-6]$/.test(tag)) {
                const level = parseInt(tag[1]);
                const headerText = (el as HTMLElement).innerText?.trim();
                if (headerText) parts.push('\n' + '#'.repeat(level) + ' ' + headerText + '\n');
                return parts.join('');
            }

            // Links
            if (tag === 'a' && includeLinks) {
                const href = el.getAttribute('href');
                const linkText = (el as HTMLElement).innerText?.trim();
                if (linkText && href && !href.startsWith('javascript:')) {
                    let fullHref = href;
                    try { fullHref = new URL(href, window.location.origin).href; } catch { /* keep original */ }
                    parts.push(`[${linkText}](${fullHref})`);
                    return parts.join('');
                }
            }

            // Images with alt text
            if (tag === 'img') {
                const alt = (el as HTMLImageElement).alt;
                if (alt) parts.push(`[image: ${alt}]`);
                return parts.join('');
            }

            // List items
            if (tag === 'li') {
                const liText = (el as HTMLElement).innerText?.trim();
                if (liText) parts.push('- ' + liText);
                return parts.join('');
            }

            // Table cells
            if (tag === 'td' || tag === 'th') {
                const cellText = (el as HTMLElement).innerText?.trim();
                if (cellText) parts.push(cellText + ' | ');
                return parts.join('');
            }
            if (tag === 'tr') {
                const cells: string[] = [];
                for (const child of el.children) {
                    const t = (child as HTMLElement).innerText?.trim();
                    if (t) cells.push(t);
                }
                if (cells.length > 0) parts.push('| ' + cells.join(' | ') + ' |');
                return parts.join('');
            }

            // Special elements
            if (tag === 'br') return '\n';
            if (tag === 'hr') return '\n---\n';

            // Code blocks
            if (tag === 'code' || tag === 'pre') {
                const codeText = (el as HTMLElement).innerText?.trim();
                if (codeText) {
                    if (tag === 'pre') {
                        parts.push('\n```\n' + codeText + '\n```\n');
                    } else {
                        parts.push('`' + codeText + '`');
                    }
                    return parts.join('');
                }
            }

            // Blockquotes
            if (tag === 'blockquote') {
                const quoteText = (el as HTMLElement).innerText?.trim();
                if (quoteText) {
                    parts.push('\n> ' + quoteText.replace(/\n/g, '\n> ') + '\n');
                    return parts.join('');
                }
            }

            // Recurse into children
            for (const child of node.childNodes) {
                const childText = extractText(child, depth + 1);
                if (childText) parts.push(childText);
            }

            // Block elements get newlines
            if (BLOCK_TAGS.has(tag) && parts.length > 0) {
                return '\n' + parts.join(' ') + '\n';
            }
        }

        return parts.join(' ');
    }

    let text = extractText(document.body);

    // Clean up whitespace
    text = text.replace(/\n{3,}/g, '\n\n').trim();

    // Remove JSON blobs (adapted from browser-use's _preprocess_markdown_content)
    text = text.replace(/\{[^{}]{200,}\}/g, '[JSON object removed]');

    if (text.length > maxLength) {
        text = text.slice(0, maxLength) + '\n\n[...truncated]';
    }

    return { text, length: text.length };
}

// ============================================================
// Structure-Aware Markdown Chunking
// ============================================================

/**
 * Block types for atomic markdown parsing.
 * Adapted from browser-use's _BlockType.
 */
const enum BlockType {
    HEADER,
    CODE_FENCE,
    TABLE,
    LIST_ITEM,
    PARAGRAPH,
    BLANK,
}

interface AtomicBlock {
    type: BlockType;
    lines: string[];
    charStart: number;
    charEnd: number;
}

/**
 * Split markdown into structure-aware chunks.
 * Adapted from browser-use's chunk_markdown_by_structure.
 *
 * Algorithm:
 *   1. Parse atomic blocks (headers, code fences, tables, list items, paragraphs)
 *   2. Greedy chunk assembly: accumulate blocks until exceeding max_chunk_chars
 *   3. Never split within code fences or tables
 *
 * @param content - Markdown text to chunk
 * @param maxChunkChars - Maximum characters per chunk
 * @param overlapLines - Lines to repeat at chunk boundaries for context
 * @param startFromChar - Character position to start from (for pagination)
 */
export function chunkMarkdownByStructure(
    content: string,
    maxChunkChars: number = 100000,
    overlapLines: number = 5,
    startFromChar: number = 0
): Array<{
    content: string;
    chunkIndex: number;
    totalChunks: number;
    charOffsetStart: number;
    charOffsetEnd: number;
    hasMore: boolean;
}> {
    if (!content || content.length === 0) return [];
    if (startFromChar >= content.length) return [];

    // Phase 1: Parse atomic blocks
    const blocks = parseAtomicBlocks(content);

    // Phase 2: Greedy chunk assembly
    const chunks: Array<{
        content: string;
        charOffsetStart: number;
        charOffsetEnd: number;
    }> = [];

    let currentBlocks: AtomicBlock[] = [];
    let currentChars = 0;

    for (const block of blocks) {
        // Skip blocks before startFromChar
        if (block.charEnd <= startFromChar) continue;

        const blockText = block.lines.join('\n');
        const blockChars = blockText.length;

        // Would this block exceed the limit?
        if (currentChars + blockChars > maxChunkChars && currentBlocks.length > 0) {
            // Emit current chunk
            const chunkContent = currentBlocks.map(b => b.lines.join('\n')).join('\n');
            chunks.push({
                content: chunkContent,
                charOffsetStart: currentBlocks[0].charStart,
                charOffsetEnd: currentBlocks[currentBlocks.length - 1].charEnd,
            });

            // Overlap: carry last few lines
            const overlapBlocks = currentBlocks.slice(-1); // Keep last block for context
            currentBlocks = overlapBlocks;
            currentChars = overlapBlocks.reduce((sum, b) => sum + b.lines.join('\n').length, 0);
        }

        currentBlocks.push(block);
        currentChars += blockChars;
    }

    // Emit remaining
    if (currentBlocks.length > 0) {
        const chunkContent = currentBlocks.map(b => b.lines.join('\n')).join('\n');
        chunks.push({
            content: chunkContent,
            charOffsetStart: currentBlocks[0].charStart,
            charOffsetEnd: currentBlocks[currentBlocks.length - 1].charEnd,
        });
    }

    // Build result with metadata
    return chunks.map((chunk, i) => ({
        content: chunk.content,
        chunkIndex: i,
        totalChunks: chunks.length,
        charOffsetStart: chunk.charOffsetStart,
        charOffsetEnd: chunk.charOffsetEnd,
        hasMore: i < chunks.length - 1,
    }));
}

/**
 * Parse markdown content into atomic blocks that should not be split.
 * Adapted from browser-use's _parse_atomic_blocks.
 */
function parseAtomicBlocks(content: string): AtomicBlock[] {
    const lines = content.split('\n');
    const blocks: AtomicBlock[] = [];
    let charPos = 0;

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const lineStart = charPos;

        // Code fence
        if (line.trimStart().startsWith('```')) {
            const fenceLines: string[] = [line];
            charPos += line.length + 1;
            i++;

            // Read until closing fence
            while (i < lines.length) {
                fenceLines.push(lines[i]);
                charPos += lines[i].length + 1;
                if (lines[i].trimStart().startsWith('```') && fenceLines.length > 1) {
                    i++;
                    break;
                }
                i++;
            }

            blocks.push({
                type: BlockType.CODE_FENCE,
                lines: fenceLines,
                charStart: lineStart,
                charEnd: charPos,
            });
            continue;
        }

        // Header
        if (/^#{1,6}\s/.test(line)) {
            blocks.push({
                type: BlockType.HEADER,
                lines: [line],
                charStart: lineStart,
                charEnd: lineStart + line.length + 1,
            });
            charPos += line.length + 1;
            i++;
            continue;
        }

        // Table row
        if (/^\s*\|.*\|\s*$/.test(line)) {
            const tableLines: string[] = [line];
            charPos += line.length + 1;
            i++;

            while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
                tableLines.push(lines[i]);
                charPos += lines[i].length + 1;
                i++;
            }

            blocks.push({
                type: BlockType.TABLE,
                lines: tableLines,
                charStart: lineStart,
                charEnd: charPos,
            });
            continue;
        }

        // List item
        if (/^\s*([-*+]|\d+[.)]) /.test(line)) {
            const listLines: string[] = [line];
            charPos += line.length + 1;
            i++;

            // Include continuation lines (indented)
            while (i < lines.length && /^\s{2,}/.test(lines[i]) && !/^\s*([-*+]|\d+[.)]) /.test(lines[i])) {
                listLines.push(lines[i]);
                charPos += lines[i].length + 1;
                i++;
            }

            blocks.push({
                type: BlockType.LIST_ITEM,
                lines: listLines,
                charStart: lineStart,
                charEnd: charPos,
            });
            continue;
        }

        // Blank line
        if (line.trim() === '') {
            blocks.push({
                type: BlockType.BLANK,
                lines: [line],
                charStart: lineStart,
                charEnd: lineStart + line.length + 1,
            });
            charPos += line.length + 1;
            i++;
            continue;
        }

        // Paragraph (default)
        const paraLines: string[] = [line];
        charPos += line.length + 1;
        i++;

        // Continue until blank line or special block start
        while (i < lines.length) {
            const nextLine = lines[i];
            if (
                nextLine.trim() === '' ||
                /^#{1,6}\s/.test(nextLine) ||
                nextLine.trimStart().startsWith('```') ||
                /^\s*\|.*\|\s*$/.test(nextLine) ||
                /^\s*([-*+]|\d+[.)]) /.test(nextLine)
            ) {
                break;
            }
            paraLines.push(nextLine);
            charPos += nextLine.length + 1;
            i++;
        }

        blocks.push({
            type: BlockType.PARAGRAPH,
            lines: paraLines,
            charStart: lineStart,
            charEnd: charPos,
        });
    }

    return blocks;
}
