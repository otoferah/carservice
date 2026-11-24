const { app, BrowserWindow, shell, session } = require("electron");
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
      spellcheck: true
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
