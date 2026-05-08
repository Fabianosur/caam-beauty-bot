const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'caam_verify_2024';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const CAAM_CONTEXT = `
Sos el asistente virtual de CAAM Beauty, la marca del ICE FACE CAAM, un dispositivo de crioterapia facial patentado creado por Carolina Reyes.

INFORMACIÓN DEL PRODUCTO:
- Producto: ICE FACE CAAM — dispositivo de crioterapia facial, hecho en silicona food-grade, reutilizable
- Beneficios: tonifica, reafirma, desinflamar, reduce ojeras, minimiza poros, mejora circulación, efecto lifting natural
- Cómo se usa: llenar de agua, congelar, deslizar en cara y cuello con movimientos suaves hacia arriba

PRECIOS:
- USA: $29.99 (disponible en caambeauty.com y Amazon)
- Colom
