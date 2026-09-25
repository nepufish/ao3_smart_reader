# 章灯 Chapterlight — AO3 中文阅读

A dependency-free Chrome / Edge extension focused on reading Chinese novels on AO3, with a Simplified Chinese interface.

## Android app

The Android app packages this reader in a native WebView with phone controls, swipe paging, and signed updates via **⋮ → 检查更新**. Download **Chapterlight.apk** from [GitHub Releases](https://github.com/cczzaa101/ao3_friendly_reader/releases/latest). Android 8.0+ with an up-to-date Android System WebView is required. App data is separate from the desktop extension and stored per website origin. See [Android build and release instructions](android/README.md).

Allowed HTTPS domains: `archiveofourown.org`, `www.archiveofourown.org`, `ao3-cn.com`, `www.ao3-cn.com`, `ao3.cn`, and `www.ao3.cn`. The mirror domains use the same AO3 page selectors. Version 0.4.3 of the installed extension was tested on a Chinese work at `www.ao3-cn.com` on 2026-09-25: paging, mode switching, automatic resume, bookmarks, history, font changes, and exit/re-entry passed. Other works and skins may differ. `ao3.cn` is a different site from `ao3-cn.com`; its inspected pages contain informational articles rather than AO3 work markup. Navigation and saved-position links stay on their originating domain.

## Install

1. Open `chrome://extensions` in Chrome, or `edge://extensions` in Edge.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select the `extension` folder in this project.
4. Open or reload an AO3 story. The reader starts automatically when story text is available.

The Chapterlight bar stays available on native AO3 pages, including search, results, tags, and profiles. AO3’s own red **Fandoms / Browse / Search / About** navigation and original search form remain available inside the reader, including their dropdowns. Their links open the site’s normal pages; **书架** remains available throughout. On novel pages, the native navigation sits directly below the Chapterlight toolbar and the text starts below both bars. Page height and saved scroll anchors account for the navigation height. On browsing pages, the original AO3 header and content stay in their normal layout below the Chapterlight toolbar. Reading mode starts only on a work/chapter URL with actual story text; browsing and content-gate pages are not reformatted or recorded as reading history.

Use **字 · 排版** to adjust the theme, Chinese font, text size, reading width, line and paragraph spacing, author’s notes, and automatic resume. **目录** opens the chapter list. The large floating **阅读模式** switch stays visible on every supported page, including search, tags, profiles, and novels. At the bottom right it turns all Chapterlight features on or off, with a raised hover effect and keyboard focus support. Switching off saves your reading position, restores the original AO3 layout, and hides the Chapterlight toolbar and sidebar; only the switch remains. The off state persists across reloads and navigation until you turn it back on. Re-enabling restores your reading preferences and follows your automatic-resume setting. Typography and paging preferences persist. After updating an unpacked extension, reload it on the extensions page and refresh your AO3 tabs.

## Reading library and saved positions

The left **书签与历史** panel opens in full size by default. Use **«** or the toolbar’s **书架** button to switch to a 60px mini sidebar; **» 展开** switches back. The choice persists, and previously hidden sidebars now use mini mode. The mini sidebar’s **历史** and **书签** shortcuts expand the corresponding tab; **☆ 记住** saves the current position without expanding. Switching sizes preserves your text position. At desktop widths of 900px or more, the reading column reserves space beside the full panel; at narrower widths the full panel overlays the page. The mini sidebar always reserves space beside the text. On native browsing pages, both sidebar sizes reserve space beside the original content; the full panel scales down with narrower windows. Turning the reading-mode switch off removes this reserved space together with the toolbar and sidebars. Paging keys remain available when focus is outside the sidebar.

- **书架 → 最近阅读** lists novels opened with the extension, ordered by recent activity. Search by title or author, then click a work to jump to its latest saved chapter and text position. Existing positions from older versions appear with a work ID when no title was saved.
- **☆ 书签 · 记住这里** at the top of the sidebar (available in either tab on novel pages) creates a separate bookmark of the current position in one click. For a named bookmark, open **书架 → 我的书签**, enter an optional note, and choose **保存当前位置**. Continuing to read updates automatic progress without moving the bookmark.
- The bookmarks list works across novels and chapters. It includes a short excerpt and the location when saved. Page numbers are descriptive: restoration uses the text anchor so changing the font or window size can change the page number.
- Remove a bookmark using **移除书签**; **撤销移除** restores the most recently removed bookmark during that page session. Removed bookmarks are retained locally as hidden records.
- Automatic resume is on by default. Reopening the same chapter restores the last position; opening the novel's main `/works/ID` URL returns to its saved chapter. Explicit chapter links and **全文阅读** remain deliberate navigation and may offer a continue link instead of redirecting. **自动回到上次阅读位置** disables automatic resume; clicking a bookmark or history entry still explicitly restores its saved position.
- The sidebar records AO3 works opened by Chapterlight, not general browser history. It is available through the bar on both browsing and reading pages and does not sync with your AO3 account or AO3's own bookmarks.

## Chinese reading

- **宋体 · 书卷 / 楷体 · 手札 / 黑体 · 清晰:** local Chinese font stacks for Windows and macOS, with system fallbacks. Exact font appearance depends on what is installed; no font downloads.
- **正文字体 → 自定义字体:** enter an installed font name such as `Microsoft YaHei`, or a comma-separated fallback list such as `Noto Serif CJK SC, SimSun`, then choose **应用字体**. A live sample previews your choice. **字重** and **字间距** customize weight and character spacing; available weights depend on the font. Missing fonts use the local fallback stack. No font files are uploaded or downloaded.
- New installations default to 22px type, a 760px column (about 34 full-width characters), double line spacing, and a 0.8em paragraph gap. Existing preferences are preserved; **恢复默认排版** applies the new defaults.
- **中文正文首行缩进两字:** optional two-character first-line indentation for ordinary Chinese paragraphs. Existing leading whitespace or CSS indentation, centered/right-aligned paragraphs, blockquotes, and paragraphs with manual line breaks or images are skipped. Disabled by default to respect author formatting.
- Strict browser line-breaking rules for CJK punctuation. Original text, simplified/traditional characters, punctuation, and intentional line breaks are retained; no automatic conversion or translation.
- Chinese character counts support both simplified and traditional Han characters. Estimated time uses an adjustable default of **500 Han characters/minute**, plus **230 words/minute** for other text. These are rough product defaults, not a measured personal reading speed. Punctuation is not counted as words; summaries and notes are excluded. The estimate also depends on the approximate scroll progress.

- **Alt + Left / Right:** previous / next chapter when AO3 provides those links. These override browser history shortcuts only when an applicable chapter link exists and the reader is active.
- **Escape:** close a reader panel.

## Animated paging

**左右翻页** with animation is the default for new installations and **恢复默认排版**. Existing saved mode preferences are preserved; choose **字 · 排版 → 阅读方式 → 左右翻页** to change an existing scrolling preference. Text flows into single-column pages sized to your window, with complete lines and Chinese punctuation wrapping. The original text and links remain selectable.

- Click **← / →** beside the page counter, or use **Left / Right**, **Page Up / Page Down**, **Space / Shift + Space**, or the mouse wheel.
- A short horizontal slide animates page turns. Turn off **柔和翻页动画** for instant turns; the system's reduced-motion preference also disables animation.
- Changes to typography, window dimensions, fonts, or loaded images repaginate the content. Reading places use a text anchor, including the character within a paragraph, rather than a fixed page number.
- Page counts cover the loaded AO3 content, including visible summaries and notes. **上一章 / 下一章** still navigate between chapters; turning the final page does not automatically load another chapter.
- Keyboard paging does not intercept form fields, links, buttons, or open reader panels. **Alt + Left / Right** remains chapter navigation.
- Switch to **上下滚动** to reach AO3's feedback, comments, and kudos area. Paging does not load chapters in the background.
- Paging retains the native AO3 navigation, hides surrounding work metadata and feedback panels even when they use nested wrappers, and overrides the story container's native scrollbar. Switching back restores the original surrounding elements.

Unusual work skins, tables, or unbreakable embedded content may not paginate cleanly; scrolling mode is available for those works.

## Privacy and behavior

Only the `storage` permission is requested. Content scripts run throughout the listed domains to show the bar. Story formatting, reading history, and progress recording run only on novel pages with story text. No analytics, backend, external fonts, network requests, or account credentials. Settings, novel history, one latest reading place per work, and manual bookmarks stay in `chrome.storage.local`. Uninstalling removes that data. Records include work titles, author labels, visited times, and short text excerpts to help recover your place after edits; there is no cloud sync.

The extension retains the original story DOM, links, summaries, formatting, notes, and feedback controls. It does not load chapters in the background, bypass content gates, or submit comments or kudos. Typography may interact with unusually styled works; scrolling mode is available for unusually styled works.

Progress means progress through the currently loaded content, not the entire work unless the entire work is loaded. Positions save after you interact and scroll or turn a page, as well as when creating a manual bookmark. Deliberate author anchor links and browser back/forward restoration take precedence over automatic resume. Major author edits or late-loading images can affect restored positions.

## Local preview

With Node.js 20 or newer, run `npm run preview`, then open <http://127.0.0.1:4173/works/101/chapters/201>. The preview uses an original Chinese story,《借一盏灯等你》, representative AO3 markup, and a separate browser-storage adapter. It supports native search/list pages at `/works/search`, chapter pages, entire-work mode, a one-shot, and a content-gate fixture. Nothing in `demo` is shipped in the extension. Installing the extension does not require Node.js.

Append `?layout_regression=1` to the chapter preview URL to test nested site panels and native story overflow when switching reading modes.

## Checks

Run `npm install`, then `npm test`. Automated checks cover reader activation, chapter links, safe saved URLs, progress persistence, paging anchors, Chinese/mixed-language time estimates, author indentation, history migration, independent bookmarks, removal/undo, custom font persistence, and safe handling of stored text. These use representative fixtures; testing an installed extension on live AO3 is still needed before a store release.

Built against Chrome Manifest V3: [content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [local storage](https://developer.chrome.com/docs/extensions/reference/api/storage).
