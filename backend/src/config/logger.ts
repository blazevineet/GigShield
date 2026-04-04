import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
    : undefined,
  base: { service: 'gigshield-api', env: process.env.NODE_ENV },
  redact: ['req.headers.authorization', 'body.otp', 'body.password'],
});
