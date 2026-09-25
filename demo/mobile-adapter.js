// Optional local phone preview; the Android build injects these same assets.
if (new URL(location.href).searchParams.has('mobile')) {
  document.documentElement.classList.add('cl-android');
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = '/android/app/src/main/assets/mobile.css';
  document.head.append(style);
  const script = document.createElement('script');
  script.src = '/android/app/src/main/assets/mobile.js';
  document.head.append(script);
}
