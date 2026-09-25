"""Build locally when GitHub Actions is unavailable. Never prints signing secrets."""
import argparse
import json
import os
import pathlib
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--release', action='store_true')
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parent.parent
private = pathlib.Path.home() / '.chapterlight'
env = os.environ.copy()
paths = private / 'build-tools/paths.json'
if paths.exists():
    config = json.loads(paths.read_text(encoding='utf-8'))
    env.setdefault('JAVA_HOME', config['java'])
    env.setdefault('ANDROID_HOME', config['sdk'])
if not env.get('JAVA_HOME') or not env.get('ANDROID_HOME'):
    raise SystemExit('Set JAVA_HOME to JDK 17 and ANDROID_HOME to Android SDK with platform 36 / build-tools 35.0.0.')
env['PATH'] = str(pathlib.Path(env['JAVA_HOME']) / 'bin') + os.pathsep + env['PATH']
if args.release and not env.get('CHAPTERLIGHT_KEYSTORE'):
    signing = private / 'signing/ao3_friendly_reader.json'
    if not signing.exists():
        raise SystemExit('Release signing environment is missing. See android/README.md.')
    data = json.loads(signing.read_text(encoding='utf-8'))
    for name, field in [('KEYSTORE', 'keystore'), ('STORE_PASSWORD', 'storePassword'), ('KEY_PASSWORD', 'keyPassword'), ('KEY_ALIAS', 'keyAlias')]:
        env['CHAPTERLIGHT_' + name] = data[field]
wrapper = root / 'android' / ('gradlew.bat' if os.name == 'nt' else 'gradlew')
tasks = ['testDebugUnitTest', 'lintDebug', 'assembleRelease' if args.release else 'assembleDebug']
subprocess.run([str(wrapper), *tasks, '-PreleaseRepository=cczzaa101/ao3_friendly_reader', '--console=plain'], cwd=root / 'android', env=env, check=True)
if args.release:
    version = dict(line.split('=', 1) for line in (root / 'android/version.properties').read_text().splitlines() if '=' in line)
    import sys
    subprocess.run([sys.executable, str(root / 'tools/package-android-release.py'), '--tag', 'android-v' + version['versionName']], check=True)
