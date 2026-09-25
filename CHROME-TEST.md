# Chapterlight — Chrome test status

## 0.6.4 — AO3 dropdown layering

Lowered both sidebar sizes below the original AO3 header and raised the native browsing header above the sidebar while Chapterlight is enabled. Off mode keeps original header styling. Expanded the local navigation fixture with a Fandoms menu overlapping the sidebar.

Local Chrome verification confirmed the reader dropdown visually covers the mini sidebar, DOM hit-testing in the overlapping area returns the menu link, and clicking that link opens native search. On native search, hit-testing also returns menu links over both mini and full sidebars. All 32 automated tests pass. This release was tested with the local fixture, not the installed live-site extension.

## 0.6.3 — native-page sidebar spacing and universal switch

Both full and mini sidebars now reserve space beside native-page content. The full sidebar scales with the viewport on narrower windows. The **阅读模式** switch remains visible on every supported page, including search, tags, profiles and content gates. Off removes all Chapterlight UI except that switch and removes the reserved space.

All 32 automated tests pass, with expanded coverage for switch visibility on native pages, off/on behavior, removal of sidebar layout classes, and disabled-state reloads without history/progress writes. Local Chrome search-page checks measured an 18px gap between the sidebar and content for both sizes, visually verified the full panel, confirmed only the switch remains after turning off, and confirmed off persists after reload. Installed-extension live-site verification of this release has not been performed.

## 0.6.2 — floating reading-mode switch

Added a large bottom-right **阅读模式** on/off switch with hover and focus feedback. Off saves the reading position, removes reader bars/sidebar, unwraps the pagination container, restores native AO3 layout, and stops progress writes and reading-key interception. The disabled preference persists across navigation/reload; the same switch enables the reader again.

All 32 automated tests pass, including full exit in both scrolling and paging modes, native DOM restoration, disabled-state reloads, unchanged saved progress while off, re-entry and native browsing. Local Chrome visual checks confirmed the floating control, original header/metadata returning on exit, off persisting after reload, and page 2 plus mini-sidebar preference restoring after switching back on. This version was checked with the local demo, not the installed live-site extension.

## 0.6.1 — full and mini sidebar

The left panel now collapses into a 60px mini sidebar with expand, history, bookmarks, and quick-save controls. Full remains the default; the chosen size persists, including migration of the old hidden preference to mini. Quick-save records the current position without expanding the panel. Native browsing pages omit the reading-position action.

Local Chrome checks confirmed that the mini sidebar fits beside the story and below native navigation, quick-save keeps it compact, bookmarks expand to the correct tab, and reload restores both mini mode and page 2. Expanding again retains page 2. The temporary test bookmark was removed. All 30 automated tests pass. These checks use the local demo; installed-extension verification of this version requires reloading it in Chrome.

## 0.6.0 — default-open bookmarks/history sidebar

The left sidebar opens by default with history and bookmarks tabs. The **☆ 书签 · 记住这里** action is inside the sidebar and available from either tab on novel pages. Hide/show choice persists, desktop reading content reserves space beside the panel, and paging keys remain active outside sidebar controls. Visible history updates as progress saves.

Local Chrome verification confirmed the open panel does not overlap the story or native navigation, hiding retains page 2, reload remembers the hidden state and page 2, reopening retains the position, and the sidebar action creates a separate page-2 bookmark. The temporary test bookmark was removed. All 29 automated tests pass, including default visibility, hide/show persistence, keyboard handling, independent bookmarks and live history updates. Installed-extension verification of this version still requires reloading it in Chrome.

## 0.5.1 — retain AO3's original navigation inside the reader

Removed the exit/enter-reader controls and the Alt+Shift+R toggle. The reader retains the original AO3 navigation DOM and search form beneath the Chapterlight toolbar; paging no longer hides that header. The navigation height adjusts the story viewport, panels, and scroll-position anchors. Native search/results/profile pages continue to use their original layout.

Inspected the live mirror's navigation structure without copying story text. Local Chrome verification confirmed a visible 36px red bar, story viewport starting below it at 132px, search form submission to native results, and a result link returning to the paged reader. All 28 automated tests pass, including form/node identity, existing submit-handler preservation, no paging interception inside native navigation, and scroll anchors accounting for navigation height. This version's installed live-site check still requires reloading the extension; the earlier v0.4.3 live checks remain recorded below.

## 0.5.0 — persistent bar and native browsing

All 27 automated tests pass, covering native search, tag, profile, comment and content-gate pages; unchanged native content; no paging-key interception or reading-history writes on browsing pages; shared history/bookmarks; and automatic reading when opening the next novel after exit.

Local Chrome checks confirmed that the bar reserves 70px above the native header, search submission works, result links enter paged reading, exit retains the bar, and the bookshelf remains accessible on search pages. The package broadens content-script matches to all paths on the same six explicit domains; the only API permission remains `storage`. `Chapterlight-0.5.0.zip` was verified against source and manifest assets. Live-site verification of this version is pending an extension reload.

## 0.4.3 — corrected mirror domain

