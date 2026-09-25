package io.github.chapterlight.reader;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.inputmethod.InputMethodManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.PopupMenu;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

public final class MainActivity extends Activity {
    private WebView web;
    private EditText address;
    private ProgressBar progress;
    private TextView error;
    private SharedPreferences preferences;
    private UpdateManager updater;
    private String readerScript;

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        preferences = getSharedPreferences("browser", MODE_PRIVATE);
        updater = new UpdateManager(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(246, 243, 236));
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        LinearLayout navigation = new LinearLayout(this);
        navigation.setPadding(dp(4), 0, dp(4), 0);
        Button back = button("‹", "返回上一页");
        back.setOnClickListener(v -> goBack());
        navigation.addView(back, new LinearLayout.LayoutParams(dp(44), dp(48)));
        address = new EditText(this);
        address.setSingleLine(true);
        address.setTextSize(13);
        address.setHint("输入 AO3 网址");
        address.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_URI);
        address.setImeOptions(android.view.inputmethod.EditorInfo.IME_ACTION_GO);
        address.setSelectAllOnFocus(true);
        address.setOnEditorActionListener((v, action, event) -> {
            if (action != android.view.inputmethod.EditorInfo.IME_ACTION_GO) return false;
            String input = address.getText().toString().trim();
            if (!input.contains("://")) input = "https://" + input;
            if (UrlPolicy.isReaderUrl(input)) {
                address.clearFocus();
                ((InputMethodManager) getSystemService(INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(address.getWindowToken(), 0);
                navigate(input);
            } else Toast.makeText(this, "请输入受支持的 AO3 HTTPS 网址", Toast.LENGTH_LONG).show();
            return true;
        });
        navigation.addView(address, new LinearLayout.LayoutParams(0, dp(48), 1));
        Button menu = button("⋮", "浏览器菜单与更新");
        menu.setOnClickListener(this::showMenu);
        navigation.addView(menu, new LinearLayout.LayoutParams(dp(44), dp(48)));
        root.addView(navigation);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        root.addView(progress, new LinearLayout.LayoutParams(-1, dp(2)));
        error = new TextView(this);
        error.setPadding(dp(16), dp(12), dp(16), dp(12));
        error.setTextSize(14);
        error.setVisibility(View.GONE);
        root.addView(error);
        web = new WebView(this);
        web.setBackgroundColor(Color.WHITE);
        web.setFocusableInTouchMode(true);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setSafeBrowsingEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) {
                progress.setProgress(value);
                progress.setVisibility(value == 100 ? View.GONE : View.VISIBLE);
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                String url = request.getUrl().toString();
                if (UrlPolicy.isReaderUrl(url)) return false;
                if (request.hasGesture() && UrlPolicy.isWebUrl(url)) openExternal(url);
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                error.setVisibility(View.GONE);
                if (!address.hasFocus()) address.setText(url);
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!UrlPolicy.isReaderUrl(url) || !url.equals(view.getUrl())) return;
                preferences.edit().putString("lastUrl", url).apply();
                if (!address.hasFocus()) address.setText(url);
                try { view.evaluateJavascript(readerScript(), null); }
                catch (IOException e) { showError("阅读器加载失败，请重新安装应用。"); }
                CookieManager.getInstance().flush();
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError failure) {
                if (request.isForMainFrame()) showError("页面暂时无法打开。请检查网络，或从菜单选择站点后重试。");
            }
        });
        web.setDownloadListener((url, agent, disposition, type, length) -> {
            if (UrlPolicy.isWebUrl(url)) openExternal(url);
        });
        root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::goBack);
        String shared = getIntent().getAction() != null && getIntent().getAction().equals(Intent.ACTION_SEND)
                ? getIntent().getStringExtra(Intent.EXTRA_TEXT) : null;
        if (shared != null && UrlPolicy.isReaderUrl(shared.trim())) navigate(shared.trim());
        else if (state == null || web.restoreState(state) == null) {
            String last = preferences.getString("lastUrl", "https://archiveofourown.org/");
            navigate(UrlPolicy.isReaderUrl(last) ? last : "https://archiveofourown.org/");
        }
    }

    private Button button(String text, String description) {
        Button result = new Button(this);
        result.setText(text); result.setTextSize(22); result.setPadding(0, 0, 0, 0);
        result.setMinWidth(0); result.setMinimumWidth(0); result.setContentDescription(description);
        return result;
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private void navigate(String url) { if (UrlPolicy.isReaderUrl(url)) web.loadUrl(url); }
    private void showError(String message) { error.setText(message); error.setVisibility(View.VISIBLE); }
    void openExternal(String url) {
        if (!UrlPolicy.isWebUrl(url)) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
        catch (android.content.ActivityNotFoundException e) { Toast.makeText(this, "没有可打开链接的浏览器", Toast.LENGTH_LONG).show(); }
    }
    private void showMenu(View anchor) {
        PopupMenu menu = new PopupMenu(this, anchor);
        menu.getMenu().add(0, 1, 0, "刷新页面");
        menu.getMenu().add(0, 2, 1, "选择站点");
        menu.getMenu().add(0, 3, 2, "在浏览器中打开");
        menu.getMenu().add(0, 4, 3, "检查更新");
        menu.getMenu().add(0, 5, 4, "关于章灯");
        menu.setOnMenuItemClickListener(item -> {
            switch (item.getItemId()) {
                case 1: web.reload(); break;
                case 2: new AlertDialog.Builder(this).setTitle("选择站点")
                        .setItems(new String[]{"AO3 · archiveofourown.org", "AO3 镜像 · www.ao3-cn.com"},
                                (dialog, which) -> navigate(which == 0 ? "https://archiveofourown.org/" : "https://www.ao3-cn.com/"))
                        .show(); break;
                case 3: openExternal(web.getUrl()); break;
                case 4: updater.check(); break;
                case 5: new AlertDialog.Builder(this).setTitle("章灯 " + BuildConfig.VERSION_NAME)
                        .setMessage("AO3 中文阅读。\n\n阅读模式开关、书签、阅读进度和自定义排版。\n阅读记录保存在应用内，按站点区分，不会与桌面扩展同步。\n\n更新来源：GitHub Releases\n" + BuildConfig.RELEASE_REPOSITORY)
                        .setPositiveButton("确定", null).show(); break;
                default: return false;
            }
            return true;
        });
        menu.show();
    }
    private String asset(String name) throws IOException {
        try (java.io.InputStream stream = getAssets().open(name)) {
            java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream();
            byte[] buffer = new byte[8192]; int count;
            while ((count = stream.read(buffer)) != -1) output.write(buffer, 0, count);
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }
    private String readerScript() throws IOException {
        if (readerScript != null) return readerScript;
        String css = asset("reader/reader.css") + "\n" + asset("mobile.css");
        // A top-frame origin guard also covers a navigation racing the callback.
        readerScript = "(() => { if (window !== window.top || !['archiveofourown.org','www.archiveofourown.org','ao3-cn.com','www.ao3-cn.com','ao3.cn','www.ao3.cn'].includes(location.hostname) || location.protocol !== 'https:' || document.querySelector('#chapterlight-root')) return;\n"
                + "document.documentElement.classList.add('cl-android');\n"
                + "let viewport=document.querySelector('meta[name=viewport]');if(!viewport){viewport=document.createElement('meta');viewport.name='viewport';document.head.append(viewport);}viewport.content='width=device-width,initial-scale=1';\n"
                + "const style=document.createElement('style');style.textContent=" + JSONObject.quote(css) + ";document.head.append(style);\n"
                + asset("storage.js") + "\n" + asset("reader/pagination.js") + "\n"
                + asset("reader/library.js") + "\n" + asset("reader/reader.js") + "\n"
                + asset("mobile.js") + "\n})();";
        return readerScript;
    }
    private void goBack() { if (web.canGoBack()) web.goBack(); else finish(); }
    // Android 13+ uses the OnBackInvokedDispatcher callback registered in onCreate;
    // keep this entry point exclusively for the Android 8–12 back-button path.
    @SuppressLint("GestureBackNavigation")
    @SuppressWarnings("deprecation") @Override public void onBackPressed() { goBack(); }
    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
    @Override protected void onPause() { super.onPause(); web.onPause(); CookieManager.getInstance().flush(); }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); if (updater != null) updater.resumeInstall(); }
    @Override protected void onDestroy() { updater.close(); web.destroy(); super.onDestroy(); }
}
