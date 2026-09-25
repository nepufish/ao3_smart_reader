# Android 0.7.1 validation

Built on Windows with JDK 17, Gradle 8.13, Android Gradle Plugin 8.13.2, Android SDK 36 and build-tools 35.0.0.

- 34 Node tests pass, including Android storage defaults, preservation of saved choices and gesture filtering.
- 4 Android JUnit tests pass: exact HTTPS origin checks, release parsing, rejection of foreign download origins, invalid checksums and mismatched/pre-release tags.
- `testDebugUnitTest`, `lintDebug` and `assembleRelease` complete successfully.
- The APK has package ID `io.github.chapterlight.reader`, version `0.7.1` / code `701`, minimum Android API 26 and target API 36.
- APK signature verified with Android `apksigner`. Release certificate SHA-256: `a88210efe5ab7111ba17da86dd81de87f7f0e85a2e05a383e9fbb391363e9cea`.
- All seven packaged reader/mobile asset files match workspace source byte-for-byte.
- Local Chrome's 390px preview was visually checked for paging, full/mini sidebar controls, native navigation and the reader switch. This checks responsive web layout, not Android WebView behavior.

No Android device was connected, so installation, device WebView behavior, and the system update-install permission flow have not been verified on a phone. Version 0.7.0 is the first release; 0.7.1 adds a browser fallback for inaccessible releases. Both are signed with the same key. The updater's release manifest, package identity, SHA-256 and certificate checks are implemented; release assets are independently verified after publication.

GitHub reports `Actions has been disabled for this user` for repository owner `cczzaa101`. The workflow is committed, signing secrets are configured, and a local build/publish fallback is documented in `android/README.md`. The first APK is built locally and uploaded directly to GitHub Releases. In-app updates do not depend on Actions being enabled.

Authenticated GitHub API calls confirm the repository is public and the release/assets exist. Anonymous repository, latest-release API and APK/metadata download requests currently return 404 from the test network, including requests bypassing caches. This prevents direct in-app update checks until public access is available. The app offers an external-browser fallback that permits signing into GitHub. No automatic download/install success is claimed under this restriction.
