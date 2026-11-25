const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("FerahDesktop", {
  savePdf: (customerName, plate, html) => ipcRenderer.invoke("ferah:save-pdf", customerName, plate, html),
  openWhatsApp: () => ipcRenderer.invoke("ferah:open-whatsapp"),
  openWhatsAppChat: (phone, message) => ipcRenderer.invoke("ferah:open-whatsapp-chat", phone, message),
  revealFile: (filePath) => ipcRenderer.invoke("ferah:reveal-file", filePath)
});
