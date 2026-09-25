# Android 0.8.1 validation

Built with JDK 17, Gradle 8.13, Android Gradle Plugin 8.13.2, Android SDK 36 and build-tools 35.0.0.

## Automated checks

- 38 Node tests pass, covering the shared desktop reader, Android storage, swipe filtering, native settings, safe library snapshots, tap exclusions and compact search metadata.
- 4 Android JUnit tests pass for exact HTTPS origins and GitHub release metadata/asset validation.
- `testDebugUnitTest`, `lintDebug` and `assembleRelease` pass. Android lint reports **no issues**.
- Package: `io.github.chapterlight.reader`; version `0.8.1` / code `801`; minimum API 26, target API 36.
- `apksigner verify` passes. Release certificate SHA-256: `a88210efe5ab7111ba17da86dd81de87f7f0e85a2e05a383e9fbb391363e9cea` (unchanged).
- APK reader/mobile assets match workspace source byte-for-byte. APK SHA-256 matches `update.json`.
- Compiled release configuration and APK contain `nepufish/ao3_smart_reader` as the updater repository.

## Android emulator

The new reading and search UI passed `MobileFlowTest` on a dedicated Android 15 / API 35 Pixel 6 emulator, at its default 411dp width and normal text size. It uses real native views and Chromium with original Chinese fixtures, independent of account/network access.

The flow verifies `/works` at launch, search header cleanup, work-list width, native search, original-site mode off/on, default hidden reading controls, a visible quiet page indicator, actual quick touch events toggling controls, a held touch not toggling them, unchanged viewport dimensions, paging, bookmarks, typography, night mode, native history and rotation. Actual screenshots were inspected and presented for review before release.

The previous 0.8.0 UI was additionally tested at 360dp / 150% text, and signed 0.7.1 to 0.8.0 installation compatibility was tested. Those are historical checks, not new 0.8.1 coverage. The new APK retains the app ID and certificate and increments the version code, but this release's full download/installer flow and upgrade installation have not been exercised on a physical phone.

No physical phone was tested. Live-site login, network challenges, arbitrary work skins, older Android blur fallback, and external installation prompts still require device testing. AO3 previously presented a network challenge to the emulator; fixture results do not establish live-site access.

## Repository migration

The release target and default updater configuration are now `nepufish/ao3_smart_reader`. Versions through 0.8.0 still check the previous repository, so existing users must install this signed APK once over their existing app to switch update sources. Do not uninstall or change signing keys. New versions check the new repository via **我的 → 检查更新**.

GitHub Actions uses the current repository name automatically. Local builds use `android/gradle.properties`. The existing private signing configuration is deliberately retained across the move. No signing keys or credentials are committed.
