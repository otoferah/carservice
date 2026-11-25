const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("FerahDesktop", {
  savePdf: (customerName) => ipcRenderer.invoke("ferah:save-pdf", customerName)
});
