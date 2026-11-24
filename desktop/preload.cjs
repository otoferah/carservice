const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("FerahDesktop", {
  savePdf: () => ipcRenderer.invoke("ferah:save-pdf")
});
