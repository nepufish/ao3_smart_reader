package io.github.chapterlight.reader;

import android.content.Intent;
import android.graphics.Bitmap;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.TextView;
import androidx.test.rule.ActivityTestRule;
import androidx.test.platform.app.InstrumentationRegistry;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import org.junit.Rule;
import org.junit.Test;
import org.json.JSONObject;
import org.json.JSONTokener;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import static org.junit.Assert.*;

/** Real Android views + Chromium layout against original, non-explicit fixtures. */
public class MobileFlowTest {
    @Rule public ActivityTestRule<MainActivity> rule = new ActivityTestRule<>(MainActivity.class,true,false);
    private MainActivity activity;
    private WebView web;
    private void main(Runnable r) { InstrumentationRegistry.getInstrumentation().runOnMainSync(r); }
    private Object field(String name) throws Exception { java.lang.reflect.Field f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);return f.get(activity); }
    private View find(View node,String label) {
        if(label.contentEquals(node.getContentDescription()==null?"":node.getContentDescription()) || node instanceof TextView && label.contentEquals(((TextView)node).getText())) return node;
        if(node instanceof ViewGroup) for(int i=0;i<((ViewGroup)node).getChildCount();i++){View found=find(((ViewGroup)node).getChildAt(i),label);if(found!=null)return found;}
        return null;
    }
    private void click(String label) throws Exception {
        BottomSheetDialog dialog=(BottomSheetDialog)field("sheet");
        View root=dialog!=null&&dialog.isShowing()?dialog.getWindow().getDecorView():activity.getWindow().getDecorView();
        main(()->{View target=find(root,label);assertNotNull("Missing control: "+label,target);assertTrue("Disabled control: "+label,target.isEnabled());target.performClick();});
        Thread.sleep(300);
    }
    private String js(String expression) throws Exception {
        String[] result={null};CountDownLatch done=new CountDownLatch(1);
        main(()->web.evaluateJavascript(expression,value->{result[0]=value;done.countDown();}));
        assertTrue(done.await(5,TimeUnit.SECONDS));return result[0];
    }
    private JSONObject state() throws Exception {return new JSONObject((String)new JSONTokener(js("JSON.stringify(window.ChapterlightMobile?.state()||{})")).nextValue());}
    private void tapPage(long duration) throws Exception {
        int[] location=new int[2]; main(()->web.getLocationOnScreen(location));
        float x=location[0]+web.getWidth()*.5f,y=location[1]+web.getHeight()*.5f;
        long now=android.os.SystemClock.uptimeMillis();
        android.view.MotionEvent down=android.view.MotionEvent.obtain(now,now,0,x,y,0);
        InstrumentationRegistry.getInstrumentation().sendPointerSync(down);down.recycle();Thread.sleep(duration);
        android.view.MotionEvent up=android.view.MotionEvent.obtain(now,android.os.SystemClock.uptimeMillis(),1,x,y,0);
        InstrumentationRegistry.getInstrumentation().sendPointerSync(up);up.recycle();Thread.sleep(450);
    }
    private void load(String path,String content) throws Exception {
        main(()->{web.stopLoading();web.loadDataWithBaseURL("https://archiveofourown.org"+path,
                "<!doctype html><meta name='viewport' content='width=device-width,initial-scale=1'><style>body{margin:0}#header{background:#900;color:white}.work.blurb{border:1px solid #999;margin:20px}.required-tags{list-style:none}.userstuff{line-height:1.8}</style><div id='outer'><header id='header'><h1>Archive of Our Own</h1><nav><ul class='primary navigation'><li>Fandoms</li><li>Search</li></ul></nav></header><div id='inner'><main id='main'>"+content+"</main></div></div>","text/html","UTF-8","https://archiveofourown.org"+path);});
        for(int i=0;i<60;i++){if(!state().toString().equals("{}"))break;Thread.sleep(100);}
        Thread.sleep(1000);assertTrue("Reader missing: "+js("JSON.stringify({href:location.href,root:!!document.querySelector('#chapterlight-root'),html:document.documentElement.className})"),state().has("enabled"));
    }
    private void screenshot(String name) throws Exception {
        Thread.sleep(1100);File target=new File(activity.getExternalFilesDir(null),name+".png");
        Bitmap image=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();assertNotNull(image);
        try(FileOutputStream out=new FileOutputStream(target)){image.compress(Bitmap.CompressFormat.PNG,100,out);} image.recycle();
    }
    @Test public void nativeBrowseReadLibraryAndSettings() throws Exception {
        activity=rule.launchActivity(new Intent());web=(WebView)field("web");
        String[] launchUrl={null};main(()->launchUrl[0]=web.getUrl());
        assertNotNull(launchUrl[0]);assertTrue(launchUrl[0].endsWith("/works"));
        js("localStorage.clear()");
        String cards="<h2 class='heading'>Search Results</h2><p>You searched for: 灯 sort by: best match descending</p><h3 class='heading'>1,758 Found <a>?</a></h3><ul class='navigation actions' style='float:right'><li><a href='/works/search?edit_search=true'>Edit Your Search</a></li></ul><ol class='work index group'>";
        String[] titles={"借一盏灯等你","雨后的旧书店","春山与远行的人"};
        for(String title:titles)cards+="<li class='work blurb group'><div class='header module'><h4 class='heading'><a href='/works/101'>"+title+"</a> by <a rel='author'>章灯</a></h4><h5 class='fandoms heading'>原创作品 · Original Work</h5><ul class='required-tags'><li>General Audiences · 无警告</li></ul></div><ul class='tags'><li><a>久别重逢</a> · <a>日常</a> · <a>温暖</a></li></ul><blockquote class='userstuff summary'><p>离城七年，故人未远。一盏长明的灯，一封未寄的信，和一段终于可以慢慢说完的往事。</p></blockquote><dl class='stats'><dt>字数</dt><dd>12,860</dd><dt>章节</dt><dd>6/6</dd></dl></li>";
        load("/works/search?work_search%5Bquery%5D=%E7%81%AF",cards+"</ol><form class='filters'><input name='q'><button>筛选</button></form>");
        assertFalse(state().optBoolean("reading"));
        assertEquals("\"1,758 部作品\"",js("document.querySelector('.cl-results-header p').textContent"));
        assertEquals("\"none\"",js("getComputedStyle(document.querySelector('.cl-search-original')).display"));
        assertEquals("\"none\"",js("getComputedStyle(document.querySelector('#chapterlight-root')).display"));
        assertEquals("true",js("document.documentElement.scrollWidth<=innerWidth"));screenshot("01-discover");
        click("搜索作品");screenshot("02-search");click("关闭");
        click("更多操作");click("阅读模式");Thread.sleep(500);
        assertFalse("native ready="+field("ready")+" state="+field("reader")+" js="+state(),state().optBoolean("enabled"));assertEquals("\"block\"",js("getComputedStyle(document.querySelector('#header')).display"));
        click("阅读模式");Thread.sleep(500);assertTrue(state().optBoolean("enabled"));click("关闭");
        String[] paragraphs={"暮色落进长街时，她终于回到了那间小小的书店。窗边的灯还亮着，旧书页里藏着春日的气息。", "推开门，铃声轻轻响起。柜台后的人抬起头，像是早就知道她会来，只说了一句，欢迎回来。", "她把一路的风尘放在门外。木桌上有一杯刚沏好的茶，杯口升起薄薄的白雾。街上的雨还没有停，落在屋檐下，像有人慢慢翻书。", "七年前留下的那本书，仍在靠窗的第二层书架上。书页间夹着一枚银杏叶，颜色淡了，脉络却很清楚。", "“还记得读到哪里了吗？”他问。", "她笑了笑，没有回答。窗外的灯一盏接着一盏亮起来，她坐到从前的位置，翻开那一页。原来有些故事，不必急着说完。"};
        StringBuilder prose=new StringBuilder();for(int i=0;i<30;i++)prose.append("<p>").append(paragraphs[i%paragraphs.length]).append("</p>");
        load("/works/101","<div id='workskin'><div class='preface group'><h2 class='title heading'>借一盏灯等你</h2><h3 class='byline'>章灯</h3><div class='summary'><p>一盏长明的灯，一段慢慢说完的故事。</p></div></div><div id='chapters'><div class='chapter' id='chapter-1'><div class='preface'><h3 class='title'>第一章 · 故人归来</h3></div><div class='userstuff' role='article'>"+prose+"</div></div></div></div>");
        assertTrue(state().optBoolean("reading"));assertEquals("paged",state().optString("mode"));assertEquals("\"none\"",js("getComputedStyle(document.querySelector('#header')).display"));
        Thread.sleep(500); assertFalse((Boolean)field("controlsVisible"));
        assertEquals(View.GONE,((View)field("header")).getVisibility());
        assertEquals(View.GONE,((View)field("dock")).getVisibility());screenshot("03-reader-fullscreen");
        String dimensions=js("innerWidth+','+innerHeight");
        tapPage(70);assertTrue((Boolean)field("controlsVisible"));
        assertEquals(dimensions,js("innerWidth+','+innerHeight"));
        String first=state().optString("page");click("下一页或下一章");Thread.sleep(400);assertNotEquals(first,state().optString("page"));screenshot("03-reader-controls");
        tapPage(70);assertFalse((Boolean)field("controlsVisible"));
        assertEquals(View.VISIBLE,((View)field("quietPageStatus")).getVisibility());screenshot("03-reader-fullscreen");
        tapPage(350);assertFalse("A held touch must not reveal controls",(Boolean)field("controlsVisible"));
        tapPage(70);assertTrue((Boolean)field("controlsVisible"));
        assertEquals(dimensions,js("innerWidth+','+innerHeight"));
        click("书签");Thread.sleep(700);assertTrue(Integer.parseInt(js("Object.keys(localStorage).filter(k=>k.startsWith('chapterlight:bookmark:')).length"))>0);
        click("排版");screenshot("04-typography");click("滚动");assertEquals("scroll",state().optString("mode"));click("翻页");assertEquals("paged",state().optString("mode"));click("夜读");click("关闭");screenshot("05-night");
        click("排版");click("暖纸");click("关闭");
        // Switch using the native navigation method: no replacement WebView shell.
        java.lang.reflect.Method select=MainActivity.class.getDeclaredMethod("selectSection",String.class);select.setAccessible(true);
        main(()->{try{select.invoke(activity,"library");}catch(Exception e){throw new RuntimeException(e);}});Thread.sleep(800);screenshot("06-library");
        click("我的书签");screenshot("07-bookmarks");
        main(()->activity.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));Thread.sleep(1200);screenshot("08-landscape");
        main(()->activity.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));
    }
}
