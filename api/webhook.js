const SUPABASE_URL=process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY=process.env.SUPABASE_SERVICE_KEY||process.env.VITE_SUPABASE_ANON_KEY;
async function getIsoId(slug){const res=await fetch(`${SUPABASE_URL}/rest/v1/isos?select=id&slug=eq.${slug}`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});const data=await res.json();return data?.[0]?.id||null;}
async function supabaseInsert(table,rows){const res=await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{method:'POST',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(rows)});return res.status;}
function toFloat(v){const n=parseFloat(String(v||'').replace(/[$,%]/g,''));return isNaN(n)?null:n;}
function toISOMonth(d){if(!d)return null;try{const dt=new Date(d);return new Date(dt.getFullYear(),dt.getMonth(),1).toISOString().split('T')[0];}catch{return null;}}
export default async function handler(req,res){
  if(req.method==='GET')return res.status(200).json({ok:true,service:'Victoria CRM Webhook',status:'ready'});
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const isoSlug=req.query.iso||'';if(!isoSlug)return res.status(400).json({error:'Missing ?iso= parameter'});
  const isoId=await getIsoId(isoSlug);if(!isoId)return res.status(404).json({error:`ISO not found: ${isoSlug}`});
  try{
    const payload=req.body;const event=payload.event||payload.type||'';
    if(event.toLowerCase().includes('residual')){
      const items=payload.data||payload.residuals||[payload];const records=[];
      for(const item of(Array.isArray(items)?items:[items])){const mid=item.mid||item.merchant_id;if(!mid)continue;records.push({iso_id:isoId,mid:String(mid),business_name:item.merchant||item.dba_name||null,report_month:toISOMonth(item.statement_date||item.period||item.created_at),gross_volume:toFloat(item.volume||item.sales_amount),gross_revenue:toFloat(item.net||item.gross_profit),net_revenue:toFloat(item.agent_net||item.agent_income),paydiversenet:toFloat(item.agent_income||item.agent_payout||item.agent_net),source_file:`${isoSlug}_webhook_${event}`});}
      if(records.length>0){const status=await supabaseInsert('residuals',records);await supabaseInsert('file_ingestion_log',[{dropbox_path:`webhook/${isoSlug}/${event}`,file_name:`${isoSlug}_webhook_${new Date().toISOString().slice(0,10)}`,iso_id:isoId,file_type:'residual_report',status:status===201?'complete':'error',rows_imported:status===201?records.length:0,processed_at:new Date().toISOString()}]);return res.status(200).json({ok:true,inserted:records.length,iso:isoSlug});}
    }
    return res.status(200).json({ok:true,event,note:'Received'});
  }catch(err){return res.status(500).json({error:err.message});}
}
