# BrowseFocused

Stay focused by blocking distracting websites and unwanted content at the root level.

## Features

- **Block websites by domain (root-level)**: Add domains to your block list to prevent any content from those domains from loading anywhere—this includes blocking them in search results, Google Images, and other embedded content. Blocked domains are stopped at the network level, so they won't appear or load in any part of the browser.
- **Block by keyword**: Hide search results and links containing specific keywords.
- **One-click blocking**: Instantly block the current website from the popup.
- **SafeSearch enforcement**: Optionally force SafeSearch on supported search engines (Google, Bing, DuckDuckGo).
- **Password protection**: Lock the extension settings with a password to prevent tampering.
- **Persistent storage**: All settings are saved locally in your browser.

## How to Install

1. Download or clone this repository and extract the folder.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top right).
4. Click **Load unpacked** and select the extracted folder.
5. The extension icon will appear in your browser toolbar.

## Usage

1. Click the extension icon to open the popup.
2. Add domains or keywords to block.
3. Use the **Block Current Site** button to quickly block the active tab's domain.
4. Toggle SafeSearch enforcement as needed.
5. (Optional) Set a password to lock the extension settings.

## Permissions

This extension requests the following permissions:

- `declarativeNetRequest`: To block network requests to specified domains.
- `storage`: To save your block lists and settings.
- `activeTab`: To interact with the current tab for one-click blocking.

## Supported Search Engines

- Google
- Bing
- DuckDuckGo

## License

See [LICENSE](LICENSE) for details.
