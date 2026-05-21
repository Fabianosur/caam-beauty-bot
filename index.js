const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'caam_verify_2024';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const greetedUsers = new Set();

const CAAM_CONTEXT = `Eres el asistente de ventas de CAAM Beauty. Tu objetivo es guiar al usuario hacia la compra del ICE FACE CAAM.

PRODUCTO: El ICE FACE CAAM es un dispositivo de crioterapia facial patentado, creado por Carolina Reyes. Reafirma la piel, reduce la inflamacion y mejora la circulacion en minutos. Tecnologia patentada, sin quemar, sin mojar, sin residuos. Para ver videos y paso a paso: caambeauty.com

CUANDO PREGUNTEN EL PRECIO O DONDE COMPRAR, responde segun el pais:
- USA: $29.99 USD. Compralo en Amazon: amazon.com/CAAM-Ice-Face-Roller-Cryotherapy/dp/B0F9XQH3GF o en Walmart: walmart.com/ip/ICE-FACE-CAAM-Facial-Tool-Skin-Care-Reusable-Silicone-Ice-Facial/16474767087 o en nuestra web: caambeauty.com/products/ice-face-caam
- Colombia: $117.000 COP en caambeauty.com/products/ice-face-caam
- Argentina: $51.990 ARS. Compralo en nuestra web: caambeauty.com/products/ice-face-caam o tambien en Mercado Libre: mercadolibre.com.ar/rodillo-facial-de-hielo-ice-roller-cara-cuello-crio-caam/up/MLAU3481426238
- Ecuador: Conseguilo con nuestro distribuidor oficial Arcamia: arcamia.com/producto/ice-face/ o seguinos en Instagram: @caam.ecuador
- Peru: Seguinos en Instagram: @caam.peru

ENVIOS: El costo de envio lo determina la plataforma donde se realiza la compra.

GARANTIA: 100% satisfaccion, 30 dias de reembolso completo. Sin riesgo.

CUANDO ALGUIEN DUDE O PREGUNTE SI VALE LA PENA: Recorales que tiene garantia de 30 dias, que es un producto patentado unico en el mundo, y que miles de clientas ya lo usan con resultados visibles desde la primera aplicacion.

CUANDO ALGUIEN YA LO TIENE: Festejalos y envialos a ver los videos de Carolina para sacarle el maximo provecho: caambeauty.com

SI NO SABES ALGO: Deriva siempre a caambeautyinfo@gmail.com

REGLAS: Nunca menciones WhatsApp. Responde siempre en el idioma del usuario. Se breve, directo y amable. Siempre incluye un link de compra cuando sea relevante.`;

async function getClaude(msg) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: CAAM_CONTEXT,
      messages: [{ role: 'user', content: msg }]
    })
  });
  const d = await r.json();
  if (!d.content || !d.content[0]) throw new Error('No content: ' + JSON.stringify(d));
  return d.content[0].text;
}

async function sendMsg(id, text, token) {
  const r = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id }, message: { text } })
  });
  const d = await r.json();
  console.log('SEND RESULT:', JSON.stringify(d));
}

app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  const body = req.body;
  res.sendStatus(200);
  if (body.object !== 'page' && body.object !== 'instagram') return;
  const isIG = body.object === 'instagram';
  const token = isIG ? INSTAGRAM_ACCESS_TOKEN : PAGE_ACCESS_TOKEN;
  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      if (!event.message || !event.message.text) continue;
      try {
        const userId = event.sender.id;
        let reply;
        if (!greetedUsers.has(userId)) {
          greetedUsers.add(userId);
          reply = "Hola! Ya tenes tu ICE FACE CAAM? Si todavia no lo tenes, conseguilo aqui: caambeauty.com/products/ice-face-caam";
        } else {
          reply = await getClaude(event.message.text);
        }
        await sendMsg(userId, reply, token);
      } catch (e) {
        console.error('ERROR:', e.message);
      }
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Bot running on port ' + PORT));
