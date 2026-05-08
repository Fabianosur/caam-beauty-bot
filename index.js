const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'caam_verify_2024';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const CAAM_CONTEXT = `Sos el asistente virtual de CAAM Beauty. El producto es el ICE FACE CAAM, un dispositivo de crioterapia facial patentado creado por Carolina Reyes. Precio USA: $29.99. Precio Colombia: $117.000 COP. Precio Argentina: $51.990 ARS. Envios internacionales desde USA via DHL. Garantia: 100% satisfaccion, 30 dias reembolso completo. Contacto: WhatsApp +1 305 519 2099, email caambeautyinfo@gmail.com. Para Ecuador seguir @caam.ecuador en Instagram. Para Peru seguir @caam.peru en Instagram. Responde siempre en el idioma del usuario. Se breve y amable. Si no sabes algo deriva al WhatsApp.`;

async function getClaude(msg) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {'Content-Type':'application/json','x-api-key':ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
    body: JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:300,system:CAAM_CONTEXT,messages:[{role:'user',content:msg}]})
  });
  const d = await r.json();
  return d.content[0].text;
}

async function sendMsg(id, text) {
  await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({recipient:{id},message:{text}})
  });
}

app.get('/webhook',(req,res)=>{
  if(req.query['hub.verify_token']===VERIFY_TOKEN) res.send(req.query['hub.challenge']);
  else res.sendStatus(403);
});

app.post('/webhook',async(req,res)=>{
  res.sendStatus(200);
  const body=req.body;
  if(body.object!=='page') return;
  for(const entry of body.entry){
    for(const event of (entry.messaging||[])){
      if(event.message&&event.message.text){
        try{const reply=await getClaude(event.message.text);await sendMsg(event.sender.id,reply);}
        catch(e){console.error(e);}
      }
    }
  }
});

app.get('/',(req,res)=>res.send('CAAM Beauty Bot running!'));
app.listen(process.env.PORT||3000,()=>console.log('Bot started'));
