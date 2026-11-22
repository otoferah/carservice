import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.redirect(new URL("/login",_request.url));
  const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
  if(!profile?.is_active||!["admin","supervisor"].includes(profile.role))return NextResponse.json({error:"Teslim işlemi yalnızca yönetici veya supervisor tarafından yapılabilir."},{status:403});
  const {data:record,error:readError}=await supabase.from("service_records").select("status").eq("id",id).single();
  if(readError)throw readError;if(record.status!=="ready")return NextResponse.json({error:"Teslim öncesi araç hazır durumunda olmalıdır."},{status:409});
  const {data,error}=await supabase.rpc("append_service_update",{p_service_record_id:id,p_status:"delivered",p_note:"Araç yetkili personel tarafından müşteriye teslim edildi."});
  if(error)throw error;
  return NextResponse.redirect(new URL("/dashboard/service/"+id,_request.url),303);
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Teslim işlemi yapılamadı."},{status:400});}
}
