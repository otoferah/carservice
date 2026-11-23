"use client";

import { useState } from "react";
import { FolderOpen } from "lucide-react";

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

let pickerScriptPromise: Promise<void> | null = null;

function loadPicker(): Promise<void> {
  if (window.google?.picker && window.gapi) return Promise.resolve();
  if (!pickerScriptPromise) {
    pickerScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.async = true;
      script.onload = () => window.gapi.load("picker", { callback: resolve });
      script.onerror = () => reject(new Error("Google Picker yüklenemedi."));
      document.head.appendChild(script);
    });
  }
  return pickerScriptPromise;
}

export default function GoogleDriveFolderPicker({ currentFolderId }: { currentFolderId: string | null }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function chooseFolder() {
    setBusy(true);
    setMessage("");
    try {
      const config = {
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
        appId: process.env.NEXT_PUBLIC_GOOGLE_APP_ID,
      };
      if (!config.apiKey || !config.appId) {
        throw new Error("Google Picker için NEXT_PUBLIC_GOOGLE_API_KEY ve NEXT_PUBLIC_GOOGLE_APP_ID ayarları eksik.");
      }

      const tokenResponse = await fetch("/api/google-drive/picker-token", { cache: "no-store" });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.accessToken) throw new Error(tokenData.error || "Google Drive oturumu alınamadı.");

      await loadPicker();
      const google = window.google;
      const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
        .setSelectFolderEnabled(true)
        .setMimeTypes("application/vnd.google-apps.folder");

      const picker = new google.picker.PickerBuilder()
        .setAppId(config.appId)
        .setDeveloperKey(config.apiKey)
        .setOAuthToken(tokenData.accessToken)
        .addView(view)
        .setTitle("Ferah Otomotiv servis görselleri klasörünü seç")
        .setCallback(async (data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            const folder = data.docs?.[0];
            if (!folder?.id) {
              setMessage("Klasör seçimi alınamadı.");
              setBusy(false);
              return;
            }
            const saveResponse = await fetch("/api/google-drive/folder", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ folderId: folder.id }),
            });
            const saveData = await saveResponse.json();
            if (!saveResponse.ok) throw new Error(saveData.error || "Klasör kaydedilemedi.");
            setMessage(folder.name + " klasörü bağlandı. Sayfa yenileniyor...");
            window.location.reload();
          } else if (data.action === google.picker.Action.CANCEL) {
            setBusy(false);
          }
        })
        .build();
      picker.setVisible(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Klasör seçimi başlatılamadı.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="primary-button" type="button" onClick={chooseFolder} disabled={busy}>
        <FolderOpen size={16} /> {busy ? "Klasör seçici açılıyor..." : currentFolderId ? "Drive klasörünü değiştir" : "Mevcut Drive klasörünü seç"}
      </button>
      {message && <p className="muted small-copy" role="status">{message}</p>}
      {currentFolderId && <p className="muted small-copy">Bağlı klasör kimliği: {currentFolderId}</p>}
    </div>
  );
}
