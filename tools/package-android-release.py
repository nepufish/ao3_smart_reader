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
(output / 'release-notes.md').write_text(f'''章灯 Chapterlight {version['versionName']} for Android

- Chinese AO3 reading, animated paging and swipe navigation.
- Bookmarks, reading history, saved positions and font settings.
- Native AO3 navigation and a universal reading-mode switch.
- Menu → 检查更新 checks signed APK updates through GitHub Releases.

Download **Chapterlight.apk** below. Requires Android 8.0 or newer and an up-to-date Android System WebView. Android will ask you to allow installation from your browser or Chapterlight. Future releases signed with the same key install over this app and retain its data.

Reader data stays in the app and is separate for each website origin; it does not sync with the desktop extension. The app does not bypass site/network restrictions.
''', encoding='utf-8')
print(f'Packaged {apk.name}: {version["versionName"]}, versionCode {version["versionCode"]}')
