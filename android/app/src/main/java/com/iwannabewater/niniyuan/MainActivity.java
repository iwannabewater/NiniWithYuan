package com.iwannabewater.niniyuan;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.webkit.ConsoleMessage;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private static final String TAG = "NiniYuan";
    private WebView webView;
    private TextView loadingView;
    private TextView tipView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        enterImmersiveMode();

        FrameLayout root = new FrameLayout(this);
        webView = new WebView(this);
        webView.setAlpha(0f);
        webView.setBackgroundColor(0xff10182a);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(false);
        }
        webView.setWebViewClient(new GameWebViewClient());
        webView.setWebChromeClient(new GameChromeClient());

        loadingView = new TextView(this);
        loadingView.setText("Nini & Yuan\n正在启动...");
        loadingView.setTextColor(Color.WHITE);
        loadingView.setTextSize(18);
        loadingView.setGravity(Gravity.CENTER);
        loadingView.setLineSpacing(7, 1.0f);
        loadingView.setBackgroundColor(0xff10182a);

        tipView = new TextView(this);
        tipView.setText("Yuan loves Nini❤");
        tipView.setTextColor(0xffffd36d);
        tipView.setTextSize(12);
        tipView.setGravity(Gravity.START);
        tipView.setPadding(18, 16, 18, 10);
        tipView.setAlpha(0.92f);

        root.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));
        root.addView(loadingView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));
        FrameLayout.LayoutParams tipLayout = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.TOP | Gravity.START
        );
        root.addView(tipView, tipLayout);
        setContentView(root);
        Log.i(TAG, "Loading file:///android_asset/index.html");
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        enterImmersiveMode();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enterImmersiveMode();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (!handleBack()) {
            super.onBackPressed();
        }
    }

    private boolean handleBack() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return false;
    }

    @SuppressWarnings("deprecation")
    private void enterImmersiveMode() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }

    private class GameWebViewClient extends WebViewClient {
        @Override
        public void onPageFinished(WebView view, String url) {
            Log.i(TAG, "Page loaded: " + url);
            hideSplash();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            Log.e(TAG, "WebView error: " + error.getDescription());
            if (request.isForMainFrame()) {
                showLoadError("加载失败：" + error.getDescription());
            }
        }
    }

    private class GameChromeClient extends WebChromeClient {
        @Override
        public boolean onConsoleMessage(ConsoleMessage message) {
            Log.d(TAG, message.message() + " @" + message.sourceId() + ":" + message.lineNumber());
            return true;
        }
    }

    private void showLoadError(CharSequence message) {
        if (loadingView == null) return;
        loadingView.setText("Nini & Yuan\n" + message);
        loadingView.setVisibility(View.VISIBLE);
        loadingView.setAlpha(1f);
        if (tipView != null) tipView.setVisibility(View.VISIBLE);
        if (tipView != null) tipView.setAlpha(0.92f);
    }

    private void hideSplash() {
        if (webView != null) {
            webView.animate().alpha(1f).setDuration(180).start();
        }
        if (loadingView != null && loadingView.getVisibility() == View.VISIBLE) {
            loadingView.animate().alpha(0f).setDuration(180).withEndAction(() -> loadingView.setVisibility(View.GONE)).start();
        }
        if (tipView != null && tipView.getVisibility() == View.VISIBLE) {
            tipView.animate().alpha(0f).setDuration(160).withEndAction(() -> tipView.setVisibility(View.GONE)).start();
        }
    }
}