Added `https://ao3-cn.com/works/*` and `https://www.ao3-cn.com/works/*` after the user clarified the intended domain. Opened the supplied work URL in Chrome on 2026-09-25 and confirmed the expected `#workskin`, `#chapters`, story article, and chapter picker. The live markup has nested `.work` / `#work-skin` wrappers and native `overflow-x: auto`, matching the causes addressed by the paging repair.

After the user reloaded the updated extension, the installed reader activated on the supplied live work in Chrome. Verified:

- Paging starts active, with 15 pages at the tested window size and typography.
- Scroll → paged switching hides all marked site panels, resets native horizontal scrolling, and makes story overflow visible within the clipped page viewport. Story height matches the 827px viewport.
- Page 2 → scrolling → paging retains page 2.
- Advancing to page 3 and reloading restores page 3.
- A separate test bookmark created on page 2 restores page 2 after automatic progress reaches page 3. The temporary bookmark was removed after verification.
- Reading history contains this novel and a resume link on the correct mirror domain.
- Selecting the sans-serif font applies the expected font stack; the original serif preference was restored afterward.
- Exiting restores the site's original header and overflow styles, with no remaining hidden-panel markers. Re-entering restores paging on page 2.

These are installed-extension checks on the supplied work, not a claim of compatibility with every mirror page or work skin. No comments or kudos were submitted. All 25 automated tests pass. `Chapterlight-0.4.3.zip` was verified byte-for-byte against source, including its corrected domain matches and declared assets.

## Live ao3.cn check — 2026-09-25

Opened `https://ao3.cn/`, `/fanfiction`, and `/ao3` in Chrome. These pages currently present informational articles and reader-app descriptions. The inspected pages contain no `/works/` links or `#workskin` story container, so they do not provide a target for testing the extension's paging, bookmarks, or resume behavior. No live reading-feature pass is claimed. The user subsequently confirmed `www.ao3-cn.com` as the intended domain; these are different sites.

## 0.4.2 — paging layout repair and default

Tested on 2026-09-25 in Chrome with the local `?layout_regression=1` fixture, which adds nested site panels and native horizontal overflow to the story container:

- Switching from scrolling to paging hides the nested navigation/metadata panels and removes the native story scrollbar.
- Page navigation and the rendered second page were checked visually.
- Reload restores page 2. Exiting restores the original surrounding panels and original overflow styling.
- All 25 automated tests pass, including repeated mode switches without losing story DOM, paging as the fresh-install/reset default, and preservation of an existing saved scrolling preference.
- The supported domains still include `ao3.cn` and `www.ao3.cn`.

These are local demo checks, not live-site or installed-extension verification. Existing installations with scrolling saved can select **排版 → 阅读方式 → 左右翻页** once; new installations default to animated paging.

## 0.4.0 — reading library, bookmarks, and custom fonts

Tested on 2026-09-25 using the local Chinese demo in Chrome:

- History shows two separate novels and their latest reading locations.
- A manual bookmark remains on page 2 while automatic progress moves back to page 1.
- Opening a bookmark from another novel restores the bookmarked chapter and page.
- Opening a novel's main URL returns to the last-read chapter and page.
- A custom `Microsoft YaHei, SimSun` font stack and weight 500 apply to the story and survive reload.
- The sidebar layout was visually reviewed, with no console errors reported.
- All 24 automated tests pass, including bookmark independence, remove/undo, old-position migration, local URL validation, scroll/paged text anchors, and font persistence.
- `Chapterlight-0.4.0.zip` was checked byte-for-byte against source and contains every asset declared by the manifest.

These browser checks use the demo's storage adapter and direct script loading. Installed-extension storage and live AO3 injection still require manual verification because browser-control policy blocks AO3 and the extension manager. No broader browser permissions were added.

## Earlier 0.3.0 verification

Tested on 2026-09-25.

## Export

`Chapterlight-0.3.0.zip` contains the installable `extension` folder and README. Every archived file was compared byte-for-byte with the current source and matched.

SHA-256: `9b3d484f5e77047a00588d2c6f7de2b033bee7113a4c474371444862a974e1e0`

## Verified in Chrome using the local demo

- Chinese text and reader controls render.
- Paging can be enabled and moves from page 1 to page 2.
- Reload restores the saved page and reading mode.
- Dark theme activates.
- Next chapter opens chapter 2.
- No console errors during the checked interactions.

The demo loads the same reader scripts directly and uses its own local-storage adapter. This verifies Chrome rendering and interactions, not content-script injection or the installed extension's Chrome storage integration. The automated suite separately passes 16 tests.

## Manual installation and live AO3 test still required

Browser-control security policy blocks `chrome://extensions/` and automated access to `https://archiveofourown.org/`. No automated installation or live-site test was performed.

1. Open `chrome://extensions/` manually, enable **Developer mode**, and choose **Load unpacked**.
2. Select `C:\Users\AlC\Desktop\AO3_reader\extension` (the folder containing `manifest.json`). When using the ZIP, extract it and select its `extension` subfolder.
3. Open or reload a Chinese AO3 work. Confirm the 章灯 toolbar appears.
4. Choose **排版 → 阅读方式 → 左右翻页**, turn a page, then reload and check the saved position.
5. Change the font or theme, open the next chapter, and confirm the preference remains.
6. Choose **退出阅读** and confirm AO3's original page and feedback controls return.
