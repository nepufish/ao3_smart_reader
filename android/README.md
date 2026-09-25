# Chapterlight for Android

Native Android WebView app using the same JavaScript/CSS reader as the Chrome extension. Android 8.0+; update Android System WebView if the reader does not render correctly. Shared URLs can be opened from Android's Share menu. The address bar accepts the extension's supported HTTPS AO3 domains; other HTTPS links open in the external browser.

The mini sidebar is the phone default. Swipe horizontally across the story, or use the page buttons. The floating 阅读模式 switch removes all injected reader UI when off. The native address bar remains available for navigation and updates. Your cookies, bookmarks and progress remain in app storage across signed upgrades. Reader settings/history are stored per website origin and are separate from the desktop extension. No JavaScript-to-native bridge or GitHub access token is exposed to webpages. No file/content URL access is enabled. The app does not bypass site gates or connectivity restrictions.

## Build

Install JDK 17 and Android SDK platform 36 plus build-tools 35.0.0. Set `ANDROID_HOME`, or set `sdk.dir` in an untracked `android/local.properties`.

```sh
cd android
./gradlew testDebugUnitTest lintDebug assembleDebug -PreleaseRepository=cczzaa101/ao3_friendly_reader
```

On Windows use `gradlew.bat`. The Gradle wrapper pins Gradle 8.13; dependencies and Android Gradle Plugin versions are pinned. The build copies `extension/*.js` and `extension/*.css` into generated assets, with the mobile adapter in `app/src/main/assets`. Do not edit generated copies.

## GitHub Releases and updates

Repository: https://github.com/cczzaa101/ao3_friendly_reader

The native **⋮ → 检查更新** menu reads the latest public GitHub Release and its `update.json`. It compares numeric `versionCode`, offers the new version, downloads `Chapterlight.apk`, checks SHA-256, package ID, version and signing certificate, then invokes Android's system installer. The user approves the installation. No silent installs or GitHub credentials are used. A failed check/download shows an error without touching reader data.

For a new release:

1. Increment both values in `android/version.properties`.
2. Push the commit and tag `android-vVERSION` (for example `android-v0.7.1`).
3. GitHub Actions runs reader tests, Android unit tests, lint and builds; then signs and publishes the release APK, `update.json` and `SHA256SUMS`.
4. Users check for updates from the app menu.

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
git tag android-v0.7.0
git push origin android-v0.7.0
gh release create android-v0.7.0 artifacts/android/Chapterlight.apk artifacts/android/update.json artifacts/android/SHA256SUMS --verify-tag --title "Chapterlight 0.7.0 · Android" --notes-file artifacts/android/release-notes.md --latest
```

Use the new version in each command for subsequent releases. The in-app updater works with these manually published releases as well as Actions-generated releases.

## Validation

`npm test` covers reader behavior. Android JUnit tests cover origin allowlisting and release metadata/asset validation; `lintDebug` checks Android API compatibility. Build reports are attached to each Actions run. Before a release intended for broad use, check on a phone: site login/gate, paging and swipe, reload resume, independent bookmark, full/mini panel, native search, reader off/on, rotation/backgrounding, updater offline/rate-limit handling, and upgrade from the previous signed APK. CI build success alone is not a device test.
