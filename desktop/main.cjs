const { app, BrowserWindow, shell, session, ipcMain, dialog } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const APP_URL = "https://ferah-otomotiv-servis.otoferah.workers.dev/";
const APP_HOST = new URL(APP_URL).hostname;
let mainWindow;

let whatsappWindow;
const WHATSAPP_PARTITION = "persist:ferah-whatsapp";

function openWhatsAppWorkspace(targetUrl = "https://web.whatsapp.com/") {
  if (whatsappWindow && !whatsappWindow.isDestroyed()) {
    if (targetUrl !== "https://web.whatsapp.com/") whatsappWindow.loadURL(targetUrl);
    whatsappWindow.show();
    whatsappWindow.focus();
    return whatsappWindow;
  }
  whatsappWindow = new BrowserWindow({
    width: 1240, height: 820, minWidth: 900, minHeight: 620,
    parent: mainWindow || undefined, modal: false, show: false,
    autoHideMenuBar: true, backgroundColor: "#111318",
    title: "Ferah Otomotiv · WhatsApp",
    webPreferences: {
      partition: WHATSAPP_PARTITION,
      nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true
    }
  });
  // WhatsApp rejects outdated/embedded-browser user-agent strings.
  // Use the actual Chromium version bundled with this Electron build, without the Electron token.
  const chromiumVersion = process.versions.chrome || "142.0.0.0";
  const whatsappUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" + chromiumVersion + " Safari/537.36";
  whatsappWindow.webContents.setUserAgent(whatsappUserAgent);

  whatsappWindow.webContents.setWindowOpenHandler(({url}) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "https:" && (parsed.hostname === "web.whatsapp.com" || parsed.hostname.endsWith(".whatsapp.com"))) return { action: "allow" };
      if (parsed.protocol === "https:") shell.openExternal(url);
    } catch {}
    return { action: "deny" };
  });
  whatsappWindow.on("closed", () => { whatsappWindow = null; });
  whatsappWindow.once("ready-to-show", () => whatsappWindow?.show());
  whatsappWindow.loadURL(targetUrl);
  return whatsappWindow;
}


function isTrustedAppUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && (
      url.hostname === APP_HOST ||
      url.hostname === "accounts.google.com" ||
      url.hostname.endsWith(".google.com") ||
      url.hostname.endsWith(".googleapis.com") ||
      url.hostname === "supabase.co" ||
      url.hostname.endsWith(".supabase.co")
    );
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    show: false,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: "#090b0e",
    title: "Ferah Otomotiv",
    icon: path.join(__dirname, "build", "icon.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: true,
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedAppUrl(url)) {
      return { action: "allow", overrideBrowserWindowOptions: {
        autoHideMenuBar: true,
        backgroundColor: "#090b0e",
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true
        }
      }};
    }
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedAppUrl(url)) {
      event.preventDefault();
      if (url.startsWith("https://")) shell.openExternal(url);
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => { mainWindow = null; });
  mainWindow.loadURL(APP_URL);
}

ipcMain.handle("ferah:save-pdf", async (event, customerName = "Müşteri", plate = "", html = "") => {
  if (!mainWindow || event.sender !== mainWindow.webContents) throw new Error("Geçersiz PDF isteği.");
  if (typeof html !== "string" || !html.startsWith("<!doctype html>") || html.length > 8_000_000) {
    throw new Error("PDF içeriği geçersiz veya eksik.");
  }
  const safePart = (value, fallback) => String(value || "").trim().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[ıİ]/g, "i").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase() || fallback;
  const safeCustomerName = safePart(customerName, "MUSTERI");
  const safePlate = safePart(plate, "PLAKA");
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Ferah Otomotiv - PDF kaydet",
    defaultPath: safeCustomerName + "-" + safePlate + "-TEKLIF.pdf",
    buttonLabel: "PDF kaydet",
    filters: [{ name: "PDF Belgesi", extensions: ["pdf"] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };

  const pdfWindow = new BrowserWindow({
    show: false,
    width: 1000,
    height: 1400,
    backgroundColor: "#ffffff",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  try {
    await pdfWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
    await pdfWindow.webContents.executeJavaScript(
      "Promise.all(Array.from(document.images).map(img => img.decode().catch(() => undefined)))"
    );
    const pdf = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      pageSize: "A4",
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });
    await fs.writeFile(result.filePath, pdf);
    return { canceled: false, filePath: result.filePath };
  } finally {
    if (!pdfWindow.isDestroyed()) pdfWindow.close();
  }
});

app.whenReady().then(() => {
  app.setAppUserModelId("com.ferahotomotiv.servis");
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(["notifications", "clipboard-read", "clipboard-sanitized-write"].includes(permission));
  });
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("web-contents-created", (_event, contents) => {
  contents.on("will-attach-webview", event => event.preventDefault());
});


ipcMain.handle("ferah:open-whatsapp", async (event) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) throw new Error("Geçersiz WhatsApp isteği.");
  openWhatsAppWorkspace();
  return { opened: true };
});

ipcMain.handle("ferah:open-whatsapp-chat", async (event, phone, message = "") => {
  if (!mainWindow || event.sender !== mainWindow.webContents) throw new Error("Geçersiz WhatsApp isteği.");
  const digits = String(phone || "").replace(/\D/g, "");
  const normalized = digits.startsWith("0") ? "90" + digits.slice(1) : digits.startsWith("90") ? digits : digits.length === 10 ? "90" + digits : "";
  if (!/^90[0-9]{10}$/.test(normalized)) throw new Error("Müşterinin telefon numarası geçerli bir Türkiye cep telefonu değil.");
  const url = "https://web.whatsapp.com/send?phone=" + normalized + "&text=" + encodeURIComponent(String(message || ""));
  openWhatsAppWorkspace(url);
  return { opened: true };
});

ipcMain.handle("ferah:reveal-file", async (event, filePath) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) throw new Error("Geçersiz dosya isteği.");
  const resolved = path.resolve(String(filePath || ""));
  if (!resolved.toLowerCase().endsWith(".pdf")) throw new Error("Yalnızca PDF dosyaları açılabilir.");
  shell.showItemInFolder(resolved);
  return { opened: true };
});
