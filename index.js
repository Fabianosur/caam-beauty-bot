const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'caam_verify_2024';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const greetedUsers = new Set();

const PITCH = `Cada dia que pospones el cuidado de tu piel, el tiempo sigue avanzando. La inflamacion esta relacionada con el envejecimiento, y CAAM esta disenado para ayudarte a desinflamar mientras revitalizas tu rostro con el poder del frio. No esperes a que los signos sean mas visibles.`;

const WELCOME_MSG = `Hola! Ya tenes tu ICE FACE CAAM?

Conseguilo aqui:

🇺🇸 USA: $29.99 USD
Web: https://caambeauty.com/products/ice-face-caam
Amazon: https://www.amazon.com/CAAM-Ice-Face-Roller-Cryotherapy/dp/B0F9XQH3GF
Walmart: https://www.walmart.com/ip/ICE-FACE-CAAM-Facial-Tool-Skin-Care-Reusable-Silicone-Ice-Facial/16474767087

🇨🇴 Colombia: $117.000 COP
Web: https://caambeauty.com/products/ice-face-caam
Tambien en FARMATODO en toda Colombia.

🇦🇷 Argentina: $51.990 ARS
Web: https://caambeauty.com/products/ice-face-caam
Mercado Libre: https://www.mercadolibre.com.ar/rodillo-facial-de-hielo-ice-roller-cara-cuello-crio-caam/up/MLAU3481426238

🇪🇨 Ecuador: https://arcamia.com/producto/ice-face/ o @caam.ecuador
🇵🇪 Peru: https://caambeauty.com/products/ice-face-caam o @caam.peru

Otro pais: caambeautyinfo@gmail.com

${PITCH}

Tenes alguna otra pregunta?`;

const CAAM_CONTEXT = `Eres el asistente de ventas de CAAM Beauty. Responde siempre directo, sin vueltas, en el idioma del usuario.

REGLAS IMPORTANTES:
- Nunca te presentes como asistente ni digas quien eres.
- Nunca digas Hola ni ningun saludo.
- Nunca preguntes de que pais es el usuario.
- Nunca pidas informacion adicional — responde directo con todo.
- Nunca menciones WhatsApp.
- Se breve, directo y amable.
- Siempre usa links completos con https://
- Al final de cada respuesta agrega: "Tenes alguna otra pregunta?"

CUANDO PREGUNTEN PRECIO, DONDE COMPRAR O CUALQUIER CONSULTA COMERCIAL — responde exactamente asi, todo junto:

"Conseguilo aqui:

🇺🇸 USA: $29.99 USD
Web: https://caambeauty.com/products/ice-face-caam
Amazon: https://www.amazon.com/CAAM-Ice-Face-Roller-Cryotherapy/dp/B0F9XQH3GF
Walmart: https://www.walmart.com/ip/ICE-FACE-CAAM-Facial-Tool-Skin-Care-Reusable-Silicone-Ice-Facial/16474767087

🇨🇴 Colombia: $117.000 COP
Web: https://caambeauty.com/products/ice-face-caam
Tambien en FARMATODO en toda Colombia.

🇦🇷 Argentina: $51.990 ARS
Web: https://caambeauty.com/products/ice-face-caam
Mercado Libre: https://www.mercadolibre.com.ar/rodillo-facial-de-hielo-ice-roller-cara-cuello-crio-caam/up/MLAU3481426238

🇪🇨 Ecuador: https://arcamia.com/producto/ice-face/ o @caam.ecuador
🇵🇪 Peru: https://caambeauty.com/products/ice-face-caam o @caam.peru

Otro pais: caambeautyinfo@gmail.com

Cada dia que pospones el cuidado de tu piel, el tiempo sigue avanzando. La inflamacion esta relacionada con el envejecimiento, y CAAM esta disenado para ayudarte a desinflamar mientras revitalizas tu rostro con el poder del frio. No esperes a que los signos sean mas visibles.

Tenes alguna otra pregunta?"

CUANDO PREGUNTEN COMO SE USA, PARA QUE SIRVE, BENEFICIOS O TIPO DE PIEL:

El ICE FACE CAAM es un dispositivo de crioterapia facial patentado, creado por Carolina Reyes. Reafirma la piel, reduce la inflamacion y mejora la circulacion. Sin quemar, sin mojar, sin residuos. Apto para todo tipo de piel. Duracion recomendada: 15-20 minutos.

Cada dia que pospones el cuidado de tu piel, el tiempo sigue avanzando. La inflamacion esta relacionada con el envejecimiento, y CAAM esta disenado para ayudarte a desinflamar mientras revitalizas tu rostro con el poder del frio. No esperes a que los signos sean mas visibles.

Modo de uso:
1. Llena con agua y congela minimo 2 horas.
2. Movimientos ascendentes desde el menton hacia mejillas y frente.
3. Cuello: movimientos de abajo hacia arriba.
4. Ojos: movimientos suaves y circulares.
5. Duracion: 15-20 minutos para ver resultados.

Ve los videos de Carolina y compra aqui: https://caambeauty.com/products/ice-face-caam

Tenes alguna otra pregunta?

GARANTIA: 100% satisfaccion, 30 dias de reembolso. Sin riesgo.

CUANDO ALGUIEN DUDE: Garantia de 30 dias, producto patentado unico en el mundo, resultados visibles desde la primera aplicacion. Compra aqui: https://caambeauty.com/products/ice-face-caam

SI NO SABES ALGO: caambeautyinfo@gmail.com`;

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
      max_tokens: 600,
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
          reply = WELCOME_MSG;
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
