# Quick Translate - Chrome Extension

A Chrome extension that translates selected text instantly using Google Translate API.

## Features

- 🌍 **Instant Translation**: Translate any selected text on any webpage
- ⚡ **Multiple Translation Modes**:
  - Show translate button on text selection
  - Auto-translate when text is selected
  - Disable translation popup
- 🎯 **Customizable Languages**: Choose from 15+ languages for source and target
- 💫 **Beautiful UI**: Modern, gradient-based design with smooth animations
- 🔧 **Easy Configuration**: Simple options page for all settings

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `chrome-translate-extension` folder
5. The extension is now installed!

## Usage

### Basic Translation

1. **Select text** on any webpage
2. Depending on your settings:
   - **Button mode**: Click the translate button that appears
   - **Auto mode**: Translation appears automatically
   - **Disabled**: No popup appears

### Configure Settings

1. Right-click the extension icon and select "Options"
2. Or go to `chrome://extensions/` and click "Details" → "Extension options"
3. Configure:
   - **Source Language**: Language to translate from (or Auto Detect)
   - **Target Language**: Language to translate to
   - **Translation Behavior**: Choose button, auto, or disabled mode
4. Click "Save Settings"

## Supported Languages

- English
- Vietnamese
- Chinese (Simplified & Traditional)
- Japanese
- Korean
- French
- German
- Spanish
- Italian
- Portuguese
- Russian
- Arabic
- Thai
- Indonesian

## File Structure

```
chrome-translate-extension/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker (API calls)
├── content.js            # Content script (text selection & popup)
├── translator.js         # Translation service module
├── options.html          # Settings page HTML
├── options.js            # Settings page logic
├── options.css           # Settings page styles
├── popup.css             # Translation popup styles
└── icons/                # Extension icons
    ├── tool_icon.png
    ├── tool_icon.png
    └── tool_icon.png
```

## How It Works

1. **Text Selection**: The content script (`content.js`) detects when you select text
2. **Translation Request**: Based on your settings, it sends a translation request to the background worker
3. **API Call**: The background worker (`background.js`) calls Google Translate API
4. **Display Result**: The translated text is displayed in a beautiful popup

## API Information

This extension uses the Google Translate API with the following endpoint:
- URL: `https://translate-pa.googleapis.com/v1/translate`
- Method: GET
- Parameters: source language, target language, text to translate

## Privacy

- The extension only translates text you explicitly select
- Translation requests are sent directly to Google Translate API
- No data is stored or collected by this extension
- Settings are stored locally in Chrome's sync storage

## Troubleshooting

### Translation not working
- Check your internet connection
- Verify the extension is enabled in `chrome://extensions/`
- Try reloading the webpage

### Button not appearing
- Check your translation mode in settings
- Make sure the extension has permission for the current website
- Try selecting text again

### Settings not saving
- Make sure you clicked "Save Settings"
- Check Chrome's sync is enabled for extensions

## Development

To modify this extension:

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## License

This extension is provided as-is for personal use.

## Credits

Built with ❤️ using Google Translate API
