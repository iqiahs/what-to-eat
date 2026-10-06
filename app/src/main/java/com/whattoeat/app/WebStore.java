package com.whattoeat.app;

import android.content.Context;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * 网页资源仓库：负责“内置版本(assets/www)”和“热更新版本(filesDir/web)”的读写与切换。
 * 网页本体永远不联网，联网的事情全部交给原生层，因此不存在跨域/权限问题。
 */
public class WebStore {

    public static final String WEB_DIR = "web";
    public static final String TMP_DIR = "web_tmp";
    public static final String CUSTOM_FILE = "custom_dishes.json";
    public static final String ASSET_ROOT = "www";

    private final Context ctx;

    public WebStore(Context ctx) {
        this.ctx = ctx.getApplicationContext();
    }

    public File webDir() {
        return new File(ctx.getFilesDir(), WEB_DIR);
    }

    public File tmpDir() {
        return new File(ctx.getFilesDir(), TMP_DIR);
    }

    public File file(String name) {
        return new File(webDir(), name);
    }

    public File customFile() {
        return new File(ctx.getFilesDir(), CUSTOM_FILE);
    }

    /** 是否已经下载过网页热更新 */
    public boolean hasUpdate() {
        File f = file("index.html");
        return f.isFile() && f.length() > 200;
    }

    /** 当前应该加载的入口地址 */
    public String indexUrl() {
        if (hasUpdate()) {
            return "file://" + file("index.html").getAbsolutePath();
        }
        return "file:///android_asset/" + ASSET_ROOT + "/index.html";
    }

    /** 丢弃热更新，回到内置版本 */
    public void clearUpdate() {
        deleteRecursive(webDir());
        deleteRecursive(tmpDir());
    }

    /** 从当前生效的目录读取文本文件（先热更新目录，再内置资源） */
    public String readText(String name) {
        if (hasUpdate()) {
            File f = file(name);
            if (f.isFile()) {
                try (InputStream in = new FileInputStream(f)) {
                    return new String(readAll(in), StandardCharsets.UTF_8);
                } catch (Exception ignored) {
                }
            }
        }
        try (InputStream in = ctx.getAssets().open(ASSET_ROOT + "/" + name)) {
            return new String(readAll(in), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }

    public String readCustom() {
        File f = customFile();
        if (!f.isFile()) return "[]";
        try (InputStream in = new FileInputStream(f)) {
            return new String(readAll(in), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "[]";
        }
    }

    public boolean writeCustom(String json) {
        try {
            File f = customFile();
            try (FileOutputStream out = new FileOutputStream(f)) {
                out.write(json.getBytes(StandardCharsets.UTF_8));
                out.flush();
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** 原子替换：先把全部文件下到 web_tmp，全部成功后再整体换上去 */
    public boolean applyTmpAsWeb() {
        File tmp = tmpDir();
        File dst = webDir();
        if (!tmp.isDirectory()) return false;
        deleteRecursive(dst);
        if (tmp.renameTo(dst)) return true;
        // 少数机型 rename 会失败，退化为逐个拷贝
        if (!dst.mkdirs() && !dst.isDirectory()) return false;
        File[] files = tmp.listFiles();
        if (files == null) return false;
        boolean ok = true;
        for (File f : files) {
            if (!f.isFile()) continue;
            try {
                try (InputStream in = new FileInputStream(f);
                     FileOutputStream out = new FileOutputStream(new File(dst, f.getName()))) {
                    byte[] buf = new byte[8192];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                }
            } catch (Exception e) {
                ok = false;
            }
        }
        deleteRecursive(tmp);
        return ok;
    }

    public static byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) bos.write(buf, 0, n);
        return bos.toByteArray();
    }

    public static void deleteRecursive(File f) {
        if (f == null || !f.exists()) return;
        if (f.isDirectory()) {
            File[] children = f.listFiles();
            if (children != null) {
                for (File c : children) deleteRecursive(c);
            }
        }
        //noinspection ResultOfMethodCallIgnored
        f.delete();
    }
}
