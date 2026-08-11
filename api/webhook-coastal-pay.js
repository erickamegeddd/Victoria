export default async function handler(req,res){
  if(req.method==='GET')return res.status(200).json({ok:true,service:'Victoria Coastal Pay Webhook',status:'ready'});
  req.query={...(req.query||{}),iso:'coastal-pay'};
  const{default:h}=await import('./webhook.js');return h(req,res);
}
