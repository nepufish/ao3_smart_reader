package io.github.chapterlight.reader;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import static org.junit.Assert.*;

public class ReleaseInfoTest {
    private static final String REPO = "nepufish/ao3_smart_reader";
    private JSONObject release() throws Exception {
        return new JSONObject().put("tag_name", "android-v0.7.0").put("draft", false).put("prerelease", false)
                .put("assets", new JSONArray().put(new JSONObject().put("name", "Chapterlight.apk")
                        .put("browser_download_url", "https://github.com/" + REPO + "/releases/download/android-v0.7.0/Chapterlight.apk")));
    }
    private JSONObject metadata() throws Exception {
        return new JSONObject().put("versionCode", 700).put("versionName", "0.7.0").put("apk", "Chapterlight.apk")
                .put("sha256", "a".repeat(64));
    }
    @Test public void parsesMatchingVersionAndAsset() throws Exception {
        ReleaseInfo result = ReleaseInfo.parse(release(), metadata(), REPO);
        assertEquals(700, result.versionCode);
        assertEquals("0.7.0", result.versionName);
    }
    @Test public void rejectsOtherReposAndSchemes() {
        for (String url : new String[]{"http://github.com/" + REPO + "/releases/download/a/b", "https://github.com/attacker/repo/releases/download/a/b", "https://github.com.evil.example/" + REPO + "/releases/download/a/b", "https://github.com/" + REPO + "/releases/download/../../evil"}) {
            assertFalse(url, ReleaseInfo.validAssetUrl(url, REPO));
        }
    }
    @Test public void rejectsBadDigestAndMismatchedTags() throws Exception {
        JSONObject meta = metadata().put("sha256", "bad");
        assertThrows(IllegalArgumentException.class, () -> ReleaseInfo.parse(release(), meta, REPO));
        JSONObject rel = release().put("tag_name", "android-v0.8.0");
        assertThrows(IllegalArgumentException.class, () -> ReleaseInfo.parse(rel, metadata(), REPO));
        JSONObject preview = release().put("prerelease", true);
        assertThrows(IllegalArgumentException.class, () -> ReleaseInfo.parse(preview, metadata(), REPO));
    }
}
