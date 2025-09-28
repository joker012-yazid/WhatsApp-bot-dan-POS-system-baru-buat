import express from 'express';
import axios from 'axios';
import pino from 'pino';
import pinoHttp from 'pino-http';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
} from '@adiwajshing/baileys';

const resolvePort = () => {
  const candidates = [
    process.env.WA_GATEWAY_PORT,
    process.env.WA_PORT,
    process.env.PORT,
  ].filter(Boolean);

  const fallback = 8080;
  if (candidates.length === 0) return fallback;

  const parsed = Number.parseInt(candidates[0] ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveWebhookUrl = () =>
  process.env.APP_INBOUND_WEBHOOK_URL ||
  process.env.APP_WEBHOOK_URL ||
  process.env.APP_WHATSAPP_WEBHOOK_URL ||
  '';

const PORT = resolvePort();
const WEBHOOK_URL = resolveWebhookUrl();

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const httpLogger = pinoHttp({ logger });

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(httpLogger);

let sock;
let sockInitPromise;

const extractMessageText = (message = {}) => {
  if (!message) return null;

  if (typeof message.conversation === 'string' && message.conversation.trim()) {
    return message.conversation.trim();
  }

  const extended = message.extendedTextMessage?.text;
  if (typeof extended === 'string' && extended.trim()) {
    return extended.trim();
  }

  const captionSources = [message.imageMessage, message.videoMessage]
    .map((media) => media?.caption)
    .filter((caption) => typeof caption === 'string' && caption.trim());
  if (captionSources.length > 0) {
    return captionSources[0].trim();
  }

  const buttonText = message.buttonsResponseMessage?.selectedDisplayText;
  if (typeof buttonText === 'string' && buttonText.trim()) {
    return buttonText.trim();
  }

  return null;
};

const normalizePhoneNumber = (value) => {
  if (!value) return '';

  const normalized = jidNormalizedUser(value);
  const [rawNumber] = normalized.split('@');
  if (!rawNumber) return '';

  const trimmed = rawNumber.trim();
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return '';

  if (hasPlus) {
    return `+${digitsOnly}`;
  }

  if (trimmed.startsWith('00')) {
    const withoutPrefix = digitsOnly.replace(/^00+/, '');
    return withoutPrefix ? `+${withoutPrefix}` : '';
  }

  return digitsOnly;
};

const ensureWhatsAppJid = (recipient) => {
  if (!recipient) {
    throw new Error('Missing WhatsApp recipient');
  }

  if (recipient.includes('@')) {
    return jidNormalizedUser(recipient);
  }

  const normalized = normalizePhoneNumber(recipient);
  if (!normalized) {
    throw new Error('Recipient phone number is invalid');
  }

  return `${normalized.replace(/^\+/, '')}@s.whatsapp.net`;
};

const sendWebhook = async (payload) => {
  if (!WEBHOOK_URL) {
    logger.warn({ event: 'messages.upsert' }, 'Webhook URL not configured, skipping event dispatch');
    return;
  }

  try {
    await axios.post(WEBHOOK_URL, payload);
  } catch (error) {
    logger.error(
      {
        err: error?.message,
        status: error?.response?.status,
        data: error?.response?.data
      },
      'Failed to deliver event to webhook'
    );
  }
};

const connectSocket = async () => {
  if (sockInitPromise) {
    return sockInitPromise;
  }

  sockInitPromise = (async () => {
    const { state, saveCreds } = await useMultiFileAuthState('./store');
    const { version, isLatest } = await fetchLatestBaileysVersion();

    logger.info({ version, isLatest }, 'Starting WhatsApp socket');

    const newSock = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: true,
      logger
    });

    newSock.ev.on('creds.update', saveCreds);

    newSock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.info('Received QR code, scan to pair:');
        console.log('\n================ QR CODE ================');
        console.log(qr);
        console.log('========================================\n');
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const reason = lastDisconnect?.error?.message || DisconnectReason[statusCode] || 'unknown';
        logger.warn({ statusCode, reason }, 'Connection closed');

        sock = undefined;

        if (statusCode !== DisconnectReason.loggedOut && statusCode !== 401) {
          setTimeout(connectSocket, 5000);
        } else {
          logger.error('Session logged out. Delete store directory to pair again.');
        }
      } else if (connection === 'open') {
        logger.info('WhatsApp socket connected');
      }
    });

    newSock.ev.on('messages.upsert', async (m) => {
      const [msg] = m.messages || [];
      if (!msg || !msg.key || msg.key.fromMe) return;

      const { remoteJid } = msg.key;
      if (!remoteJid || remoteJid.endsWith('@g.us')) {
        return;
      }

      const text = extractMessageText(msg.message);
      if (!text) {
        return;
      }

      const from = normalizePhoneNumber(remoteJid);
      if (!from) {
        logger.warn({ remoteJid }, 'Unable to normalize sender phone number');
        return;
      }

      await sendWebhook({ from, text });
    });

    sock = newSock;
    sockInitPromise = undefined;
    return newSock;
  })().catch((err) => {
    logger.error({ err }, 'Failed to initialize WhatsApp socket');
    sockInitPromise = undefined;
    throw err;
  });

  return sockInitPromise;
};

const ensureSocket = async () => {
  if (sock) {
    return sock;
  }
  return connectSocket();
};

app.post('/send', async (req, res) => {
  try {
    const { to, text } = req.body || {};

    if (!to || !text) {
      res.status(400).json({ error: 'Missing "to" or "text" in request body' });
      return;
    }

    const client = await ensureSocket();
    if (!client) {
      res.status(503).json({ error: 'WhatsApp client not ready' });
      return;
    }

    const jid = ensureWhatsAppJid(to);
    const result = await client.sendMessage(jid, { text });
    res.json({
      success: true,
      messageId: result?.key?.id || null,
      status: result?.status || 'sent',
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to send message');
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', connected: Boolean(sock?.user) });
});

app.listen(PORT, () => {
  logger.info(`WA gateway listening on port ${PORT}`);
  connectSocket().catch((err) => {
    logger.error({ err }, 'Initial socket connection failed');
  });
});
