const { app, BrowserWindow, shell, session, ipcMain, dialog } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const APP_URL = "https://ferah-otomotiv-servis.otoferah.workers.dev/";
const APP_HOST = new URL(APP_URL).hostname;
let mainWindow;

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

ipcMain.handle("ferah:save-pdf", async (event, customerName = "Müşteri") => {
  if (!mainWindow || event.sender !== mainWindow.webContents) throw new Error("Geçersiz PDF isteği.");
  const safeCustomerName = String(customerName).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "Musteri";
  const result = await dialog.showSaveDialog(mainWindow, { title: "Ferah Otomotiv - PDF kaydet", defaultPath: `${safeCustomerName}-Servis-Teklifi.pdf`, buttonLabel: "PDF kaydet", filters: [{ name: "PDF Belgesi", extensions: ["pdf"] }] });
  if (result.canceled || !result.filePath) return { canceled: true };
  const pdf = await mainWindow.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, pageSize: "A4", margins: { top: 0.35, bottom: 0.35, left: 0.35, right: 0.35 } });
  await fs.writeFile(result.filePath, pdf);
  return { canceled: false, filePath: result.filePath };
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
  await shell.openExternal("whatsapp://");
  return { opened: true };
});

ipcMain.handle("ferah:open-whatsapp-chat", async (event, phone, message = "") => {
  if (!mainWindow || event.sender !== mainWindow.webContents) throw new Error("Geçersiz WhatsApp isteği.");
  const digits = String(phone || "").replace(/\\D/g, "");
  const normalized = digits.startsWith("0") ? "90" + digits.slice(1) : digits.startsWith("90") ? digits : digits.length === 10 ? "90" + digits : "";
  if (!/^90[0-9]{10}$/.test(normalized)) throw new Error("Müşterinin telefon numarası geçerli bir Türkiye cep telefonu değil.");
  const url = "whatsapp://send?phone=" + normalized + "&text=" + encodeURIComponent(String(message || ""));
  await shell.openExternal(url);
  return { opened: true };
});

ipcMain.handle("ferah:reveal-file", async (event, filePath) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) throw new Error("Geçersiz dosya isteği.");
  const resolved = path.resolve(String(filePath || ""));
  if (!resolved.toLowerCase().endsWith(".pdf")) throw new Error("Yalnızca PDF dosyaları açılabilir.");
  shell.showItemInFolder(resolved);
  return { opened: true };
});
