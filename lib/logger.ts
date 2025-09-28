import pino from 'pino';
import pinoHttp from 'pino-http';

import env from '@/env.mjs';

const isProduction = env.NODE_ENV === 'production';
const defaultLevel = process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug');

const logger = pino({
  name: 'whatsapp-pos-system',
  level: defaultLevel,
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export const httpLogger = pinoHttp({
  logger,
  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});

export default logger;
