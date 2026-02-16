// Main background process
// Integrates all tool modules

// Import translator module (service worker environment)
import '../modules/translator/background.ts';

// Import chat module (service worker environment)
import '../modules/chat/background.ts';

console.log('AnyTools Background Service Worker Loaded');
