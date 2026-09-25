# 星肆 for Android

Formerly 章灯 / Chapterlight. The launcher label, profile and installation prompts now use **星肆**. The package ID, signing key and `Chapterlight.apk` update asset name are retained so upgrades preserve existing data.

Android 8.0+ app with native navigation, library screens and Material bottom sheets. The app opens **`/works`** on the selected AO3 site. A compact site picker switches between AO3 and `www.ao3-cn.com`; there is no address bar or desktop sidebar.

- **发现**: full-width AO3 work lists, native search sheet, original search/filter forms, and readable work cards. Ratings and warning tags remain available.
- **书架**: recent reading and manual bookmarks, including the saved chapter/page and resume links. Records from each visited site are cached locally.
- **我的**: site selection, login, fandom browsing, GitHub updates and feedback.
- **Reading**: fullscreen text with a subtle page indicator. Quick taps reveal or hide the floating tools without reflow; long presses retain selection. Animated paging by default, horizontal swipe, previous/next controls, chapter selection, bookmarks, native typography sheet and night theme. The page menu contains the reading-mode switch to restore the original website.

The visual treatment is inspired by Liquid Glass: rounded translucent navigation, sampled background blur on Android 12+ (tinted fallback on Android 8–11), subtle edge highlights, muted green selection and clear content surfaces. It uses native Android views and gestures; it is not Apple's proprietary material. Font size follows Android scaling in the native screens; story size, font and line height can be customized independently.

Cookies, bookmarks and progress remain in app storage across signed upgrades. Reader settings/history are stored per website origin and are separate from the desktop extension. No JavaScript-to-native bridge or GitHub token is exposed to webpages. File/content URL access is disabled. Update Android System WebView if the reader does not render correctly. Shared AO3 URLs can be opened from Android's Share menu. Unsupported external HTTPS links open in the browser.

## Build

Install JDK 17 and Android SDK platform 36 plus build-tools 35.0.0. Set `ANDROID_HOME`, or set `sdk.dir` in an untracked `android/local.properties`.

```sh
cd android
./gradlew testDebugUnitTest lintDebug assembleDebug -PreleaseRepository=nepufish/ao3_smart_reader
```

On Windows use `gradlew.bat`. The Gradle wrapper pins Gradle 8.13; dependencies and Android Gradle Plugin versions are pinned. The build copies `extension/*.js` and `extension/*.css` into generated assets, with the mobile adapter in `app/src/main/assets`. Do not edit generated copies.

## GitHub Releases and updates

Repository: https://github.com/nepufish/ao3_smart_reader

The native **我的 → 检查更新** menu reads the latest public GitHub Release and its `update.json`. It compares numeric `versionCode`, offers the new version, downloads `Chapterlight.apk`, checks SHA-256, package ID, version and signing certificate, then invokes Android's system installer. The user approves the installation. No silent installs or GitHub credentials are used. A failed check/download shows an error without touching reader data.

If a release cannot be accessed anonymously, the error dialog offers **打开发布页**. Sign in to GitHub in that external browser if necessary, download the signed APK, and install it over the existing app. The direct in-app check requires public API/asset access and cannot work while GitHub returns anonymous 404 responses. The app never embeds a personal GitHub token.

Versions through 0.8.0 point to the previous repository. Install the new signed APK once over the existing app to migrate future checks; keep the app ID and signing certificate unchanged and do not uninstall first.

For a new release:

1. Increment both values in `android/version.properties`.
2. Push the commit and tag `android-vVERSION` (for example `android-v0.8.2`).
3. GitHub Actions runs reader tests, Android unit tests, lint and builds; then signs and publishes the release APK, `update.json` and `SHA256SUMS`.
4. Users check for updates from 我的.

Keep the newest Android release marked **Latest** so the updater sees it. Pre-releases/drafts are excluded. A release tag must match the version file. Do not replace an existing release's APK with another signing identity.

Repository Actions secrets required:

- `ANDROID_KEYSTORE_BASE64`: base64 of the release PKCS12 keystore.
- `ANDROID_STORE_PASSWORD`: keystore password.
- `ANDROID_KEY_PASSWORD`: private key password.
- `ANDROID_KEY_ALIAS`: signing key alias.

Local release builds use `CHAPTERLIGHT_KEYSTORE` (absolute file path), `CHAPTERLIGHT_STORE_PASSWORD`, `CHAPTERLIGHT_KEY_PASSWORD` and `CHAPTERLIGHT_KEY_ALIAS` environment variables. The release key must be retained and backed up privately; losing it prevents compatible upgrades. Never commit keys or passwords. Debug APKs use a different certificate and cannot be upgraded with the release APK; install the release build for everyday use.

### Local release fallback

If GitHub Actions is disabled for the repository owner, build with `python tools/build-android-local.py --release`. This uses the environment above, or this workstation's private configuration in `~/.chapterlight/`. It runs checks and writes the signed APK and update metadata to `artifacts/android/`. Commit and push the version change, then publish:

```sh
git tag android-v0.8.2
git push origin android-v0.8.2
gh release create android-v0.8.2 artifacts/android/Chapterlight.apk artifacts/android/update.json artifacts/android/SHA256SUMS --verify-tag --title "星肆 0.8.2 · Android" --notes-file artifacts/android/release-notes.md --latest
```

Use the new version in each command for subsequent releases. The in-app updater works with these manually published releases as well as Actions-generated releases.

## Validation

`npm test` covers the shared reader, mobile adapter, storage and swipe behavior. Android JUnit tests cover exact HTTPS allowlisting and release metadata/asset validation. `lintDebug` checks Android API compatibility.

`MobileFlowTest` exercises the actual Android views and Chromium layout with original Chinese fixtures: `/works` launch, work-list width, search sheet, original-page switch, paging, bookmarks, typography, night mode, library and rotation. Run it on a dedicated emulator with `./gradlew connectedDebugAndroidTest`. Test screenshots are written to the app's external files directory.

See [ANDROID-TEST.md](../ANDROID-TEST.md) for release-specific results and remaining live-site/device coverage. Emulator fixture tests do not prove that a site's login, network challenges or every custom work skin will behave the same.
