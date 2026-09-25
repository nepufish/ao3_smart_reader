package io.github.chapterlight.reader;
import android.content.Context;
import org.json.JSONObject;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
final class ReaderAssets {
    private final Context context;
    ReaderAssets(Context context) { this.context = context; }
    private String asset(String name) throws IOException {
        try (java.io.InputStream stream = context.getAssets().open(name)) {
            java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream();
            byte[] buffer = new byte[8192]; int count;
            while ((count = stream.read(buffer)) != -1) output.write(buffer, 0, count);
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }
    String script() throws IOException {
        if (readerScript != null) return readerScript;
        String css = asset("reader/reader.css") + "\n" + asset("mobile.css");
        // A top-frame origin guard also covers a navigation racing the callback.
        readerScript = "(() => { if (!document.documentElement || !document.head || !document.body || window !== window.top || !['archiveofourown.org','www.archiveofourown.org','ao3-cn.com','www.ao3-cn.com','ao3.cn','www.ao3.cn'].includes(location.hostname) || location.protocol !== 'https:' || document.querySelector('#chapterlight-root')) return;\n"
                + "document.documentElement.classList.add('cl-android');\n"
                + "let viewport=document.querySelector('meta[name=viewport]');if(!viewport){viewport=document.createElement('meta');viewport.name='viewport';document.head.append(viewport);}viewport.content='width=device-width,initial-scale=1';\n"
                + "const style=document.createElement('style');style.textContent=" + JSONObject.quote(css) + ";document.head.append(style);\n"
                + asset("storage.js") + "\n" + asset("reader/pagination.js") + "\n"
                + asset("reader/library.js") + "\n" + asset("reader/reader.js") + "\n"
                + asset("mobile.js") + "\n})();";
        return readerScript;
    }

private String readerScript;
}
