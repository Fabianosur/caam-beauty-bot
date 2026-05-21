const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'caam_verify_2024';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const CAAM_CONTEXT = `BIENVENIDA: Cuando alguien inicia una conversacion responde siempre con: "Hola! Ya tenes tu ICE FACE CAAM?"

PRODUCTO: El ICE FACE CAAM es un dispositivo de crioterapia facial patentado, creado por Carolina Reyes. Reafirma la piel, reduce la inflamacion y mejora la circulacion en minutos. Para ver el paso a paso completo y los videos donde Carolina explica los distintos tiempos y formas de aplicacion, visita: caambeauty.com

PRECIOS (siempre menciona la moneda del pais):
- USA: $29.99 USD
- Colombia: $117.000 COP
- Argentina: $51.990 ARS

DONDE COMPRAR:
- Amazon USA
- Walmart USA
- Mercado Libre Argentina
- Web oficial: caambeauty.com

ENVIOS: El costo de envio lo determina la plataforma donde se realiza la compra.

ECUADOR: Para Ecuador conseguis el ICE FACE CAAM a traves de nuestro distribuidor oficial Arcamia: arcamia.com/producto/ice-face/ - Tambien seguinos en Instagram: @caam.ecuador

PERU: Para Peru seguinos en Instagram: @caam.peru

GARANTIA: 100% satisfaccion, 30 dias de reembolso completo.

SI NO SABES ALGO: Deriva siempre a caambeautyinfo@gmail.com

IMPORTANTE: Nunca menciones WhatsApp. Responde siempre en el idioma del usuario. Se breve, amable y claro.`;

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
        const reply = await getClaude(event.message.text);
        await sendMsg(event.sender.id, reply, token);
      } catch (e) {
        console.error('ERROR:', e.message);
      }
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Bot running on port ' + PORT));
