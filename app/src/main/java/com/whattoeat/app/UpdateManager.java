package com.whattoeat.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * 热更新管理器：
 * 1. 从 GitHub 仓库（含多个国内可用镜像）拉取 version.json
 * 2. 版本号比本地新就把 www/ 目录下的网页文件下载到手机
 * 3. 顺带检查 GitHub Release 里有没有更新的 APK，有就在 App 内提示下载
 */
public class UpdateManager {

    /** 默认更新源，格式 "用户名/仓库名"。已经写死，用户不需要自己填。 */
    public static final String DEFAULT_SOURCE = "iqiahs/what-to-eat";

    /** 内置网页版本号，必须和 assets/www/version.json 里的 web 一致 */
    public static final int BUILTIN_WEB_VERSION = 6;

    /** 默认分支名，仓库用 master 的话这里改成 "master"（App 也会自动尝试两个分支） */
    public static final String BRANCH = "main";

    private static final String PREFS = "cfg";
    private static final String KEY_SOURCE = "source";
    private static final String KEY_WEB_VERSION = "web_version";
    private static final String KEY_LAST_CHECK = "last_check";

    private static final String[] FILE_LIST = {"index.html", "app.css", "app.js"};
    private static final int MAX_FILE_BYTES = 3 * 1024 * 1024;

    public interface Listener {
        void onStatus(String json);
    }

    private final Context ctx;
    private final WebStore store;
    private final SharedPreferences prefs;
    private final Handler main = new Handler(Looper.getMainLooper());

    private Listener listener;
    private volatile boolean running = false;
    private volatile boolean manualCheck = false;
    private volatile String statusJson = "{\"state\":\"init\"}";
    /** version.json 里如果自定义了 APK 下载地址就用它，否则用 GitHub Release 的固定地址 */
    private volatile String remoteApkUrl = "";

