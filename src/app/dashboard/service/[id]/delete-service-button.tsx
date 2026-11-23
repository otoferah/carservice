"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {Trash2} from "lucide-react";
export default function DeleteServiceButton({recordId,plate}:{recordId:string;plate:string}){
 const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function remove(){
  const confirmed=window.confirm(" "+plate+" plakalı aracın servis kaydını kalıcı olarak silmek istediğinize emin misiniz? Parçalar, ekip atamaları, servis geçmişi ve kayıt görselleri de silinir. Müşteri ve araç ana kayıtları korunur. Bu işlem geri alınamaz.");
  if(!confirmed)return;
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/services/"+recordId,{method:"DELETE"});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Kayıt silinemedi.");
   if(data.storageWarning)window.alert(data.storageWarning);
   router.push("/dashboard");router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"Kayıt silinemedi.");setBusy(false);}
 }
 return <div className="delete-service-wrap">
  <button type="button" className="danger-button" onClick={()=>void remove()} disabled={busy}><Trash2 size={15}/>{busy?"Siliniyor...":"Servis kaydını kalıcı sil"}</button>
  {error&&<p className="form-error">{error}</p>}
 </div>;
}
