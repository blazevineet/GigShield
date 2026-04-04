/**
 * GigShield — Parametric Trigger Worker
 *
 * Runs every 5 minutes. Polls all active data sources,
 * evaluates thresholds, and fires auto-claims for any breach.
 */

import cron    from 'node-cron';
import axios   from 'axios';
import { prisma } from '../config/db';
import { logger } from '../config/logger';
import { autoTriggerClaim } from '../controllers/claimsController';

const TRIGGERS = [
  { type: 'HEAVY_RAINFALL',  threshold: 35,  unit: 'mm/hr' },
  { type: 'EXTREME_HEAT',    threshold: 42,  unit: '°C'    },
  { type: 'SEVERE_AQI',      threshold: 400, unit: 'AQI'   },
  { type: 'ORDER_COLLAPSE',  threshold: 60,  unit: '%drop' },
];

const ZONE_COORDS: Record<string, { lat: number; lon: number }> = {
  'Velachery':       { lat: 12.9784, lon: 80.2209 },
  'Tambaram':        { lat: 12.9249, lon: 80.1000 },
  'Sholinganallur':  { lat: 12.9010, lon: 80.2279 },
  'Anna Nagar':      { lat: 13.0850, lon: 80.2101 },
  'Adyar':           { lat: 13.0063, lon: 80.2574 },
  'T. Nagar':        { lat: 13.0418, lon: 80.2341 },
  'Porur':           { lat: 13.0356, lon: 80.1565 },
  'Guindy':          { lat: 13.0067, lon: 80.2206 },
};

export function startTriggerWorker() {
  // Poll every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Trigger worker: polling data sources...');
    await evaluateAllZones();
  });
}

async function evaluateAllZones() {
  const zones = Object.entries(ZONE_COORDS);

  await Promise.allSettled(
    zones.map(async ([zone, coords]) => {
      try {
        const readings = await fetchZoneReadings(zone, coords);
        await evaluateTriggers(zone, readings);
      } catch (err) {
        logger.error({ err, zone }, 'Failed to evaluate zone');
      }
    }),
  );
}

async function fetchZoneReadings(zone: string, coords: { lat: number; lon: number }) {
  const [weatherRes, aqiData] = await Promise.allSettled([
    fetchWeather(coords.lat, coords.lon),
    fetchMockAqi(zone),
  ]);

  const weather = weatherRes.status === 'fulfilled' ? weatherRes.value : null;

  return {
    rainfall: weather?.precipitation ? weather.precipitation * 60 : 0,  // mm/hr estimate
    temp:     weather?.temperature ?? 30,
    aqi:      aqiData.status === 'fulfilled' ? aqiData.value : 100,
    orderDrop: fetchMockOrderDrop(zone),
  };
}

async function fetchWeather(lat: number, lon: number) {
  const url = `${process.env.OPEN_METEO_BASE_URL}/forecast`;
  const res = await axios.get(url, {
    params: {
      latitude:  lat,
      longitude: lon,
      current:   'temperature_2m,precipitation,rain',
      timezone:  'Asia/Kolkata',
    },
    timeout: 8000,
  });
  return {
    temperature:   res.data.current.temperature_2m,
    precipitation: res.data.current.precipitation,
    rain:          res.data.current.rain,
  };
}

// Mock: replace with CPCB API in production
async function fetchMockAqi(zone: string): Promise<number> {
  const baseAqi: Record<string, number> = {
    Velachery: 120, Tambaram: 110, Guindy: 150, 'T. Nagar': 100,
  };
  return (baseAqi[zone] || 90) + Math.random() * 30;
}

// Mock: replace with Platform API webhook in production
function fetchMockOrderDrop(zone: string): number {
  return Math.random() * 25; // 0–25% simulated drop
}

async function evaluateTriggers(
  zone: string,
  readings: { rainfall: number; temp: number; aqi: number; orderDrop: number },
) {
  const valueMap: Record<string, number> = {
    HEAVY_RAINFALL: readings.rainfall,
    EXTREME_HEAT:   readings.temp,
    SEVERE_AQI:     readings.aqi,
    ORDER_COLLAPSE: readings.orderDrop,
  };

  for (const trigger of TRIGGERS) {
    const value = valueMap[trigger.type];
    if (value === undefined) continue;

    // Log reading
    await prisma.triggerEvent.create({
      data: {
        triggerType: trigger.type as any,
        zone,
        value,
        threshold: trigger.threshold,
        source:    trigger.type.startsWith('HEAVY') || trigger.type.startsWith('EXTREME')
          ? 'Open-Meteo' : 'Mock',
        rawPayload: { value, unit: trigger.unit },
      },
    });

    if (value >= trigger.threshold) {
      logger.warn({ zone, trigger: trigger.type, value, threshold: trigger.threshold }, 'TRIGGER FIRED');
      await fireClaims(zone, trigger.type, value, trigger.threshold);
    }
  }
}

async function fireClaims(
  zone: string,
  triggerType: string,
  triggerValue: number,
  threshold: number,
) {
  // Find all active policies in the zone
  const activePolicies = await prisma.policy.findMany({
    where: {
      status: 'ACTIVE',
      worker: { zone },
    },
    select: { id: true },
  });

  logger.info({ zone, triggerType, count: activePolicies.length }, 'Firing claims for active policies');

  // Process in batches of 50 to avoid overwhelming the DB
  const batchSize = 50;
  for (let i = 0; i < activePolicies.length; i += batchSize) {
    const batch = activePolicies.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(p =>
        // Reuse auto-trigger logic (bypassing HTTP layer)
        import('./claimPipeline').then(m =>
          m.processTriggerClaim({ policyId: p.id, triggerType, triggerValue, threshold })
        )
      ),
    );
  }
}
