const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'caam_verify_2024';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const CAAM_CONTEXT = 'Sos el asistente virtual de CAAM Beauty. El producto es el ICE FACE CAAM, un dispositivo de crioterapia facial patentado creado por Carolina Reyes. Respondé en español, de forma amable y concisa. Si preguntan por precio, envío o compra, dirigilos a la web caambeauty.com o al Instagram @caam.bycaroreyes.';

async function getClaude(msg) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {'Content-Type':'application/json','x-api-key':ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
    body: JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:300,system:CAAM_CONTEXT,messages:[{role:'user',content:msg}]})
  });
  const d = await r.json();
  console.log('CLAUDE RESPONSE:', JSON.stringify(d));
  if (!d.content || !d.content[0]) throw new Error('No content: ' + JSON.stringify(d));
  return d.content[0].text;
}

async function sendMsg(id, text, token) {
  const r = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${token}`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({recipient:{id},message:{text}})
  });
  const d = await r.json();
  console.log('SEND RESULT:', JSON.stringify(d));
}

app.get('/webhook',(req,res)=>{
  if(req.query['hub.verify_token']===VERIFY_TOKEN) res.send(req.query['hub.challenge']);
  else res.sendStatus(403);
});

app.post('/webhook',async(req,res)=>{
  res.sendStatus(200);
  const body=req.body;
  console.log('WEBHOOK FULL:', JSON.stringify(body));
  if(body.object!=='page'&&body.object!=='instagram') return;
  const isIG = body.object==='instagram';
  const token = isIG ? INSTAGRAM_ACCESS_TOKEN : PAGE_ACCESS_TOKEN;
  for(const entry of body.entry){
    for(const event of (entry.messaging||[])){
      console.log('EVENT:', JSON.stringify(event));
      if(event.message&&event.message.text){
        try{
          const reply=await getClaude(event.message.text);
          await sendMsg(event.sender.id,reply,token);
        }catch(e){console.error('ERROR:',e);}
      }
    }
  }
});

app.get('/',(req,res)=>res.send('CAAM Beauty Bot running!'));
app.listen(process.env.PORT||3000,()=>console.log('Bot started'));
