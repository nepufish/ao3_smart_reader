package io.github.chapterlight.reader;

import android.app.AlertDialog;
import android.app.ProgressDialog;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class UpdateManager {
    private final MainActivity activity;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private boolean busy;
    private File pendingInstall;
    private ProgressDialog progress;
    private volatile boolean closed;

    UpdateManager(MainActivity owner) { activity = owner; }
    void check() {
        if (busy) return;
        if (!BuildConfig.RELEASE_REPOSITORY.matches("[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")) {
            message("此构建尚未配置更新仓库。"); return;
        }
        busy = true;
        progress = ProgressDialog.show(activity, "检查更新", "正在连接 GitHub…", true, false);
        worker.execute(() -> {
            try {
                String api = "https://api.github.com/repos/" + BuildConfig.RELEASE_REPOSITORY + "/releases/latest";
                JSONObject release = new JSONObject(readText(api));
                String metadataUrl = ReleaseInfo.findAsset(release, "update.json", BuildConfig.RELEASE_REPOSITORY);
                ReleaseInfo update = ReleaseInfo.parse(release, new JSONObject(readText(metadataUrl)), BuildConfig.RELEASE_REPOSITORY);
                ui(() -> {
                    finishProgress();
                    if (update.versionCode <= BuildConfig.VERSION_CODE) message("已是最新版本：" + BuildConfig.VERSION_NAME);
                    else new AlertDialog.Builder(activity).setTitle("发现新版本 " + update.versionName)
                            .setMessage("当前版本：" + BuildConfig.VERSION_NAME + "\n\n从 GitHub 下载并安装更新。书签和阅读记录会保留。")
                            .setPositiveButton("下载更新", (dialog, which) -> download(update))
                            .setNeutralButton("发布说明", (dialog, which) -> activity.openExternal(update.releaseUrl))
                            .setNegativeButton("稍后", null).show();
                });
            } catch (Exception e) { fail("无法检查更新。请检查网络，或稍后重试。\n" + e.getMessage()); }
        });
    }
    private void download(ReleaseInfo release) {
        if (busy) return;
        busy = true;
        progress = ProgressDialog.show(activity, "下载更新", "正在下载并验证安装包…", true, false);
        worker.execute(() -> {
            File directory = new File(activity.getCacheDir(), "updates");
            File apk = new File(directory, "Chapterlight.apk");
            File partial = new File(directory, "Chapterlight.download");
            try {
                if (!directory.isDirectory() && !directory.mkdirs()) throw new IOException("无法创建下载目录");
                HttpURLConnection connection = connect(release.apkUrl);
                try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(partial)) {
                    byte[] buffer = new byte[32768]; long total = 0; int size;
                    while ((size = input.read(buffer)) != -1) {
                        if (closed || Thread.currentThread().isInterrupted()) throw new IOException("下载已取消");
                        total += size;
                        if (total > 100L * 1024 * 1024) throw new IOException("安装包超过大小限制");
                        output.write(buffer, 0, size);
                    }
                } finally { connection.disconnect(); }
                if (!sha256(partial).equals(release.sha256)) throw new IOException("安装包校验失败，请重新下载");
                validatePackage(partial, release.versionCode);
                if (apk.exists() && !apk.delete()) throw new IOException("无法替换旧安装包");
                if (!partial.renameTo(apk)) throw new IOException("无法保存安装包");
                ui(() -> { finishProgress(); pendingInstall = apk; offerInstall(); });
            } catch (Exception e) {
                if (partial.exists()) partial.delete();
                fail("更新下载失败。\n" + e.getMessage());
            }
        });
    }
    @SuppressWarnings("deprecation")
    private void validatePackage(File file, int expectedVersion) throws Exception {
        PackageManager manager = activity.getPackageManager();
        int flags = Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
        PackageInfo installed = manager.getPackageInfo(activity.getPackageName(), flags);
        PackageInfo downloaded = manager.getPackageArchiveInfo(file.getAbsolutePath(), flags);
        if (downloaded == null || !activity.getPackageName().equals(downloaded.packageName)
                || (Build.VERSION.SDK_INT >= 28 ? downloaded.getLongVersionCode() : downloaded.versionCode) != expectedVersion) {
            throw new IOException("安装包身份或版本不匹配");
        }
        android.content.pm.Signature[] a = Build.VERSION.SDK_INT >= 28 ? installed.signingInfo.getApkContentsSigners() : installed.signatures;
        android.content.pm.Signature[] b = Build.VERSION.SDK_INT >= 28 ? downloaded.signingInfo.getApkContentsSigners() : downloaded.signatures;
        if (a == null || b == null || a.length == 0 || !Arrays.equals(a, b)) throw new IOException("更新签名与当前应用不一致");
    }
    private void offerInstall() {
        if (pendingInstall == null) return;
        if (!activity.getPackageManager().canRequestPackageInstalls()) {
            new AlertDialog.Builder(activity).setTitle("允许安装更新")
                    .setMessage("请在系统设置中允许章灯安装应用，然后返回继续安装。")
                    .setPositiveButton("打开设置", (dialog, which) -> {
                        try { activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + activity.getPackageName()))); }
                        catch (android.content.ActivityNotFoundException e) { message("请在系统设置中允许章灯安装未知来源应用。"); }
                    }).setNegativeButton("取消", (dialog, which) -> pendingInstall = null).show();
            return;
        }
        File file = pendingInstall; pendingInstall = null;
        Uri uri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".updates", file);
        Intent intent = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try { activity.startActivity(intent); }
        catch (android.content.ActivityNotFoundException e) { message("此设备没有可用的安装程序。"); }
    }
    void resumeInstall() {
        if (pendingInstall != null && activity.getPackageManager().canRequestPackageInstalls()) offerInstall();
    }
    private static HttpURLConnection connect(String raw) throws IOException {
        URL url = new URL(raw);
        for (int redirects = 0; redirects < 6; redirects++) {
            if (!"https".equals(url.getProtocol())) throw new IOException("拒绝不安全的下载地址");
            String host = url.getHost();
            if (!host.equals("api.github.com") && !host.equals("github.com") && !host.equals("release-assets.githubusercontent.com")
                    && !host.equals("objects.githubusercontent.com")) throw new IOException("下载跳转到了非 GitHub 地址");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(15000); connection.setReadTimeout(30000);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("User-Agent", "Chapterlight/" + BuildConfig.VERSION_NAME);
            if (host.equals("api.github.com")) connection.setRequestProperty("Accept", "application/vnd.github+json");
            int status = connection.getResponseCode();
            if (status == 200) return connection;
            String location = connection.getHeaderField("Location");
            connection.disconnect();
            if ((status == 301 || status == 302 || status == 303 || status == 307 || status == 308) && location != null) {
                url = new URL(url, location); continue;
            }
            throw new IOException(status == 404 ? "尚无可用的正式 Android 发布" : "GitHub HTTP " + status);
        }
        throw new IOException("下载跳转次数过多");
    }
    private static String readText(String url) throws IOException {
        HttpURLConnection connection = connect(url);
        try (InputStream input = connection.getInputStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192]; int count;
            while ((count = input.read(buffer)) != -1) {
                if (output.size() + count > 1024 * 1024) throw new IOException("更新信息过大");
                output.write(buffer, 0, count);
            }
            return output.toString("UTF-8");
        } finally { connection.disconnect(); }
    }
    private static String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[32768]; int count;
            while ((count = input.read(buffer)) != -1) digest.update(buffer, 0, count);
        }
        StringBuilder hex = new StringBuilder();
        for (byte value : digest.digest()) hex.append(String.format(java.util.Locale.ROOT, "%02x", value & 255));
        return hex.toString();
    }
    private void ui(Runnable action) { activity.runOnUiThread(() -> { if (!closed && !activity.isFinishing() && !activity.isDestroyed()) action.run(); }); }
    private void finishProgress() { if (progress != null) { progress.dismiss(); progress = null; } busy = false; }
    private void message(String message) { Toast.makeText(activity, message, Toast.LENGTH_LONG).show(); }
    private void fail(String message) {
        ui(() -> {
            finishProgress();
            new AlertDialog.Builder(activity).setTitle("更新").setMessage(message + "\n\n也可以在浏览器中查看发布页；若需要，请先登录 GitHub，再下载安装包。")
                    .setPositiveButton("打开发布页", (dialog, which) -> activity.openExternal("https://github.com/" + BuildConfig.RELEASE_REPOSITORY + "/releases/latest"))
                    .setNegativeButton("关闭", null).show();
        });
    }
    void close() { closed = true; worker.shutdownNow(); finishProgress(); }
}
