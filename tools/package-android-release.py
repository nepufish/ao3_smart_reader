"""Create the stable asset names consumed by the Android updater."""
import argparse
import hashlib
import json
import pathlib
import shutil

root = pathlib.Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--tag', required=True)
args = parser.parse_args()
version = dict(line.split('=', 1) for line in (root / 'android/version.properties').read_text().splitlines() if '=' in line)
if args.tag != 'android-v' + version['versionName']:
    raise SystemExit('Tag does not match android/version.properties')
source = root / 'android/app/build/outputs/apk/release/app-release.apk'
output = root / 'artifacts/android'
output.mkdir(parents=True, exist_ok=True)
apk = output / 'Chapterlight.apk'
shutil.copyfile(source, apk)
digest = hashlib.sha256(apk.read_bytes()).hexdigest()
metadata = {'versionCode': int(version['versionCode']), 'versionName': version['versionName'], 'apk': apk.name, 'sha256': digest}
(output / 'update.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
(output / 'SHA256SUMS').write_text(f'{digest}  {apk.name}\n', encoding='utf-8')
(output / 'release-notes.md').write_text(f'''星肆 {version['versionName']} for Android

- Android app renamed to **星肆** in the launcher, profile screen and update-installation prompts.
- The app ID, signing certificate, bookmarks, reading history and saved settings remain compatible with existing installations.
- Fullscreen reading, tap-to-reveal glass tools, search, typography and GitHub updates remain available.
- Build validation includes reader tests, Android unit tests and lint. This release changes branding only; no new physical-device UI test is claimed.

Download **Chapterlight.apk** below. The filename is retained for compatibility with existing in-app updaters; the installed app is named 星肆. Requires Android 8.0 or newer and an up-to-date Android System WebView. Android will ask you to allow installation from your browser or 星肆. Future releases signed with the same key install over this app and retain its data.

**Moving from the previous repository:** download and install this APK once over your existing signed Chapterlight app. Do not uninstall first. Versions through 0.8.0 still check the previous repository; this version switches future checks to the new repository. The app ID and signing key are unchanged.

Reader data stays in the app and is separate for each website origin; it does not sync with the desktop extension. The app does not bypass site/network restrictions.
''', encoding='utf-8')
print(f'Packaged {apk.name}: {version["versionName"]}, versionCode {version["versionCode"]}')
