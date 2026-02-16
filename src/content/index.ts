// Main content script
// Integrates all tool modules

// Import translator module logic and styles
import '../modules/translator/content.css';
import '../modules/translator/content.ts';

// Chat module no longer injected — it now uses chrome.sidePanel API

console.log('AnyTools Content Script Loaded');
