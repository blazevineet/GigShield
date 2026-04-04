// ─── db.ts ────────────────────────────────────────────────
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query'  },
    { emit: 'event', level: 'error'  },
    { emit: 'event', level: 'warn'   },
  ],
});

prisma.$on('error' as any, (e: any) => logger.error(e, 'Prisma error'));
prisma.$on('warn'  as any, (e: any) => logger.warn(e,  'Prisma warning'));

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query' as any, (e: any) => {
    logger.debug({ query: e.query, duration: `${e.duration}ms` }, 'DB query');
  });
}
