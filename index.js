const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'caam_verify_2024';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const greetedUsers = new Set();

const CAAM_CONTEXT = `Eres el asistente de ventas de CAAM Beauty. Responde siempre directo, sin vueltas, en el idioma del usuario.

REGLAS IMPORTANTES:
- Nunca te presentes como asistente ni digas quien eres.
- Nunca digas Hola ni ningun saludo — el saludo ya fue dado al inicio.
- Responde siempre directo a la consulta sin saludar.
- Nunca menciones WhatsApp.
- Se breve, directo y amable.
- Siempre usa links completos con https://

CUANDO PREGUNTEN PRECIO, DONDE COMPRAR, COMO CONSEGUIRLO O CUALQUIER CONSULTA COMERCIAL — responde exactamente asi, todo junto y completo:

"ICE FACE CAAM — Conseguilo aqui:

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

🇪🇨 Ecuador: https://arcamia.com/producto/ice-face/ o seguinos en @caam.ecuador
🇵🇪 Peru: https://caambeauty.com/products/ice-face-caam o seguinos en @caam.peru

Otro pais: escribinos a caambeautyinfo@gmail.com"

CUANDO PREGUNTEN COMO SE USA, PARA QUE SIRVE, BENEFICIOS, TIPO DE PIEL O CUALQUIER CONSULTA TECNICA — responde directo y breve:

PRODUCTO: El ICE FACE CAAM es un dispositivo de crioterapia facial patentado, creado por Carolina Reyes. Reafirma la piel, reduce la inflamacion y mejora la circulacion. Tecnologia patentada: sin quemar, sin mojar, sin residuos. Apto para todo tipo de piel incluyendo piel sensible. Duracion recomendada: 15-20 minutos por sesion.

MODO DE USO:
1. Llena el dispositivo con agua y congela minimo 2 horas.
2. Movimientos ascendentes desde el menton hacia mejillas y frente.
3. En el cuello: movimientos de abajo hacia arriba.
4. Alrededor de los ojos: movimientos suaves y circulares.
5. Duracion: 15-20 minutos para ver resultados.

Siempre termina con: "Ve los videos de Carolina y compra aqui: https://caambeauty.com/products/ice-face-caam"

GARANTIA: 100% satisfaccion, 30 dias de reembolso completo. Sin riesgo.

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
          reply = "Hola! Ya tenes tu ICE FACE CAAM? Si todavia no lo tenes, conseguilo aqui: https://caambeauty.com/products/ice-face-caam\n\n🇺🇸 USA | 🇨🇴 Colombia | 🇦🇷 Argentina | 🇪🇨 Ecuador | 🇵🇪 Peru\n\nDecime desde que pais sos y te paso el precio y donde comprarlo.";
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
