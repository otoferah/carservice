package com.ferahotomotiv.servis

import android.annotation.SuppressLint
import android.app.Activity
import android.print.PrintAttributes
import android.print.PrintManager
import android.content.Intent

import android.content.ContentValues
import android.os.CancellationSignal
import android.os.Environment
import android.os.ParcelFileDescriptor
import android.graphics.pdf.PdfDocument
import android.provider.MediaStore
import android.widget.Toast
import android.util.Log
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.URLEncoder
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.SslErrorHandler
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var progress: ProgressBar
    private lateinit var root: FrameLayout
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null
    private var pdfWebView: WebView? = null
    private val pdfPrefs by lazy { getSharedPreferences("ferah_pdf", MODE_PRIVATE) }

    private val appHost = "ferah-otomotiv-servis.otoferah.workers.dev"
    private val appUrl = "https://$appHost/"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setBackgroundDrawableResource(R.drawable.splash_background)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        enterImmersiveMode()

        root = FrameLayout(this).apply { setBackgroundColor(Color.rgb(8, 9, 11)) }
        webView = WebView(this)
        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            isIndeterminate = false
            max = 100
            progressTintList = android.content.res.ColorStateList.valueOf(Color.rgb(217, 169, 40))
            progressBackgroundTintList = android.content.res.ColorStateList.valueOf(Color.DKGRAY)
        }
        root.addView(webView, FrameLayout.LayoutParams(-1, -1))
        root.addView(progress, FrameLayout.LayoutParams(-1, 4, Gravity.TOP))
        setContentView(root)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadsImagesAutomatically = true
            javaScriptCanOpenWindowsAutomatically = true
            setSupportMultipleWindows(false)
            allowFileAccess = false
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            userAgentString = userAgentString + " FerahOtomotivAndroid/1.0"
        }

        webView.addJavascriptInterface(AndroidPdfBridge(), "FerahAndroid")

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return false
                val host = uri.host.orEmpty()
                val trusted = uri.scheme == "https" && (
                    host == appHost ||
                    host == "accounts.google.com" ||
                    host == "google.com" ||
                    host.endsWith(".google.com") ||
                    host.endsWith(".googleapis.com") ||
                    host == "supabase.co" ||
                    host.endsWith(".supabase.co")
                )
                if (trusted) return false
                if (uri.scheme == "https") {
                    startActivity(Intent(Intent.ACTION_VIEW, uri))
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
                if (view == null || customView != null) {
                    callback?.onCustomViewHidden()
                    return
                }
                customView = view
                customViewCallback = callback
                root.addView(view, FrameLayout.LayoutParams(-1, -1))
                webView.visibility = View.GONE
                progress.visibility = View.GONE
                window.setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN)
                enterImmersiveMode()
            }

            override fun onHideCustomView() {
                hideCustomView()
            }
        }

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl(appUrl)
        }
    }

    private inner class AndroidPdfBridge {
        @JavascriptInterface
        fun printPdf(html: String, fileName: String) {
            runOnUiThread {
                pdfPrefs.edit().remove(KEY_LAST_PDF_ERROR).apply()
                if (html.isBlank() || html.length > 8_000_000) {
                    toast("PDF içeriği oluşturulamadı.")
                    return@runOnUiThread
                }
                showPdfPrintDialog(html, fileName)
            }
        }

        @JavascriptInterface
        fun savePdfAndOpenWhatsApp(phone: String, message: String, html: String, fileName: String) {
            runOnUiThread {
                if (html.isBlank() || html.length > 8_000_000) {
                    toast("PDF içeriği oluşturulamadı.")
                    return@runOnUiThread
                }
                createPdfFile(html, fileName) { uri ->
                    if (uri == null) toast("PDF kaydedilemedi. Tekrar deneyin.")
                    else {
                        pdfPrefs.edit().putString(KEY_LAST_PDF_URI, uri.toString()).apply()
                        toast("PDF İndirilenler/Ferah Otomotiv klasörüne kaydedildi. WhatsApp sohbeti açılıyor.")
                        openWhatsAppChatInternal(phone, message)
                    }
                }
            }
        }

        @JavascriptInterface
        fun shareLatestPdf(message: String) {
            runOnUiThread { shareSavedPdf(message) }
        }

        @JavascriptInterface
        fun openWhatsAppChat(phone: String, message: String) {
            runOnUiThread { openWhatsAppChatInternal(phone, message) }
        }
    }


    @SuppressLint("SetJavaScriptEnabled")
    private fun showPdfPrintDialog(html: String, fileName: String) {
        // Use Android's Chromium print pipeline, the same engine used by Chrome.
        // This opens the system print preview instead of silently writing a
        // manually sliced PDF into Downloads.
        pdfWebView?.let { finishPdfRenderer(it) }
        val renderer = WebView(this)
        pdfWebView = renderer
        renderer.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            loadsImagesAutomatically = true
            useWideViewPort = true
            loadWithOverviewMode = false
        }
        renderer.setBackgroundColor(Color.WHITE)
        renderer.visibility = View.INVISIBLE
        root.addView(renderer, FrameLayout.LayoutParams(-1, -1))

        var printStarted = false
        renderer.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                if (printStarted) return
                printStarted = true
                renderer.postDelayed({
                    try {
                        val jobName = fileName.removeSuffix(".pdf").removeSuffix(".PDF")
                            .ifBlank { "Ferah Otomotiv Teklif" }
                        val adapter = renderer.createPrintDocumentAdapter(jobName)
                        val attributes = PrintAttributes.Builder()
                            .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                            .setResolution(PrintAttributes.Resolution("ferah_pdf", "Ferah PDF", 300, 300))
                            .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                            .build()
                        val printManager = getSystemService(PRINT_SERVICE) as PrintManager
                        val job = printManager.print(jobName, adapter, attributes)
                        toast("PDF önizlemesi açıldı. Kaydetmek için PDF yazıcısını seçin; dosya adı: $jobName")
                        val handler = android.os.Handler(mainLooper)
                        val cleanup = object : Runnable {
                            override fun run() {
                                if (job.isCompleted || job.isCancelled || job.isFailed) {
                                    finishPdfRenderer(renderer)
                                } else {
                                    handler.postDelayed(this, 1000)
                                }
                            }
                        }
                        handler.postDelayed(cleanup, 1000)
                    } catch (error: Exception) {
                        Log.e("FerahPdf", "Android yazdırma önizlemesi açılamadı", error)
                        pdfPrefs.edit().putString(KEY_LAST_PDF_ERROR, error.message ?: error.javaClass.simpleName).apply()
                        toast("PDF önizlemesi açılamadı: " + (error.message ?: "Bilinmeyen hata"))
                        finishPdfRenderer(renderer)
                    }
                }, 700)
            }
        }
        renderer.loadDataWithBaseURL(appUrl, html, "text/html", "UTF-8", null)
    }

    private fun createPdfFile(html: String, fileName: String, onComplete: (Uri?) -> Unit) {
        pdfWebView?.let { finishPdfRenderer(it) }
        val renderer = WebView(this)
        pdfWebView = renderer
        renderer.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            loadsImagesAutomatically = true
            useWideViewPort = true
            loadWithOverviewMode = false
        }
        renderer.setBackgroundColor(Color.WHITE)
        renderer.visibility = View.INVISIBLE
        root.addView(renderer, FrameLayout.LayoutParams(-1, -1))

        // Set the A4 viewport BEFORE WebView parses the document. Changing the
        // viewport after onPageFinished leaves Android WebView at its old wide layout.
        val a4Css = """
            <style id="ferah-native-a4-layout">
              @page { size: A4 portrait; margin: 7mm; }
              html, body {
                width: 210mm !important;
                min-width: 210mm !important;
                max-width: 210mm !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
                overflow: visible !important;
                background: #fff !important;
              }
              body { padding: 7mm !important; }
              .print-only-quote {
                /* A flex root prevents Android WebView from fragmenting the long quote table
                   correctly across A4 pages. Keep the document as a normal block flow. */
                display: block !important;
                flex-direction: initial !important;
                width: 196mm !important;
                min-width: 196mm !important;
                max-width: 196mm !important;
                height: auto !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
                overflow: visible !important;
                position: static !important;
              }
              .print-only-quote, .print-only-quote * {
                box-sizing: border-box !important;
              }
              .print-only-quote img, .print-only-quote svg, .print-only-quote canvas {
                max-width: 100% !important;
                height: auto !important;
              }
              .print-only-quote table {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                table-layout: fixed !important;
                border-collapse: collapse !important;
              }
              .print-only-quote th, .print-only-quote td {
                min-width: 0 !important;
                max-width: 100% !important;
                overflow-wrap: anywhere !important;
                word-break: break-word !important;
                white-space: normal !important;
              }
              .print-only-quote .quote-document-header {
                display: grid !important;
                /* Match the working browser/PDF layout: compact vehicle photo,
                   normal brand block, flexible title and date columns. */
                grid-template-columns: 39mm 25mm minmax(0,1fr) 23mm !important;
                gap: 2.5mm !important;
                align-items: center !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                overflow: hidden !important;
              }
              .print-only-quote .quote-vehicle-photo-card {
                display: flex !important;
                width: 39mm !important;
                height: 27mm !important;
                min-width: 0 !important;
                max-width: 39mm !important;
                overflow: hidden !important;
              }
              .print-only-quote .quote-vehicle-photo-card img {
                display: block !important;
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
              }
              .print-only-quote .quote-document-header > *,
              .print-only-quote .quote-brand-lockup,
              .print-only-quote .quote-document-title,
              .print-only-quote .quote-document-date {
                min-width: 0 !important;
                max-width: 100% !important;
                overflow: hidden !important;
              }
              .print-only-quote .quote-document-title h2 {
                font-size: 16pt !important;
                line-height: 1.05 !important;
                overflow-wrap: anywhere !important;
                white-space: normal !important;
              }
              .print-only-quote .quote-document-title p {
                font-size: 6pt !important;
                line-height: 1.15 !important;
                white-space: normal !important;
                overflow-wrap: anywhere !important;
              }
              .print-only-quote .quote-customer-grid {
                display: grid !important;
                grid-template-columns: repeat(3,minmax(0,1fr)) !important;
                gap: 2mm !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
              }
              .print-only-quote .quote-info-card {
                min-width: 0 !important;
                max-width: 100% !important;
                overflow: hidden !important;
                padding: 3mm !important;
              }
              .print-only-quote .quote-info-card b,
              .print-only-quote .quote-info-card span {
                min-width: 0 !important;
                max-width: 100% !important;
                white-space: normal !important;
                overflow-wrap: anywhere !important;
                word-break: break-word !important;
              }
              .print-only-quote .quote-table-heading,
              .print-only-quote .quote-total-panel,
              .print-only-quote .quote-bottom-row {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
              }
            </style>
        """.trimIndent()
        val viewport = """<meta name="viewport" content="width=794, initial-scale=1, maximum-scale=1">"""
        val viewportPattern = Regex("""<meta\\s+name=["']viewport["'][^>]*>""", RegexOption.IGNORE_CASE)
        var a4Html = if (viewportPattern.containsMatchIn(html)) {
            viewportPattern.replaceFirst(html, viewport)
        } else {
            html.replace("<head>", "<head>$viewport")
        }
        a4Html = if (a4Html.contains("</head>", ignoreCase = true)) {
            a4Html.replaceFirst(Regex("</head>", RegexOption.IGNORE_CASE), a4Css + "</head>")
        } else {
            a4Html.replace("<body", a4Css + "<body")
        }

        renderer.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                // Android evaluates the height expression synchronously after the WebView has settled.
                // it serializes the Promise as null. Wait natively, then return a plain number.
                val measureContent = """
                    (() => {
                      const quote = document.querySelector('.print-only-quote');
                      if (!quote) return 0;
                      return Math.ceil(Math.max(
                        quote.scrollHeight || 0,
                        quote.offsetHeight || 0,
                        quote.getBoundingClientRect().height || 0
                      ));
                    })()
                """.trimIndent()
                renderer.postDelayed({
                    renderer.evaluateJavascript(measureContent, ValueCallback { result ->
                        try {
                            val density = resources.displayMetrics.density
                            val cssHeight = result?.trim()?.trim('"')?.toFloatOrNull()
                                ?: throw IllegalStateException("Teklif sayfa yüksekliği ölçülemedi: WebView sayfa ölçüsü boş döndürdü.")
                            if (cssHeight <= 0f) throw IllegalStateException("Teklif sayfa yüksekliği geçersiz: $cssHeight")
                            val width = (794f * density).toInt().coerceAtLeast(1)
                            val measuredHeight = (cssHeight * density).toInt().coerceAtLeast(1)

                            renderer.measure(
                                View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY),
                                View.MeasureSpec.makeMeasureSpec(measuredHeight, View.MeasureSpec.EXACTLY)
                            )
                            renderer.layout(0, 0, width, measuredHeight)

                            val pageWidth = 595
                            val pageHeight = 842
                            // Browser PDF fits this quote onto one A4 sheet. Android WebView
                            // was adding a second page containing a duplicate overflow slice.
                            // Fit the complete quote to A4 and render it exactly once.
                            val scale = minOf(
                                pageWidth.toFloat() / width.toFloat(),
                                pageHeight.toFloat() / measuredHeight.toFloat()
                            )
                            val renderedWidth = width * scale
                            val renderedHeight = measuredHeight * scale
                            val offsetX = (pageWidth - renderedWidth) / 2f
                            val offsetY = (pageHeight - renderedHeight) / 2f
                            Log.d("FerahPdf", "A4 fit: cssHeight=" + cssHeight + ", measuredHeight=" + measuredHeight + ", scale=" + scale)
                            val document = PdfDocument()
                            try {
                                val pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, 1).create()
                                val page = document.startPage(pageInfo)
                                page.canvas.save()
                                page.canvas.translate(offsetX, offsetY)
                                page.canvas.scale(scale, scale)
                                renderer.draw(page.canvas)
                                page.canvas.restore()
                                document.finishPage(page)
                                val temp = File(cacheDir, "ferah-" + System.currentTimeMillis() + ".pdf")
                                FileOutputStream(temp).use { document.writeTo(it) }
                                val saved = persistPdf(temp, fileName)
                                temp.delete()
                                finishPdfRenderer(renderer)
                                onComplete(saved)
                            } finally {
                                document.close()
                            }
                        } catch (error: Exception) {
                            Log.e("FerahPdf", "PDF oluşturma başarısız", error)
                            pdfPrefs.edit().putString(KEY_LAST_PDF_ERROR, error.message ?: error.javaClass.simpleName).apply()
                            finishPdfRenderer(renderer)
                            onComplete(null)
                        }
                    })
                }, 700)
            }
        }

        renderer.loadDataWithBaseURL(appUrl, a4Html, "text/html", "UTF-8", null)
    }

    private fun finishPdfRenderer(renderer: WebView) {
        renderer.stopLoading()
        (renderer.parent as? android.view.ViewGroup)?.removeView(renderer)
        renderer.destroy()
        if (pdfWebView === renderer) pdfWebView = null
    }

    private fun persistPdf(source: File, requestedName: String): Uri {
        val safeName = requestedName.replace(Regex("[^A-Za-z0-9._-]"), "_").trim('_')
            .ifBlank { "Ferah-Otomotiv-Teklif" }.let { if (it.endsWith(".pdf", true)) it else it + ".pdf" }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, safeName)
                put(MediaStore.Downloads.MIME_TYPE, "application/pdf")
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Ferah Otomotiv")
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
            val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: throw IllegalStateException("Downloads kaydı oluşturulamadı")
            try {
                contentResolver.openOutputStream(uri)?.use { output ->
                    FileInputStream(source).use { input -> input.copyTo(output) }
                } ?: throw IllegalStateException("PDF dosyası yazılamadı")
                val done = ContentValues().apply { put(MediaStore.Downloads.IS_PENDING, 0) }
                contentResolver.update(uri, done, null, null)
                return uri
            } catch (error: Exception) {
                contentResolver.delete(uri, null, null)
                throw error
            }
        }
        val directory = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: cacheDir
        if (!directory.exists()) directory.mkdirs()
        val destination = File(directory, safeName)
        FileInputStream(source).use { input -> FileOutputStream(destination).use { output -> input.copyTo(output) } }
        return FileProvider.getUriForFile(this, packageName + ".fileprovider", destination)
    }


    private fun openWhatsAppChatInternal(phone: String, message: String) {
        val digits = phone.filter { it.isDigit() }
        val normalized = when {
            digits.startsWith("0") && digits.length == 11 -> "90" + digits.drop(1)
            digits.startsWith("90") && digits.length == 12 -> digits
            digits.length == 10 -> "90" + digits
            else -> ""
        }
        if (!normalized.matches(Regex("90[0-9]{10}"))) {
            toast("Müşteri telefon numarası geçerli değil.")
            return
        }
        val url = "https://wa.me/" + normalized + "?text=" + URLEncoder.encode(message, "UTF-8")
        try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
        catch (_: Exception) { toast("WhatsApp sohbeti açılamadı.") }
    }

    private fun shareSavedPdf(message: String) {
        val uri = pdfPrefs.getString(KEY_LAST_PDF_URI, null)?.let(Uri::parse)
        if (uri == null) { toast("Önce teklif PDF'sini kaydedin."); return }
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_TEXT, message)
            clipData = android.content.ClipData.newUri(contentResolver, "Ferah Otomotiv Teklif PDF", uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        try { startActivity(Intent.createChooser(send, "Teklif PDF'sini paylaş")) }
        catch (_: Exception) { toast("Paylaşım menüsü açılamadı.") }
    }

    private fun toast(message: String) = Toast.makeText(this, message, Toast.LENGTH_LONG).show()

    private fun hideCustomView() {
        customView?.let { root.removeView(it) }
        customView = null
        customViewCallback?.onCustomViewHidden()
        customViewCallback = null
        webView.visibility = View.VISIBLE
        enterImmersiveMode()
    }

    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        when {
            customView != null -> hideCustomView()
            webView.canGoBack() -> webView.goBack()
            else -> webView.loadUrl(appUrl)
        }
    }

    private fun showOffline() {
        val html = """<html><body style='margin:0;background:#08090b;color:#f3d17b;font-family:Arial;display:grid;place-items:center;height:100vh;text-align:center'><div><div style='font-size:54px;font-weight:900'>F</div><h2>Bağlantı kurulamadı</h2><p style='color:#aaa'>İnternet bağlantını kontrol edip tekrar dene.</p><button onclick='location.reload()' style='background:#d9a928;color:#08090b;border:0;border-radius:12px;padding:14px 24px;font-weight:bold'>Tekrar dene</button></div></body></html>"""
        webView.loadDataWithBaseURL(appUrl, html, "text/html", "UTF-8", null)
    }

    @Suppress("DEPRECATION")
    private fun enterImmersiveMode() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
            View.SYSTEM_UI_FLAG_FULLSCREEN or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
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
        pdfWebView?.destroy()
        webView.stopLoading()
        webView.destroy()
        super.onDestroy()
    }

    companion object {
        private const val FILE_PICKER_REQUEST = 2048
        private const val KEY_LAST_PDF_URI = "last_pdf_uri"
        private const val KEY_LAST_PDF_ERROR = "last_pdf_error"
    }
}
