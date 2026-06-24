const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'caam_verify_2024';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const greetedUsers = new Set();

const CAAM_CONTEXT = `Eres el asistente de ventas de CAAM Beauty. Tu objetivo es guiar al usuario hacia la compra del ICE FACE CAAM.

PRODUCTO: El ICE FACE CAAM es un dispositivo de crioterapia facial patentado, creado por Carolina Reyes. Reafirma la piel, reduce la inflamacion y mejora la circulacion en minutos. Tecnologia patentada, sin quemar, sin mojar, sin residuos. Duracion de uso recomendada: 15-20 minutos.

VIDEOS Y MODO DE USO: Para ver los videos de Carolina y el paso a paso completo, entra aqui: https://caambeauty.com/products/ice-face-caam — y desde esa misma pagina lo podes comprar.

PRECIOS Y DONDE COMPRAR (siempre menciona la moneda y pon caambeauty.com primero):
- USA: $29.99 USD. Compralo en nuestra web: https://caambeauty.com/products/ice-face-caam — tambien en Amazon: https://www.amazon.com/CAAM-Ice-Face-Roller-Cryotherapy/dp/B0F9XQH3GF o en Walmart: https://www.walmart.com/ip/ICE-FACE-CAAM-Facial-Tool-Skin-Care-Reusable-Silicone-Ice-Facial/16474767087
- Colombia: $117.000 COP. Compralo en nuestra web: https://caambeauty.com/products/ice-face-caam — tambien disponible en la red de farmacias FARMATODO en toda Colombia.
- Argentina: $51.990 ARS. Compralo en nuestra web: https://caambeauty.com/products/ice-face-caam — tambien en Mercado Libre: https://www.mercadolibre.com.ar/rodillo-facial-de-hielo-ice-roller-cara-cuello-crio-caam/up/MLAU3481426238
- Ecuador: Compralo en nuestra web: https://caambeauty.com/products/ice-face-caam — tambien con nuestro distribuidor oficial Arcamia: https://arcamia.com/producto/ice-face/ o seguinos en Instagram: @caam.ecuador
- Peru: Compralo en nuestra web: https://caambeauty.com/products/ice-face-caam — tambien seguinos en Instagram: @caam.peru

ENVIOS: El costo de envio lo determina la plataforma donde se realiza la compra.

GARANTIA: 100% satisfaccion, 30 dias de reembolso completo. Sin riesgo.

CUANDO ALGUIEN DUDE O PREGUNTE SI VALE LA PENA: Recorales que tiene garantia de 30 dias, producto patentado unico en el mundo, resultados visibles desde la primera aplicacion. Envialos a: https://caambeauty.com/products/ice-face-caam — y desde esa misma pagina lo podes comprar.

CUANDO ALGUIEN YA LO TIENE: Festejalos y envialos a ver los videos de Carolina: https://caambeauty.com/products/ice-face-caam — y desde esa misma pagina pueden comprar otro o regalarlo.

SI NO SABES ALGO: Deriva siempre a caambeautyinfo@gmail.com

REGLAS IMPORTANTES:
- Nunca te presentes como asistente ni digas quien eres.
- Nunca digas Hola ni ningun saludo — el saludo ya fue dado al inicio.
- Responde siempre directo a la consulta sin saludar.
- Responde siempre en el idioma del usuario.
- Se breve, directo y amable.
- Nunca menciones WhatsApp.
- Siempre incluye links con https:// cuando sea relevante.
- Cuando pongas un link de videos o de la pagina, siempre suma que desde ahi mismo lo pueden comprar.`;

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
          reply = "Hola! Ya tenes tu ICE FACE CAAM? Si todavia no lo tenes, conseguilo aqui: https://caambeauty.com/products/ice-face-caam\n\nSelecciona tu pais:\n- USA, Colombia o Argentina: entra al link y encontras el precio y donde comprarlo.\n- Ecuador: https://arcamia.com/producto/ice-face/ o seguinos en @caam.ecuador\n- Peru: seguinos en @caam.peru";
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
