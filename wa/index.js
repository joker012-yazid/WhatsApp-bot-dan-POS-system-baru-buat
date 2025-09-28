import express from 'express';
import axios from 'axios';
import pino from 'pino';
import pinoHttp from 'pino-http';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@adiwajshing/baileys';

const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.APP_WEBHOOK_URL;

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const httpLogger = pinoHttp({ logger });

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(httpLogger);

let sock;
let sockInitPromise;

const sendWebhook = async (eventName, payload) => {
  if (!WEBHOOK_URL) {
    logger.warn({ eventName }, 'Webhook URL not configured, skipping event dispatch');
    return;
  }

  try {
    await axios.post(WEBHOOK_URL, {
      event: eventName,
      data: payload
    });
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
      if (!msg) return;

      const eventPayload = {
        type: m.type,
        key: msg.key,
        message: msg.message,
        pushName: msg.pushName,
        timestamp: msg.messageTimestamp
      };

      await sendWebhook('messages.upsert', eventPayload);
    });

    newSock.ev.on('messages.update', (updates) => sendWebhook('messages.update', updates));
    newSock.ev.on('messages.delete', (deletes) => sendWebhook('messages.delete', deletes));
    newSock.ev.on('presence.update', (presence) => sendWebhook('presence.update', presence));
    newSock.ev.on('contacts.update', (contacts) => sendWebhook('contacts.update', contacts));

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
    const { to, message } = req.body;

    if (!to || !message) {
      res.status(400).json({ error: 'Missing "to" or "message" in request body' });
      return;
    }

    const client = await ensureSocket();
    if (!client) {
      res.status(503).json({ error: 'WhatsApp client not ready' });
      return;
    }

    await client.sendMessage(to, { text: message });
    res.json({ success: true });
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
