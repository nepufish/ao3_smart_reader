# Android 0.8.0 validation

Built with JDK 17, Gradle 8.13, Android Gradle Plugin 8.13.2, Android SDK 36 and build-tools 35.0.0.

## Automated checks

- 36 Node tests pass, covering the shared desktop reader, Android storage, swipe filtering, native settings adapter and safe library snapshots.
- 4 Android JUnit tests pass for exact HTTPS origins and GitHub release metadata/asset validation.
- `testDebugUnitTest`, `lintDebug` and `assembleRelease` pass. Android lint reports **no issues**.
- Package: `io.github.chapterlight.reader`; version `0.8.0` / code `800`; minimum API 26, target API 36.
- `apksigner verify` passes. Release certificate SHA-256: `a88210efe5ab7111ba17da86dd81de87f7f0e85a2e05a383e9fbb391363e9cea` (unchanged from 0.7.1).
- APK reader/mobile assets match workspace source byte-for-byte. APK SHA-256 matches `update.json`.

## Android emulator

A dedicated Android 15 / API 35 Pixel 6 emulator was used, with Chromium WebView and the app's real native views. `MobileFlowTest` passes at the default 411dp width / normal text and at 360dp width / 150% system text. Its original Chinese fixtures avoid relying on account state or network access.

The flow checks `/works` at launch, work-list width, hidden desktop UI, keyboard-aware native search, original-site switch off/on, paging, bookmark persistence, scroll/paged switching, night mode, native history/bookmarks and rotation. Screenshots of the list, reader, typography, search keyboard and library were visually inspected. The test exposed a stale reading-switch state; the page menu now reads current state before constructing its switch.

The previous published signed 0.7.1 APK installs on the emulator, and the signed 0.8.0 APK installs over it with `adb install -r`. Android accepts the signing identity and version upgrade. This is an installation compatibility test; it does not claim the complete in-app download/unknown-sources permission flow was exercised.

No physical phone was tested. Live-site login, network challenges, arbitrary work skins, and external browser installation prompts still require device testing. The emulator encountered AO3's network challenge during a live request; fixture results do not establish live-site access.

## GitHub availability

GitHub previously reported `Actions has been disabled for this user` for owner `cczzaa101`; the committed workflow and signing secrets have a documented local build/publish fallback.

Authenticated GitHub access can retrieve the public repository and release assets. The anonymous latest-release API still returns 404 on this test network. Direct in-app update checks need that access restored; the app offers **打开发布页** to use a signed-in external browser. No automatic download/install success is claimed while this restriction remains.
