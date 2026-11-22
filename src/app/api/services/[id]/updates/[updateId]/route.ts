import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";

export async function PATCH(
 request:Request,
 {params}:{params:Promise<{id:string;updateId:string}>}
){
 try{
  const {id,updateId}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Oturum gerekli."},{status:401});
  const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
  if(!profile?.is_active||!["admin","supervisor"].includes(profile.role)){
   return NextResponse.json({error:"Servis geçmişini yalnızca yönetici veya supervisor düzenleyebilir."},{status:403});
  }
  const body=await request.json();
  const {error}=await supabase.rpc("update_service_update_note",{
   p_service_record_id:id,p_update_id:updateId,p_note:body.note
  });
  if(error)throw error;
  return NextResponse.json({success:true});
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:"Servis notu güncellenemedi."},{status:400});
 }
}
