package io.github.chapterlight.reader;

import org.json.JSONArray;
import org.json.JSONObject;
import java.net.URI;

final class ReleaseInfo {
    final int versionCode;
    final String versionName, apkUrl, sha256, releaseUrl;
    private ReleaseInfo(int code, String name, String apk, String sha, String page) {
        versionCode = code; versionName = name; apkUrl = apk; sha256 = sha; releaseUrl = page;
    }
    static boolean validAssetUrl(String raw, String repository) {
        try {
            URI uri = URI.create(raw);
            return "https".equals(uri.getScheme()) && "github.com".equals(uri.getHost())
                    && uri.getPort() == -1 && uri.getUserInfo() == null && uri.getQuery() == null
                    && uri.getFragment() == null && !raw.contains("..") && !raw.contains("%")
                    && uri.getPath().startsWith("/" + repository + "/releases/download/");
        } catch (RuntimeException e) { return false; }
    }
    static String findAsset(JSONObject release, String name, String repository) throws Exception {
        JSONArray assets = release.getJSONArray("assets");
        for (int i = 0; i < assets.length(); i++) {
            JSONObject asset = assets.getJSONObject(i);
            String url = asset.getString("browser_download_url");
            if (name.equals(asset.getString("name")) && validAssetUrl(url, repository)) return url;
        }
        throw new IllegalArgumentException("发布中没有找到 " + name);
    }
    static ReleaseInfo parse(JSONObject release, JSONObject metadata, String repository) throws Exception {
        if (release.optBoolean("draft") || release.optBoolean("prerelease")) throw new IllegalArgumentException("不是正式发布版本");
        int code = metadata.getInt("versionCode");
        String name = metadata.getString("versionName");
        String sha = metadata.getString("sha256");
        String apkName = metadata.getString("apk");
        if (code <= 0 || !name.matches("[0-9]+\\.[0-9]+\\.[0-9]+")
                || !sha.matches("[0-9a-f]{64}") || !"Chapterlight.apk".equals(apkName)
                || !("android-v" + name).equals(release.getString("tag_name"))) {
            throw new IllegalArgumentException("发布信息无效");
        }
        String apk = findAsset(release, apkName, repository);
        String tag = "android-v" + name;
        if (!URI.create(apk).getPath().equals("/" + repository + "/releases/download/" + tag + "/" + apkName)) {
            throw new IllegalArgumentException("安装包与版本不匹配");
        }
        return new ReleaseInfo(code, name, apk, sha, "https://github.com/" + repository + "/releases/tag/" + tag);
    }
}
