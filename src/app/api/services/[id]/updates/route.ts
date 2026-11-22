import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import type {ServiceStatus} from "@/lib/types";
const allowed:ServiceStatus[]=["waiting","repairing","testing","ready","delivered"];
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Oturum gerekli."},{status:401});
  const body=await request.json();const status=body.status as ServiceStatus;const note=String(body.note||"").trim();
  if(!allowed.includes(status)||!note)return NextResponse.json({error:"Geçerli bir aşama ve gelişme notu girin."},{status:400});
  const {data,error}=await supabase.rpc("append_service_update",{p_service_record_id:id,p_status:status,p_note:note});
  if(error)throw error;
  return NextResponse.json({id:data},{status:201});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Gelişme kaydedilemedi."},{status:400});}
}