    public UpdateManager(Context ctx, WebStore store) {
        this.ctx = ctx.getApplicationContext();
        this.store = store;
        this.prefs = this.ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public void setListener(Listener l) {
        this.listener = l;
    }

    public String source() {
        String s = prefs.getString(KEY_SOURCE, DEFAULT_SOURCE);
        return s == null ? "" : s.trim();
    }

    public void setSource(String raw) {
        String s = raw == null ? "" : raw.trim();
        // 容忍用户直接粘贴完整网址
        s = s.replace("https://github.com/", "")
             .replace("http://github.com/", "")
             .replace("https://raw.githubusercontent.com/", "")
             .replace("https://cdn.jsdelivr.net/gh/", "");
        if (s.endsWith("/")) s = s.substring(0, s.length() - 1);
        if (s.endsWith(".git")) s = s.substring(0, s.length() - 4);
        prefs.edit().putString(KEY_SOURCE, s).apply();
        pushStatus(buildStatus("idle", "更新源已保存：" + s, 0, 0));
    }

    public int localWebVersion() {
        if (!store.hasUpdate()) return BUILTIN_WEB_VERSION;
        return prefs.getInt(KEY_WEB_VERSION, BUILTIN_WEB_VERSION);
    }

    public void resetWebVersion() {
        prefs.edit().putInt(KEY_WEB_VERSION, BUILTIN_WEB_VERSION).apply();
    }

    public String statusJson() {
        return statusJson;
    }

    public void check(final boolean manual) {
        if (running) {
            if (manual) toast("正在检查中，请稍候");
            return;
        }
        running = true;
        // 记下来这次是用户手动点检查、还是启动时的静默检查。
        // 静默检查不能弹提示，否则每次开 App 都会蹦一句"已经是最新版"，很烦
        manualCheck = manual;
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    doCheck(manual);
                } catch (Throwable t) {
                    pushStatus(buildStatus("error", "检查失败：" + t.getMessage(), 0, 0));
                } finally {
                    running = false;
                }
            }
        }, "update-check").start();
    }

    /**
     * 逐个数源测一遍，把结果原样告诉网页层。
     * 目的是让"热更新不生效"变成能自己看懂的诊断，而不是干等。
     */
    public void diagnose() {
        if (running) {
            toast("正在检查中，请稍候");
            return;
        }
        running = true;
        new Thread(new Runnable() {
            @Override
            public void run() {
                StringBuilder sb = new StringBuilder();
                try {
                    final String src = source();
                    if (TextUtils.isEmpty(src)) {
                        pushStatus(buildStatus("diag",
                                "还没填更新源。\n请先在上面填 用户名/仓库名，保存后再测。", 0, 0));
                        return;
                    }
                    final String[] names = {"官方 raw.githubusercontent", "镜像 gh-proxy.com", "镜像 ghproxy.net"};
                    final String[] bases = baseUrls(src, BRANCH);

                    sb.append("更新源：").append(src).append('\n');
                    sb.append("分支：").append(BRANCH).append("\n\n");

                    int best = -1;
                    for (int i = 0; i < bases.length; i++) {
                        String label = i < names.length ? names[i] : bases[i];
                        long t0 = System.currentTimeMillis();
                        String text = fetchText(bases[i] + "version.json?t=" + System.currentTimeMillis());
                        long ms = System.currentTimeMillis() - t0;
                        sb.append(text == null ? "✗ " : "✓ ").append(label).append("   ");
                        if (text == null) {
                            sb.append("连不上或超时 (").append(ms).append("ms)\n");
                        } else {
                            int v = -1;
                            try {
                                v = new JSONObject(text).optInt("web", -1);
                            } catch (Exception ignored) {
                            }
                            if (v < 0) {
                                sb.append("能连上，但根目录下读不到 version.json，或格式不对\n");
                            } else {
                                sb.append("正常，仓库版本 v").append(v)
                                  .append("  (").append(ms).append("ms)\n");
                                if (best < 0) best = v;
                            }
                        }
                    }

                    int local = localWebVersion();
                    sb.append("\n手机上当前网页版本：v").append(local).append('\n');
                    if (best < 0) {
                        sb.append("结论：三个源都不通。\n")
                          .append("· 先换个网络试试（比如切到手机流量）\n")
                          .append("· 再确认仓库是 Public、名字和分支名没写错");
                    } else if (best > local) {
                        sb.append("结论：仓库版本更新，点上面的「立即检查网页更新」就能升级。");
                    } else {
                        sb.append("结论：已是最新，不用更新。");
                    }
                } catch (Throwable t) {
                    sb.append("\n测试出错：").append(t.getMessage());
                } finally {
                    running = false;
                }
                pushStatus(buildStatus("diag", sb.toString(), 0, 0));
            }
        }, "diag").start();
    }

    private void doCheck(boolean manual) throws Exception {
        final String src = source();
        if (TextUtils.isEmpty(src)) {
            // 启动时的静默检查就安静地退出；只有用户主动点"检查更新"才提示
            if (manual) {
                pushStatus(buildStatus("no-source", "还没设置更新源", 0, 0));
            }
            return;
        }
        pushStatus(buildStatus("checking", "正在检查更新…", 0, 0));

        String[] branches = {BRANCH, BRANCH.equals("main") ? "master" : "main"};
        String base = null;
        JSONObject remote = null;

        outer:
        for (String branch : branches) {
            String[] bases = baseUrls(src, branch);
            for (String b : bases) {
                String text = fetchText(b + "version.json?t=" + System.currentTimeMillis());
                if (text == null) continue;
                try {
                    JSONObject o = new JSONObject(text);
                    remote = o;
                    base = b;
                    break outer;
                } catch (Exception ignored) {
                }
            }
        }

        if (remote == null) {
            pushStatus(buildStatus("error", "连不上更新源，检查网络或仓库名", 0, 0));
            return;
        }

        prefs.edit().putLong(KEY_LAST_CHECK, System.currentTimeMillis()).apply();

        int remoteWeb = remote.optInt("web", 0);
        int localWeb = localWebVersion();
        int apkCode = remote.optInt("apkVersionCode", 0);
        String apkUrl = remote.optString("apkUrl", "");
        if (TextUtils.isEmpty(apkUrl)) {
            apkUrl = "https://github.com/" + src + "/releases/download/apk-latest/chishenme.apk";
        }
        remoteApkUrl = apkUrl;

        if (remoteWeb > localWeb) {
            JSONArray files = remote.optJSONArray("files");
            if (files == null || files.length() == 0) {
                files = new JSONArray();
                for (String f : FILE_LIST) files.put(f);
            }
            File tmp = store.tmpDir();
            WebStore.deleteRecursive(tmp);
            if (!tmp.mkdirs() && !tmp.isDirectory()) {
                pushStatus(buildStatus("error", "无法创建更新目录", remoteWeb, apkCode));
                return;
            }
            JSONObject hashes = remote.optJSONObject("sha256");
            for (int i = 0; i < files.length(); i++) {
                String name = files.optString(i, "");
                // 只允许纯文件名，挡掉 ../ 和子目录，避免写出到别的目录
                if (TextUtils.isEmpty(name) || name.contains("..") || name.startsWith("/")
                        || name.contains("/") || name.contains("\\")) {
                    continue;
                }
                byte[] data = fetchBytes(base + name + "?t=" + System.currentTimeMillis());
                if (data == null || data.length == 0) {
                    WebStore.deleteRecursive(tmp);
                    pushStatus(buildStatus("error", "下载 " + name + " 失败", remoteWeb, apkCode));
                    return;
                }
                // version.json 里写了 sha256 就校验；没写就跳过（默认不强制，方便随时改内容）
                String expect = hashes == null ? "" : hashes.optString(name, "");
                if (!TextUtils.isEmpty(expect) && !expect.equalsIgnoreCase(sha256(data))) {
                    WebStore.deleteRecursive(tmp);
                    pushStatus(buildStatus("error", name + " 校验失败，已放弃本次更新", remoteWeb, apkCode));
                    return;
                }
                try (FileOutputStream out = new FileOutputStream(new File(tmp, name))) {
                    out.write(data);
                } catch (Exception e) {
                    WebStore.deleteRecursive(tmp);
                    pushStatus(buildStatus("error", "写入 " + name + " 失败", remoteWeb, apkCode));
                    return;
                }
            }
            if (!store.applyTmpAsWeb()) {
                pushStatus(buildStatus("error", "写入更新失败", remoteWeb, apkCode));
                return;
            }
            prefs.edit().putInt(KEY_WEB_VERSION, remoteWeb).apply();
            pushStatus(buildStatus("updated", "已更新到 v" + remoteWeb, remoteWeb, apkCode));
        } else {
            pushStatus(buildStatus("up-to-date", "已经是最新版", remoteWeb, apkCode));
        }
    }

    private String[] baseUrls(String src, String branch) {
        // 网页源文件在仓库里的位置（同时也是打包进 APK 的位置，一处修改两处生效）
        String p = "/app/src/main/assets/www/";
        // 顺序就是优先级。第一个是官方源，内容最可信（实测 0.2~10s，波动大）；
        // 第二个 gh-proxy.com 实测最快最稳（约 1s）；ghproxy.net 时好时坏，兜底。
        // 已实测失效、不要往回加的：cdn.jsdelivr.net（超时）、raw.gitmirror.com（域名没了）、
        // ghfast.top / gh.llkk.cc（超时）、raw.githack.com（域名没了）
        return new String[]{
                "https://raw.githubusercontent.com/" + src + "/" + branch + p,
                "https://gh-proxy.com/https://raw.githubusercontent.com/" + src + "/" + branch + p,
                "https://ghproxy.net/https://raw.githubusercontent.com/" + src + "/" + branch + p
        };
    }

    /** 计算 sha256，用于校验下载下来的网页文件有没有被篡改 */
    private static String sha256(byte[] data) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] d = md.digest(data);
            StringBuilder sb = new StringBuilder(d.length * 2);
            for (byte b : d) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private String buildStatus(String state, String message, int remoteWeb, int apkCode) {
        JSONObject o = new JSONObject();
        try {
            o.put("state", state);
            o.put("message", message);
            o.put("appVersion", BuildConfig.VERSION_NAME);
            o.put("appVersionCode", BuildConfig.VERSION_CODE);
            o.put("webVersion", localWebVersion());
            o.put("builtinWebVersion", BUILTIN_WEB_VERSION);
            o.put("source", source());
            o.put("remoteWebVersion", remoteWeb);
            String src = source();
            o.put("apkUrl", TextUtils.isEmpty(remoteApkUrl)
                    ? "https://github.com/" + src + "/releases/download/apk-latest/chishenme.apk"
                    : remoteApkUrl);
            o.put("apkVersionCode", apkCode);
            o.put("hasApkUpdate", apkCode > BuildConfig.VERSION_CODE);
            o.put("hasWebUpdate", remoteWeb > localWebVersion());
            o.put("lastCheck", prefs.getLong(KEY_LAST_CHECK, 0));
            o.put("manual", manualCheck);
        } catch (Exception ignored) {
        }
        return o.toString();
    }

    private void pushStatus(String json) {
        statusJson = json;
        final Listener l = listener;
        if (l != null) l.onStatus(json);
    }

    private void toast(final String msg) {
        main.post(new Runnable() {
            @Override
            public void run() {
                android.widget.Toast.makeText(ctx, msg, android.widget.Toast.LENGTH_SHORT).show();
            }
        });
    }

    private String fetchText(String url) {
        byte[] b = fetchBytes(url);
        if (b == null) return null;
        return new String(b, StandardCharsets.UTF_8);
    }

    private byte[] fetchBytes(String url) {
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(url).openConnection();
            // 超时调短一点：第一个源不通时能尽快轮到下一个镜像
            conn.setConnectTimeout(6000);
            conn.setReadTimeout(12000);
            conn.setInstanceFollowRedirects(true);
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 13) ChishenmeApp");
            conn.setRequestProperty("Accept", "*/*");
            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) return null;
            try (InputStream in = conn.getInputStream()) {
                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int n;
                int total = 0;
                while ((n = in.read(buf)) > 0) {
                    total += n;
                    if (total > MAX_FILE_BYTES) return null;
                    bos.write(buf, 0, n);
                }
                return bos.toByteArray();
            }
        } catch (Throwable t) {
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }
}
