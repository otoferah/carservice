package com.ferahotomotiv.servis

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.*
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Button
import android.view.Gravity
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var progress: ProgressBar
    private lateinit var root: FrameLayout
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private val appHost = "feat-google-drive-oauth-ferah-otomotiv-servis.otoferah.workers.dev"
    private val appUrl = "https://$appHost/"
    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setBackgroundDrawableResource(R.drawable.splash_background)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        enterImmersiveMode()

        root = FrameLayout(this).apply { setBackgroundColor(Color.rgb(8,9,11)) }
        webView = WebView(this)
        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            isIndeterminate = false
            max = 100
            progressTintList = android.content.res.ColorStateList.valueOf(Color.rgb(217,169,40))
            progressBackgroundTintList = android.content.res.ColorStateList.valueOf(Color.DKGRAY)
        }
        root.addView(webView, FrameLayout.LayoutParams(-1,-1))
        root.addView(progress, FrameLayout.LayoutParams(-1, 4, Gravity.TOP))
        setContentView(root)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadsImagesAutomatically = true
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            allowFileAccess = false
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            userAgentString = userAgentString + " FerahOtomotivAndroid/1.0"
        }
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return false
                if (uri.scheme == "https" && (uri.host == appHost || uri.host?.endsWith(".supabase.co") == true || uri.host == "accounts.google.com" || uri.host?.endsWith(".googleapis.com") == true || uri.host?.endsWith(".google.com") == true)) return false
                if (uri.scheme == "https") {
                    startActivity(Intent(Intent.ACTION_VIEW, uri))
                    return true
                }
                return true
            }
            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                progress.visibility = View.VISIBLE
            }
            override fun onPageFinished(view: WebView?, url: String?) {
                progress.visibility = View.GONE
                CookieManager.getInstance().flush()
            }
            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                if (request?.isForMainFrame == true) showOffline()
            }
            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: android.net.http.SslError?) {
                handler?.cancel()
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progress.progress = newProgress
                progress.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
            }
            override fun onShowFileChooser(
                webView: WebView?,
                callback: ValueCallback<Array<Uri>>?,
                params: FileChooserParams?
            ): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                return try {
                    val intent = params?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                        type = "*/*"
                        addCategory(Intent.CATEGORY_OPENABLE)
                    }
                    startActivityForResult(intent, FILE_PICKER_REQUEST)
                    true
                } catch (_: Exception) {
                    fileCallback?.onReceiveValue(null)
                    fileCallback = null
                    false
                }
            }
            override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                if (customView != null) { callback?.onCustomViewHidden(); return }
                customView = view
                customViewCallback = callback
                root.addView(view, FrameLayout.LayoutParams(-1,-1))
                webView.visibility = View.GONE
                progress.visibility = View.GONE
                window.setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN)
            }
            override fun onHideCustomView() {
                customView?.let { root.removeView(it) }
                customView = null
                customViewCallback?.onCustomViewHidden()
                customViewCallback = null
                webView.visibility = View.VISIBLE
                enterImmersiveMode()
            }
        }

        if (savedInstanceState != null) webView.restoreState(savedInstanceState) else webView.loadUrl(appUrl)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (customView != null) { webView.webChromeClient?.onHideCustomView(); return }
                if (webView.canGoBack()) webView.goBack() else {
                    webView.loadUrl(appUrl)
                }
            }
        })
    }

    private fun showOffline() {
        val html = """<html><body style='margin:0;background:#08090b;color:#f3d17b;font-family:Arial;display:grid;place-items:center;height:100vh;text-align:center'><div><div style='font-size:54px;font-weight:900'>F</div><h2>Bağlantı kurulamadı</h2><p style='color:#aaa'>İnternet bağlantını kontrol edip tekrar dene.</p><button onclick='location.reload()' style='background:#d9a928;color:#08090b;border:0;border-radius:12px;padding:14px 24px;font-weight:bold'>Tekrar dene</button></div></body></html>"""
        webView.loadDataWithBaseURL(appUrl, html, "text/html", "UTF-8", null)
    }

    private fun enterImmersiveMode() {
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            )
    }

    @Deprecated("Deprecated in Android")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_PICKER_REQUEST) {
            val result = if (resultCode == RESULT_OK && data != null) {
                val clip = data.clipData
                if (clip != null) Array(clip.itemCount) { i -> clip.getItemAt(i).uri }
                else data.data?.let { arrayOf(it) }
            } else null
            fileCallback?.onReceiveValue(result)
            fileCallback = null
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) enterImmersiveMode()
    }

    override fun onDestroy() {
        fileCallback?.onReceiveValue(null)
        webView.stopLoading()
        webView.destroy()
        super.onDestroy()
    }

    companion object { private const val FILE_PICKER_REQUEST = 2048 }
}
