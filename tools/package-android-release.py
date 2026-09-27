"""Create the stable asset names consumed by the Android updater."""
import argparse
import hashlib
import json
import pathlib
import shutil
import zipfile

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
extension = output / 'Chapterlight-extension.zip'
with zipfile.ZipFile(extension, 'w', zipfile.ZIP_DEFLATED) as bundle:
    for file in sorted((root / 'extension').rglob('*')):
        if file.is_file():
            bundle.write(file, file.relative_to(root / 'extension').as_posix())
extension_digest = hashlib.sha256(extension.read_bytes()).hexdigest()
(output / 'SHA256SUMS').write_text(f'{digest}  {apk.name}\n{extension_digest}  {extension.name}\n', encoding='utf-8')
(output / 'release-notes.md').write_text(f'''星肆 {version['versionName']} for Android

- Adds **评论** and **下载作品** to the Android reading toolbar. Tap the reading page once to reveal them. Desktop extension 0.6.5 has the same buttons in its toolbar.
- Comments use AO3's original feedback area, forms, login notices and reply/pagination links. Returning to reading preserves the reading position and the current page's unsubmitted draft.
- Downloads use the exact formats and links AO3 provides for the complete work. Android 10+ uses the system download manager and the current site session; Android 8–9 opens the original link in the external browser.
- Includes 41 passing reader tests, Android unit tests/lint and an Android 15 emulator flow covering comments, draft retention, Back and original download choices. Live comment submission and completed live-site file downloads have not been tested.
- The app ID and signing certificate are unchanged, preserving installed data when upgrading.

For Chrome/Edge, download **Chapterlight-extension.zip**, extract it, and load the extracted folder from the browser's extensions page in Developer mode. Reload the extension and AO3 tabs after updating.

Download **Chapterlight.apk** below. The filename is retained for compatibility with existing in-app updaters; the installed app is named 星肆. Requires Android 8.0 or newer and an up-to-date Android System WebView. Android will ask you to allow installation from your browser or 星肆. Future releases signed with the same key install over this app and retain its data.

**Moving from the previous repository:** download and install this APK once over your existing signed Chapterlight app. Do not uninstall first. Versions through 0.8.0 still check the previous repository; this version switches future checks to the new repository. The app ID and signing key are unchanged.

Reader data stays in the app and is separate for each website origin; it does not sync with the desktop extension. The app does not bypass site/network restrictions.
''', encoding='utf-8')
print(f'Packaged {apk.name}: {version["versionName"]}, versionCode {version["versionCode"]}')
