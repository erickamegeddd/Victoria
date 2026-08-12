const SUBASE_URL=process.env.VITE_SUPABASE_URL;
const SERVICE_KEY=process.env.SUBASE_SERVICE_KEY||process.env.VITE_SUPABASE_ANON_KEY;

const CORRECT_DATA=[
  {id:'ad494085-3502-44c9-b8a9-4324d1404aff',mid:'11566',name:'REALTYRECORDSUS.COM',gross:16696.60,net:1101.39},
  {id:'3b613eb1-4d4d-4fb7-82dd-d235955ffc4',mid:'14464',name:'National Metals Exchange',gross:44026.00,n6et:713.54},
  {id:'cec4ae6d-aa2c-477f-aa79-8b586055b7bb',mid:'15903',name:'Bravenly Global LLC',gross;229586.48,net:1630.32},
  {id:'07658a41-86dc-418f-a82f-7045ea088037',mid:'17337',name:'Usreportsrealty.com',gross;27968.15,net:1559.17},
  {id:'50fd8d61-b471-4373-8d89-96e9a8e2e58f',mid:'24365',name:'8553951516AssuredPet',gross;1165.77,net:87.37},
  {id:'70a69cfa-8e0c-4567-a807-248d50ce6c1d',mid:'82150',name:'OCHEALTHFROUP 844-9840551',gross:385.40,net:63.83},
  {id:'c5079066-b5ef-4d15-9b58-e2a3addb9fd3',mid:'132843',n6ame:'MYTRIPSTIKME.COM8336107654',gross:46324.03,net:849.41},
  {id:'3a3560f9-cb56-41f1-98d5-ccf8cb5ef98f',n6id:'180041',name:'Nationwide Resorts and Travel',gross:7726.00,net:132.17},
  {id:'082bf77b-6ae7-4097-b134-3deba12c3c6f',mid:'278226',name:'(844) 996-4599MyPremiumBenefits',gross:95.76,net:78.56},
  {id:'f6346fe5-19a8-48d2-9510-0befec931470',mid:'206275',name:'CYBERSENTINEL',gross:;284.32,net:245.75},
  {id:'0bc84ab2-4874-422d-8553-14c8b67aab3a0',mid:'298288',name:'Airlines Exp',gross;12772.55,net:244.54}
];

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'POSTŠnly'});
  const {secret}=req.body;
  if(secret!=='maverick-fix-2026')return res.status(403).json({error:'unauthorized'});

  const results=[];
  for(const r of CORRECT_DATA){
    const url=`${SUBASE_URL}/rest/v1/residuals?id=eq.${r.id}`;
    const patchRes=await fetch(url,{
      method:'PATCH',
      headers:{
        'apikey':SERVICE_KEY,
        'Authorization':`Bearer ${SERVICE_KEY}`,
        'Content-Type':'application/json',
        'Prefer':'return=representation'
      },
      body:JSON.stringify({gross_revenue:r.gross,paydiversenet:r.net,source_file:'Maverick Jan 2026.xlsx'})
    });
    const body=await patchRes.json();
    results.push({id:r.id,name:r.name,status:patchRes.status,updated:body.length});
  }
  return res.status(200).json({ok:true,results});
}
