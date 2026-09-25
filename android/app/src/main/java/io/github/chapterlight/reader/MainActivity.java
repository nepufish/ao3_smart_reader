package io.github.chapterlight.reader;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.slider.Slider;
import com.google.android.material.materialswitch.MaterialSwitch;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;
import java.util.ArrayList;
import java.util.Comparator;

public final class MainActivity extends AppCompatActivity {
    private ReaderUi ui;
    private WebView web;
    private LinearLayout root, header, dock, nativePage;
    private FrameLayout body;
    private ProgressBar progress;
    private TextView error, pageStatus, previousPage, nextPage;
    private SharedPreferences preferences;
    private UpdateManager updater;
    private ReaderAssets assets;
    private JSONObject reader = new JSONObject();
    private BottomSheetDialog sheet;
    private String section = "discover", libraryTab = "history", lastChrome = "";
    private boolean resumed, destroyed, ready;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private int tickCount;
    private final Runnable tick = new Runnable() {
        @Override public void run() {
            if (!resumed || destroyed) return;
            refreshReader();
            if (++tickCount % 4 == 0) cacheLibrary(null);
            handler.postDelayed(this, 800);
        }
    };

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        ui = new ReaderUi(this);
        preferences = getSharedPreferences("browser", MODE_PRIVATE);
        updater = new UpdateManager(this); assets = new ReaderAssets(this);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowCompat.getInsetsController(getWindow(),getWindow().getDecorView()).setAppearanceLightStatusBars(true);
        WindowCompat.getInsetsController(getWindow(),getWindow().getDecorView()).setAppearanceLightNavigationBars(true);
        root = ui.column(); root.setBackgroundColor(ReaderUi.PAPER);
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            androidx.core.graphics.Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout() | WindowInsetsCompat.Type.ime());
            v.setPadding(bars.left,bars.top,bars.right,bars.bottom); return insets;
        });
        header = ui.row(); header.setPadding(ui.dp(12),ui.dp(3),ui.dp(12),ui.dp(3)); root.addView(header,new LinearLayout.LayoutParams(-1,-2));
        progress = new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);
        progress.setProgressTintList(android.content.res.ColorStateList.valueOf(ReaderUi.ACCENT));
        root.addView(progress,new LinearLayout.LayoutParams(-1,ui.dp(2)));
        error = ui.text("",14,false); error.setPadding(ui.dp(20),ui.dp(12),ui.dp(20),ui.dp(12)); error.setVisibility(View.GONE); root.addView(error);
        body = new FrameLayout(this); root.addView(body,new LinearLayout.LayoutParams(-1,0,1));
        web = new WebView(this); web.setBackgroundColor(ReaderUi.PAPER); web.setFocusableInTouchMode(true);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false); settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false); settings.setSupportMultipleWindows(false);
        settings.setSafeBrowsingEnabled(true); settings.setUseWideViewPort(true); settings.setLoadWithOverviewMode(true);
        settings.setBuiltInZoomControls(true); settings.setDisplayZoomControls(false);
        CookieManager.getInstance().setAcceptCookie(true); CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) {
                progress.setProgress(value); progress.setVisibility(value == 100 || !section.equals("discover") ? View.GONE : View.VISIBLE);
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
                ready = false; reader = new JSONObject(); error.setVisibility(View.GONE); renderChrome();
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!UrlPolicy.isReaderUrl(url) || !url.equals(view.getUrl())) return;
                preferences.edit().putString("lastUrl",url).apply();
                try { view.evaluateJavascript(assets.script(), ignored -> { ready = true; refreshReader(); cacheLibrary(null); }); }
                catch (java.io.IOException e) { showError("阅读器加载失败，请重新安装应用。"); }
                CookieManager.getInstance().flush();
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError failure) {
                if (request.isForMainFrame()) showError("暂时无法连接。可点击顶部站点切换，或在菜单中重试。");
            }
        });
        web.setDownloadListener((url,agent,disposition,type,length) -> { if (UrlPolicy.isWebUrl(url)) openExternal(url); });
        body.addView(web,new FrameLayout.LayoutParams(-1,-1));
        dock = ui.column(); dock.setPadding(ui.dp(18),ui.dp(8),ui.dp(18),ui.dp(12)); root.addView(dock);
        setContentView(root);
        getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() { goBack(); }
        });
        renderChrome();
        String shared = Intent.ACTION_SEND.equals(getIntent().getAction()) ? getIntent().getStringExtra(Intent.EXTRA_TEXT) : null;
        if (shared != null && UrlPolicy.isReaderUrl(shared.trim())) navigate(shared.trim());
        else if (state == null || web.restoreState(state) == null) navigate(site() + "/works");
    }

    private String site() { return preferences.getBoolean("mirror",false) ? "https://www.ao3-cn.com" : "https://archiveofourown.org"; }
    private String siteName() { return site().contains("ao3-cn") ? "AO3 镜像" : "AO3"; }
    private boolean reading() { return section.equals("discover") && reader.optBoolean("reading"); }
    private void navigate(String url) {
        if (!UrlPolicy.isReaderUrl(url)) return;
        section = "discover"; showWeb(); web.loadUrl(url); renderChrome();
    }
    private void showWeb() {
        if (nativePage != null) { body.removeView(nativePage); nativePage = null; }
        web.setVisibility(View.VISIBLE);
    }
    private void selectSection(String target) {
        cacheLibrary(() -> {
            section = target;
            if (target.equals("discover")) showWeb();
            else if (target.equals("library")) showLibrary(); else showProfile();
            renderChrome();
        });
    }
    private void renderChrome() {
        String signature = section + reading() + reader.optBoolean("enabled") + reader.optString("title") + reader.optString("theme") + siteName();
        if (signature.equals(lastChrome)) { updatePageStatus(); return; }
        lastChrome = signature;
        ui.dark = reading() && reader.optString("theme").equals("dark");
        root.setBackgroundColor(ui.paper());
        WindowCompat.getInsetsController(getWindow(),getWindow().getDecorView()).setAppearanceLightStatusBars(!ui.dark);
        WindowCompat.getInsetsController(getWindow(),getWindow().getDecorView()).setAppearanceLightNavigationBars(!ui.dark);
        header.removeAllViews(); dock.removeAllViews();
        if (reading()) {
            header.addView(ui.iconButton("返回", "back", this::goBack));
            TextView title = ui.text(reader.optString("title","正在阅读"),16,true);
            title.setSingleLine(true); title.setEllipsize(TextUtils.TruncateAt.END);
            header.addView(title,new LinearLayout.LayoutParams(0,-2,1));
            header.addView(ui.iconButton("更多操作", "more", this::showMenu));
            LinearLayout pages = ui.row();
            previousPage = ui.iconButton("上一页或上一章", "back", () -> turnPage(false));
            nextPage = ui.iconButton("下一页或下一章", "next", () -> turnPage(true));
            pages.addView(previousPage);
            pageStatus = ui.text("",12,false); pageStatus.setTextColor(ui.muted()); pageStatus.setGravity(Gravity.CENTER);
            pages.addView(pageStatus,new LinearLayout.LayoutParams(0,-2,1)); pages.addView(nextPage);
            dock.setPadding(ui.dp(18),0,ui.dp(18),ui.dp(8)); dock.addView(pages,new LinearLayout.LayoutParams(-1,ui.dp(48)));
            LinearLayout controls = ui.row(); controls.setPadding(ui.dp(6),ui.dp(2),ui.dp(6),ui.dp(2)); controls.setBackground(ui.glass()); controls.setElevation(ui.dp(3));
            controls.addView(ui.button("目录","contents",this::showChapters),new LinearLayout.LayoutParams(0,-2,1));
            controls.addView(ui.button("书签","bookmark",this::saveBookmark),new LinearLayout.LayoutParams(0,-2,1));
            controls.addView(ui.button("排版","type",this::showAppearance),new LinearLayout.LayoutParams(0,-2,1));
            dock.addView(controls); updatePageStatus();
        } else {
            TextView brand = ui.text(section.equals("library") ? "书架" : section.equals("profile") ? "我的" : "发现",23,true);
            brand.setPadding(ui.dp(8),0,0,0); header.addView(brand,new LinearLayout.LayoutParams(0,-2,1));
            TextView source = ui.button(siteName()+"⌄",null,this::showSites); source.setTextSize(13); source.setBackground(ui.glass());
            header.addView(source);
            if (section.equals("discover")) { header.addView(ui.iconButton("搜索作品","search",this::showSearch)); header.addView(ui.iconButton("更多操作","more",this::showMenu)); }
            dock.setPadding(ui.dp(18),ui.dp(8),ui.dp(18),ui.dp(12));
            LinearLayout tabs = ui.row(); tabs.setPadding(ui.dp(5),ui.dp(5),ui.dp(5),ui.dp(5)); tabs.setBackground(ui.glass()); tabs.setElevation(ui.dp(4));
            String[] ids={"library","discover","profile"}, labels={"书架","发现","我的"};
            for (int i=0;i<ids.length;i++) {
                final String id=ids[i]; TextView tab=ui.button(labels[i],null,() -> selectSection(id));
                android.graphics.drawable.Drawable icon=ui.icon(id); icon.setBounds(0,0,ui.dp(22),ui.dp(22)); tab.setCompoundDrawables(null,icon,null,null); tab.setCompoundDrawablePadding(ui.dp(3)); tab.setTextSize(12);
                tab.setPadding(ui.dp(8),ui.dp(6),ui.dp(8),ui.dp(6));
                if (id.equals(section)) { tab.setBackground(ui.surface(0xE0DCEBE3,26)); tab.setTextColor(ReaderUi.ACCENT); tab.setSelected(true); }
                tabs.addView(tab,new LinearLayout.LayoutParams(0,-2,1));
            }
            dock.addView(tabs);
        }
    }
    private void updatePageStatus() {
        if (!reading() || pageStatus == null) return;
        pageStatus.setText(reader.optString("mode").equals("paged") ? reader.optString("page") : reader.optString("percentage"));
        previousPage.setEnabled(reader.optBoolean("previous") || !reader.optString("previousChapter").isEmpty());
        nextPage.setEnabled(reader.optBoolean("next") || !reader.optString("nextChapter").isEmpty());
        previousPage.setAlpha(previousPage.isEnabled()?1f:.3f); nextPage.setAlpha(nextPage.isEnabled()?1f:.3f);
    }
    private void turnPage(boolean next) {
        if (reader.optBoolean(next?"next":"previous") && reader.optString("mode").equals("paged")) action(next?"next":"previous");
        else { String url=reader.optString(next?"nextChapter":"previousChapter"); if (UrlPolicy.isReaderUrl(url)) navigate(url); }
    }
    private void refreshReader() {
        call("state()", state -> { reader=state; renderChrome(); });
    }
    private interface JsonResult { void accept(JSONObject json); }
    private void call(String expression, JsonResult callback) {
        if (!ready || !UrlPolicy.isReaderUrl(web.getUrl())) { if(callback!=null) callback.accept(new JSONObject()); return; }
        final String url=web.getUrl();
        web.evaluateJavascript("JSON.stringify(window.ChapterlightMobile?."+expression+" ?? {})", result -> {
            if (destroyed) return;
            if (!url.equals(web.getUrl())) { if(callback!=null) callback.accept(new JSONObject()); return; }
            try { Object decoded=new JSONTokener(result).nextValue(); JSONObject json=decoded instanceof String ? new JSONObject((String)decoded) : new JSONObject(); if(callback!=null) callback.accept(json); }
            catch(Exception ignored) { if(callback!=null) callback.accept(new JSONObject()); }
        });
    }
    private void action(String name) { call("action("+JSONObject.quote(name)+")", ignored -> handler.postDelayed(this::refreshReader,100)); }
    private void setting(String name,Object value) { call("setting("+JSONObject.quote(name)+","+JSONObject.quote(String.valueOf(value))+")",ignored -> refreshReader()); }
    private void cacheLibrary(Runnable after) {
        call("snapshot()", snapshot -> {
            String origin=snapshot.optString("origin");
            if (UrlPolicy.isReaderUrl(origin) && origin.equals(Uri.parse(web.getUrl()).getScheme()+"://"+Uri.parse(web.getUrl()).getAuthority())) preferences.edit().putString("library:"+origin,snapshot.toString()).apply();
            if(after!=null) after.run();
        });
    }
    private void saveBookmark() {
        action("bookmark");
        handler.postDelayed(() -> call("state()", state -> {
            String status=state.optString("bookmarkStatus"); toast(status.isEmpty()?"当前位置已记录":status); cacheLibrary(null);
        }),300);
    }
    private LinearLayout nativeContent() {
        ui.dark=false;
        if(nativePage!=null) body.removeView(nativePage);
        web.setVisibility(View.GONE); progress.setVisibility(View.GONE); error.setVisibility(View.GONE);
        nativePage=ui.column(); ScrollView scroll=new ScrollView(this); scroll.setFillViewport(true);
        LinearLayout content=ui.column(); content.setPadding(ui.dp(22),ui.dp(20),ui.dp(22),ui.dp(24));
        scroll.addView(content); nativePage.addView(scroll,new LinearLayout.LayoutParams(-1,-1)); body.addView(nativePage,new FrameLayout.LayoutParams(-1,-1)); return content;
    }
    private void space(LinearLayout parent,int height) { parent.addView(new View(this),new LinearLayout.LayoutParams(1,ui.dp(height))); }
    private void note(LinearLayout parent,String message) { TextView text=ui.text(message,14,false); text.setTextColor(ui.muted()); text.setLineSpacing(ui.dp(4),1); parent.addView(text); }
    private void showLibrary() {
        LinearLayout content=nativeContent(); content.addView(ui.text("故事，接着读。",28,true)); space(content,8); note(content,"阅读进度自动保存，书签留住你喜欢的位置。"); space(content,24);
        LinearLayout tabs=ui.row(); tabs.setBackground(ui.surface(0xFFE5ECE7,24));
        for(String id:new String[]{"history","bookmarks"}) { TextView tab=ui.button(id.equals("history")?"最近阅读":"我的书签",null,() -> { libraryTab=id; showLibrary(); }); if(id.equals(libraryTab)) tab.setBackground(ui.surface(Color.WHITE,24)); tabs.addView(tab,new LinearLayout.LayoutParams(0,-2,1)); }
        content.addView(tabs); space(content,22);
        ArrayList<JSONObject> entries=new ArrayList<>();
        for (java.util.Map.Entry<String,?> stored:preferences.getAll().entrySet()) {
            if(!stored.getKey().startsWith("library:")) continue;
            try { JSONArray list=new JSONObject(String.valueOf(stored.getValue())).optJSONArray(libraryTab); if(list!=null) for(int i=0;i<list.length();i++) { JSONObject item=list.optJSONObject(i); if(item!=null&&UrlPolicy.isReaderUrl(item.optString("url"))) entries.add(item); } } catch(Exception ignored) { }
        }
        entries.sort(Comparator.comparingLong((JSONObject item)->item.optLong("updated")).reversed());
        if(entries.isEmpty()) { space(content,35); content.addView(ui.text(libraryTab.equals("history")?"下一段故事，等你开始":"还没有书签",21,true)); space(content,12); note(content,libraryTab.equals("history")?"在发现中打开作品，下次就能从这里继续。":"阅读时轻点底部的书签，即可记住当前位置。"); space(content,24); TextView browse=ui.button("去发现","discover",()->{section="discover";navigate(site()+"/works");}); browse.setBackground(ui.surface(0xFFDFEBE3,24)); content.addView(browse); }
        for(JSONObject item:entries) {
            LinearLayout card=ui.column(); card.setPadding(ui.dp(18),ui.dp(18),ui.dp(18),ui.dp(18)); card.setBackground(ui.surface(Color.WHITE,20));
            TextView title=ui.text(item.optString("title","未命名作品"),18,true); title.setMaxLines(2); title.setEllipsize(TextUtils.TruncateAt.END); card.addView(title); space(card,6);
            note(card,item.optString("author")); space(card,14); note(card,item.optString("location","继续阅读"));
            TextView resume=ui.button("继续阅读","next",()->navigate(item.optString("url"))); resume.setTextColor(ReaderUi.ACCENT); card.addView(resume); content.addView(card); space(content,12);
        }
    }
    private void showProfile() {
        LinearLayout content=nativeContent(); content.addView(ui.text("留一盏灯，读一段故事。",26,true)); space(content,10); note(content,"章灯 · "+BuildConfig.VERSION_NAME); space(content,28);
        addRow(content,"切换站点",siteName(),this::showSites);
        addRow(content,"AO3 账号","在当前站点登录",()->navigate(site()+"/users/login"));
        addRow(content,"浏览分类","Fandoms 与标签",()->navigate(site()+"/media"));
        addRow(content,"检查更新","GitHub Releases",()->updater.check());
        addRow(content,"项目与反馈","GitHub",()->openExternal("https://github.com/"+BuildConfig.RELEASE_REPOSITORY));
        space(content,24); note(content,"阅读记录保存在本机，两个站点分别记录。登录、评论和筛选仍由 AO3 提供。");
    }
    private void addRow(LinearLayout parent,String title,String subtitle,Runnable click) {
        LinearLayout row=ui.row(); row.setPadding(ui.dp(16),ui.dp(14),ui.dp(10),ui.dp(14)); row.setBackground(ui.surface(ui.card(),18));
        LinearLayout labels=ui.column(); labels.addView(ui.text(title,16,true)); if(!subtitle.isEmpty()) { space(labels,4); note(labels,subtitle); }
        row.addView(labels,new LinearLayout.LayoutParams(0,-2,1)); row.addView(ui.iconButton(title,"next",click)); row.setOnClickListener(v->click.run()); parent.addView(row); space(parent,10);
    }
    private LinearLayout sheet(String title) {
        if(sheet!=null) sheet.dismiss(); sheet=new BottomSheetDialog(this);
        LinearLayout content=ui.column(); content.setPadding(ui.dp(22),ui.dp(12),ui.dp(22),ui.dp(28)); content.setBackground(ui.surface(ui.paper(),28));
        View grabber=new View(this); grabber.setBackground(ui.surface(0xFFCAD5CD,4)); LinearLayout.LayoutParams grip=new LinearLayout.LayoutParams(ui.dp(34),ui.dp(4)); grip.gravity=Gravity.CENTER; grip.bottomMargin=ui.dp(10); content.addView(grabber,grip);
        LinearLayout heading=ui.row(); heading.addView(ui.text(title,23,true),new LinearLayout.LayoutParams(0,-2,1)); heading.addView(ui.iconButton("关闭","close",()->sheet.dismiss())); content.addView(heading); space(content,16);
        ScrollView scroll=new ScrollView(this); scroll.addView(content); sheet.setContentView(scroll); sheet.show();
        sheet.getBehavior().setState(com.google.android.material.bottomsheet.BottomSheetBehavior.STATE_EXPANDED);
        return content;
    }
    private void showSites() {
        LinearLayout content=sheet("选择站点"); note(content,"新页面将在所选站点的作品列表打开。"); space(content,20);
        addRow(content,"AO3 原站","archiveofourown.org",()->switchSite(false));
        addRow(content,"AO3 镜像","www.ao3-cn.com",()->switchSite(true));
    }
    private void switchSite(boolean mirror) { preferences.edit().putBoolean("mirror",mirror).apply(); sheet.dismiss(); cacheLibrary(()->navigate(site()+"/works")); }
    private void showSearch() {
        LinearLayout content=sheet("找一段故事");
        EditText input=new EditText(this); input.setSingleLine(true); input.setTextSize(17); input.setHint("作品、作者、角色或关键词"); input.setPadding(ui.dp(18),ui.dp(14),ui.dp(18),ui.dp(14)); input.setBackground(ui.surface(0xFFE9EEEA,18)); input.setImeOptions(EditorInfo.IME_ACTION_SEARCH); content.addView(input,new LinearLayout.LayoutParams(-1,-2)); space(content,16);
        Runnable search=()->{ String query=input.getText().toString().trim(); if(query.isEmpty()) {input.setError("请输入关键词");return;} sheet.dismiss(); navigate(site()+"/works/search?work_search%5Bquery%5D="+Uri.encode(query)); };
        TextView submit=ui.button("搜索作品","search",search); submit.setBackground(ui.surface(0xFFDFEBE3,24)); content.addView(submit);
        input.setOnEditorActionListener((v,action,event)->{if(action==EditorInfo.IME_ACTION_SEARCH){search.run();return true;}return false;});
        space(content,12); content.addView(ui.button("高级搜索与筛选",null,()->{sheet.dismiss();navigate(site()+"/works/search");}));
        input.requestFocus(); input.postDelayed(() -> ((android.view.inputmethod.InputMethodManager)getSystemService(INPUT_METHOD_SERVICE)).showSoftInput(input,android.view.inputmethod.InputMethodManager.SHOW_IMPLICIT),250); sheet.getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE|WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE);
    }
    private void showMenu() {
        call("state()", fresh -> { reader=fresh; showMenuContent(); });
    }
    private void showMenuContent() {
        LinearLayout content=sheet("页面与阅读");
        MaterialSwitch toggle=new MaterialSwitch(this); toggle.setText("阅读模式"); toggle.setTextSize(17); toggle.setTextColor(ui.ink()); toggle.setMinHeight(ui.dp(56)); toggle.setChecked(reader.optBoolean("enabled")); toggle.setEnabled(ready && reader.has("enabled"));
        toggle.setOnCheckedChangeListener((v,checked)->action("toggle")); content.addView(toggle); note(content,"关闭后显示原站页面，随时可以重新开启。"); space(content,16);
        addRow(content,"作品列表","",()->{sheet.dismiss();navigate(site()+"/works");});
        addRow(content,"切换站点",siteName(),this::showSites);
        addRow(content,"刷新页面","",()->{sheet.dismiss();web.reload();});
        addRow(content,"在浏览器中打开","",()->{sheet.dismiss();openExternal(web.getUrl());});
    }
    private void showChapters() {
        LinearLayout content=sheet("章节目录"); JSONArray chapters=reader.optJSONArray("chapters");
        if(chapters==null || chapters.length()==0) note(content,"这篇作品没有可切换的章节。");
        else for(int i=0;i<chapters.length();i++) {JSONObject chapter=chapters.optJSONObject(i); if(chapter!=null&&UrlPolicy.isReaderUrl(chapter.optString("url"))) addRow(content,chapter.optString("title"),"",()->{sheet.dismiss();navigate(chapter.optString("url"));});}
    }
    private void showAppearance() {
        LinearLayout content=sheet("读得舒服一点");
        note(content,"纸张"); choices(content,new String[]{"日光","暖纸","夜读"},new String[]{"light","paper","dark"},"theme"); space(content,16);
        note(content,"翻阅方式"); choices(content,new String[]{"翻页","滚动"},new String[]{"paged","scroll"},"mode"); space(content,16);
        slider(content,"字号", "size",16,30,1,(float)reader.optDouble("size",20));
        slider(content,"行距", "leading",1.4f,2.4f,.05f,(float)reader.optDouble("leading",1.8));
        note(content,"字体"); choices(content,new String[]{"宋体","楷体","黑体"},new String[]{"serif","book","sans"},"font");
        space(content,12); content.addView(ui.button("自定义字体",null,this::showCustomFont));
        note(content,"使用设备上可用的字体。翻页时也可以左右轻扫正文。");
    }
    private void showCustomFont() {
        LinearLayout content=sheet("自定义字体"); note(content,"输入设备已安装的字体名称，多个字体用逗号分隔。"); space(content,16);
        EditText input=new EditText(this); input.setText(reader.optString("customFont")); input.setTextColor(ui.ink()); input.setHint("例如 Noto Serif CJK SC"); input.setTextSize(16); input.setMinHeight(ui.dp(48)); content.addView(input);
        content.addView(ui.button("应用字体",null,()->{setting("customFont",input.getText().toString());sheet.dismiss();}));
    }
    private void choices(LinearLayout parent,String[] labels,String[] values,String key) {
        LinearLayout row=ui.row(); row.setPadding(0,ui.dp(8),0,0);
        for(int i=0;i<labels.length;i++) { final String value=values[i]; TextView choice=ui.button(labels[i],null,()->{}); if(value.equals(reader.optString(key))) {choice.setBackground(ui.surface(ui.selected(),24));choice.setSelected(true);} choice.setOnClickListener(v->{setting(key,value); for(int j=0;j<row.getChildCount();j++){row.getChildAt(j).setBackground(ui.surface(row.getChildAt(j)==v?ui.selected():0x00FFFFFF,24));row.getChildAt(j).setSelected(row.getChildAt(j)==v);} }); row.addView(choice,new LinearLayout.LayoutParams(0,-2,1)); }
        parent.addView(row);
    }
    private void slider(LinearLayout parent,String label,String key,float min,float max,float step,float current) {
        TextView value=ui.text(label+"  "+current,15,true); parent.addView(value); Slider slider=new Slider(this); slider.setValueFrom(min); slider.setValueTo(max); slider.setStepSize(step); slider.setValue(Math.max(min,Math.min(max,Math.round((current-min)/step)*step+min))); slider.setContentDescription(label); parent.addView(slider);
        slider.addOnChangeListener((view,n,fromUser)->{if(fromUser) setting(key,n); value.setText(String.format(java.util.Locale.ROOT,key.equals("size")?"%s  %.0f":"%s  %.2f",label,n));});
        slider.addOnSliderTouchListener(new Slider.OnSliderTouchListener(){ public void onStartTrackingTouch(Slider s){} public void onStopTrackingTouch(Slider s){setting(key,s.getValue());}}); space(parent,12);
    }
    private void toast(String message) { Toast.makeText(this,message,Toast.LENGTH_SHORT).show(); }
    private void showError(String message) { error.setText(message); error.setVisibility(View.VISIBLE); }
    void openExternal(String url) { if(!UrlPolicy.isWebUrl(url)) return; try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)));}catch(android.content.ActivityNotFoundException e){toast("没有可打开链接的浏览器");} }
    private void goBack() {
        if(sheet!=null&&sheet.isShowing()){sheet.dismiss();return;}
        if(!section.equals("discover")){section="discover";showWeb();renderChrome();}
        else if(web.canGoBack()) web.goBack(); else finish();
    }
    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
    @Override protected void onPause() { resumed=false;handler.removeCallbacks(tick);cacheLibrary(null);web.onPause();CookieManager.getInstance().flush();super.onPause(); }
    @Override protected void onResume() { super.onResume();resumed=true;if(web!=null)web.onResume();if(updater!=null)updater.resumeInstall();handler.removeCallbacks(tick);handler.post(tick); }
    @Override protected void onDestroy() { destroyed=true;handler.removeCallbacksAndMessages(null);if(sheet!=null)sheet.dismiss();updater.close();body.removeView(web);web.destroy();super.onDestroy(); }
}
