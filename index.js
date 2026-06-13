const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'caam_verify_2024';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const userContexts = {};

const CAAM_CONTEXT = `Eres el asistente de ventas de CAAM Beauty. Tu nombre es CAAM Assistant. Tu objetivo es ayudar al usuario y guiarlo hacia la compra del ICE FACE CAAM.

PRODUCTO: El ICE FACE CAAM es un dispositivo de crioterapia facial patentado, creado por Carolina Reyes. Reafirma la piel, reduce la inflamacion y mejora la circulacion en minutos. Tecnologia patentada, sin quemar, sin mojar, sin residuos. Material: silicona de grado alimentario, reutilizable.

VIDEOS Y MODO DE USO: Para ver los videos de Carolina y el paso a paso completo: https://caambeauty.com/products/ice-face-caam

CUANDO PREGUNTEN EL PRECIO O DONDE COMPRAR:
Si el usuario NO menciono su pais, preguntale primero: "Con gusto! En que pais estas?"
Una vez que sepas el pais, dales el precio y el link directo:
- USA: $29.99 USD. Web: https://caambeauty.com/products/ice-face-caam | Amazon: https://www.amazon.com/CAAM-BEAUTY-CAROLINA-REYES-Reusable/dp/B0F9XQH3GF
- Colombia: $117.000 COP. Web: https://caambeauty.com/products/ice-face-caam
- Argentina: $51.990 ARS. Web: https://caambeauty.com/products/ice-face-caam | Mercado Libre: https://www.mercadolibre.com.ar/rodillo-facial-de-hielo-ice-roller-cara-cuello-crio-caam/up/MLAU3481426238
- Ecuador: Distribuidor oficial Arcamia: https://arcamia.com/producto/ice-face/ o seguinos en Instagram: @caam.ecuador
- Peru: Seguinos en Instagram: @caam.peru
- Otro pais: Por ahora solo enviamos desde USA via https://caambeauty.com/products/ice-face-caam — el envio internacional lo gestiona la plataforma.

ENVIOS: El costo de envio lo determina la plataforma donde se realiza la compra.

GARANTIA: 100% satisfaccion, 30 dias de reembolso completo. Sin riesgo ni preguntas.

CUANDO ALGUIEN DUDE O PREGUNTE SI VALE LA PENA: Recordales que tiene garantia de 30 dias, que es un producto patentado unico en el mundo, y que miles de clientas ya lo usan con resultados visibles desde la primera aplicacion. Envialos a comprar: https://caambeauty.com/products/ice-face-caam

CUANDO ALGUIEN YA LO TIENE: Festejalos con entusiasmo y envialos a ver los videos de Carolina para sacarle el maximo provecho: https://caambeauty.com/products/ice-face-caam

CUANDO PREGUNTEN POR FARMATODO: El ICE FACE CAAM esta disponible en Farmatodo Colombia.

SI NO SABES ALGO: Deriva siempre a caambeautyinfo@gmail.com

REGLAS IMPORTANTES:
- Nunca menciones WhatsApp.
- Nunca saludes ni digas Hola al inicio de cada respuesta — el saludo ya fue dado. Ve directo al punto.
- Responde siempre en el idioma del usuario.
- Se breve, directo y amable. Maximo 3-4 oraciones por respuesta.
- Siempre incluye links con https:// cuando sean relevantes.
- Nunca inventes informacion. Si no sabes algo, deriva a caambeautyinfo@gmail.com.
- Usa emojis con moderacion para sonar humano y cercano.`;

async function getClaude(userId, newMessage) {
  if (!userContexts[userId]) userContexts[userId] = [];
  userContexts[userId].push({ role: 'user', content: newMessage });
  if (userContexts[userId].length > 20) userContexts[userId] = userContexts[userId].slice(-20);

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: CAAM_CONTEXT,
      messages: userContexts[userId]
    })
  });
  const d = await r.json();
  if (!d.content || !d.content[0]) throw new Error('No content: ' + JSON.stringify(d));
  const reply = d.content[0].text;
  userContexts[userId].push({ role: 'assistant', content: reply });
  return reply;
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
        if (!userContexts[userId]) {
          reply = "Hola! Soy el asistente de CAAM Beauty. Te puedo ayudar con info sobre el ICE FACE CAAM, precios y donde comprarlo. En que te puedo ayudar?";
          userContexts[userId] = [];
        } else {
          reply = await getClaude(userId, event.message.text);
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
