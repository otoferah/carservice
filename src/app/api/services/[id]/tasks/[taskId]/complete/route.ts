import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
export async function POST(request:Request,{params}:{params:Promise<{id:string;taskId:string}>}){
 try{
  const {taskId}=await params;const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Oturum gerekli."},{status:401});
  const {data:profile}=await supabase.from("profiles").select("is_active").eq("id",user.id).maybeSingle();
  if(!profile?.is_active)return NextResponse.json({error:"Aktif personel hesabı gerekli."},{status:403});
  const body=await request.json().catch(()=>({}));
  const note=String(body.completion_note||"").trim();
  if(note.length>2000)return NextResponse.json({error:"Tamamlama notu en fazla 2.000 karakter olabilir."},{status:400});
  const {error}=await supabase.rpc("complete_service_task",{p_task_id:taskId,p_completion_note:note||null});
  if(error)throw error;
  return NextResponse.json({success:true});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Görev tamamlanamadı."},{status:400});}
}
