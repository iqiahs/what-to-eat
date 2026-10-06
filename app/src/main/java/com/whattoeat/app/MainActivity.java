package com.whattoeat.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

/**
 * 唯一界面：一个全屏 WebView。
 * 界面和菜谱逻辑全部在 assets/www 下的网页里，可通过 GitHub 热更新替换，不需要重新安装 APK。
 */
public class MainActivity extends Activity {

    private WebView webView;
    private WebStore store;
    private UpdateManager updater;
    private SharedPreferences uiPrefs;
    private volatile boolean backHandled = false;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        store = new WebStore(this);
        // 网页层的偏好（配色等）也存这里，网页存储被清掉也不会丢
        uiPrefs = getSharedPreferences("ui", MODE_PRIVATE);
        updater = new UpdateManager(this, store);
        updater.setListener(new UpdateManager.Listener() {
            @Override
            public void onStatus(final String json) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        if (webView == null) return;
                        pushStatus(json);
                        if ("updated".equals(stateOf(json))) {
                            webView.clearCache(true);
                            webView.loadUrl(store.indexUrl());
                        }
                    }
                });
            }
        });

        webView = new WebView(this);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);
        s.setMediaPlaybackRequiresUserGesture(true);
        // 深色主题配深色底，其余配清新浅色底，避免网页加载瞬间闪一下别的颜色
        boolean dark = "night".equals(uiPrefs.getString("theme", "mint"));
        webView.setBackgroundColor(dark ? 0xFF12100E : 0xFFF1FAF6);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                String scheme = u.getScheme() == null ? "" : u.getScheme().toLowerCase(java.util.Locale.ROOT);
                if ("http".equals(scheme) || "https".equals(scheme)
                        || "mailto".equals(scheme) || "tel".equals(scheme) || "market".equals(scheme)) {
                    openExternal(u);
                    return true;
                }
                return false;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                // 热更新内容坏掉时，自动退回内置版本，保证 App 永远能打开。
                // 只对 file:// 主文档失败才回退，避免 mailto:/tel: 之类的链接误触发回退
                String failed = request.getUrl() == null ? "" : request.getUrl().toString();
                if (request.isForMainFrame() && failed.startsWith("file:") && store.hasUpdate()) {
                    store.clearUpdate();
                    updater.resetWebVersion();
                    Toast.makeText(MainActivity.this, "更新内容加载失败，已恢复内置版本", Toast.LENGTH_LONG).show();
                    view.loadUrl(store.indexUrl());
                }
            }
        });
        webView.addJavascriptInterface(new Bridge(), "Native");

        setContentView(webView);
        applyEdgeToEdge(webView);
        if (Build.VERSION.SDK_INT >= 33) {
            registerBackCallback();
        }
        webView.loadUrl(store.indexUrl());

        // 启动后后台静默检查一次热更新（不阻塞界面）
        updater.check(false);
    }

    private static String stateOf(String json) {
        try {
            return new JSONObject(json).optString("state", "");
        } catch (Exception e) {
            return "";
        }
    }

    private void pushStatus(String json) {
        String js = "window.onNativeStatus&&window.onNativeStatus(" + JSONObject.quote(json) + ")";
        webView.evaluateJavascript(js, null);
    }

    private void openExternal(Uri uri) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, uri);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception e) {
            toastOnUi("没有可用的浏览器打开该链接");
        }
    }

    private void toastOnUi(final String msg) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show();
            }
        });
    }

    /** 网页调用原生能力的桥 */
    private class Bridge {

        @JavascriptInterface
        public String getInfo() {
            return updater.statusJson();
        }

        @JavascriptInterface
        public String getSource() {
            return updater.source();
        }

        @JavascriptInterface
        public void setSource(String s) {
            updater.setSource(s);
        }

        @JavascriptInterface
        public void checkUpdate() {
            updater.check(true);
        }

        @JavascriptInterface
        public void diagnose() {
            updater.diagnose();
        }

        @JavascriptInterface
        public String loadCustom() {
            return store.readCustom();
        }

        @JavascriptInterface
        public boolean saveCustom(String json) {
            return store.writeCustom(json);
        }

        /** 通用偏好读取（配色等），空字符串表示没存过 */
        @JavascriptInterface
        public String getSetting(String key) {
            if (key == null || key.length() > 64) return "";
            return uiPrefs.getString(key, "");
        }

        @JavascriptInterface
        public boolean setSetting(String key, String value) {
            if (key == null || key.length() > 64) return false;
            uiPrefs.edit().putString(key, value == null ? "" : value).apply();
            return true;
        }

        @JavascriptInterface
        public void resetWeb() {
            store.clearUpdate();
            updater.resetWebVersion();
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (webView == null) return;
                    webView.clearCache(true);
                    webView.loadUrl(store.indexUrl());
                    if (!isFinishing()) {
                        Toast.makeText(MainActivity.this, "已恢复为内置版本", Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public void openUrl(String url) {
            if (url == null) return;
            final Uri u = Uri.parse(url.trim());
            String scheme = u.getScheme() == null ? "" : u.getScheme();
            if (!"http".equals(scheme) && !"https".equals(scheme)) return;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    openExternal(u);
                }
            });
        }

        @JavascriptInterface
        public void setBackHandled(boolean handled) {
            backHandled = handled;
        }

        @JavascriptInterface
        public void toast(String msg) {
            toastOnUi(msg);
        }
    }

    private void applyEdgeToEdge(final View root) {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                int[] p = insetsOf(insets);
                v.setPadding(p[0], p[1], p[2], p[3]);
                return insets;
            }
        });
        root.requestApplyInsets();
    }

    private static int[] insetsOf(WindowInsets insets) {
        if (Build.VERSION.SDK_INT >= 30) return insetsApi30(insets);
        return new int[]{
                insets.getSystemWindowInsetLeft(),
                insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(),
                insets.getSystemWindowInsetBottom()
        };
    }

    @android.annotation.TargetApi(30)
    private static int[] insetsApi30(WindowInsets insets) {
        // 必须带上 ime()：全面屏时代窗口不再自动避让键盘，否则输入框会被键盘挡住
        Insets b = insets.getInsets(WindowInsets.Type.systemBars()
                | WindowInsets.Type.displayCutout()
                | WindowInsets.Type.ime());
        return new int[]{b.left, b.top, b.right, b.bottom};
    }

    /** 返回键统一入口：有弹层就关弹层，否则退出 */
    private void handleBack() {
        if (backHandled && webView != null) {
            webView.evaluateJavascript("window.closeTopSheet&&window.closeTopSheet()", null);
        } else {
            finish();
        }
    }

    @android.annotation.TargetApi(33)
    private void registerBackCallback() {
        getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
    }

    @Override
    public void onBackPressed() {
        // Android 13 以下走这里；13 及以上由 registerBackCallback 接管
        handleBack();
    }

    @Override
    protected void onDestroy() {
        if (updater != null) {
            updater.setListener(null);
        }
        if (webView != null) {
            webView.removeJavascriptInterface("Native");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
