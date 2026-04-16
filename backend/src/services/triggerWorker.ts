/**
 * GigShield — Phase 3 AI-Driven Trigger Worker
 * Polls data sources, validates via ML, and manages automated claim firing.
 */

import cron from 'node-cron';
import axios from 'axios';
import { prisma } from '../config/db';
import { logger } from '../config/logger';

// Updated URL to match your Python Service
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const TRIGGERS = [
  { type: 'HEAVY_RAINFALL', threshold: 35, unit: 'mm/hr' },
  { type: 'EXTREME_HEAT',   threshold: 42, unit: '°C'    },
  { type: 'SEVERE_AQI',     threshold: 400, unit: 'AQI'   },
  { type: 'ORDER_COLLAPSE', threshold: 60, unit: '%drop' },
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
    logger.info('🚀 Trigger worker: polling data sources and validating with ML...');
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

// ... fetchZoneReadings, fetchWeather, fetchMockAqi, fetchMockOrderDrop remain the same ...
// (Kept for brevity, use your existing implementations here)

async function fetchZoneReadings(zone: string, coords: { lat: number; lon: number }) {
  const [weatherRes, aqiData] = await Promise.allSettled([
    fetchWeather(coords.lat, coords.lon),
    fetchMockAqi(zone),
  ]);
  const weather = weatherRes.status === 'fulfilled' ? weatherRes.value : null;
  return {
    rainfall: weather?.precipitation ? weather.precipitation * 60 : 0,
    temp:     weather?.temperature ?? 30,
    aqi:      aqiData.status === 'fulfilled' ? aqiData.value : 100,
    orderDrop: fetchMockOrderDrop(zone),
  };
}

async function fetchWeather(lat: number, lon: number) {
  const url = `${process.env.OPEN_METEO_BASE_URL}/forecast`;
  const res = await axios.get(url, {
    params: {
      latitude: lat, longitude: lon,
      current: 'temperature_2m,precipitation,rain',
      timezone: 'Asia/Kolkata',
    },
    timeout: 8000,
  });
  return {
    temperature: res.data.current.temperature_2m,
    precipitation: res.data.current.precipitation,
    rain: res.data.current.rain,
  };
}

async function fetchMockAqi(zone: string): Promise<number> {
  const baseAqi: Record<string, number> = { Velachery: 120, Tambaram: 110, Guindy: 150 };
  return (baseAqi[zone] || 90) + Math.random() * 30;
}

function fetchMockOrderDrop(zone: string): number {
  return Math.random() * 25;
}

/**
 * Level Up: Now integrates ML validation before creating the TriggerEvent
 */
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
    if (value === undefined || value < trigger.threshold) continue;

    try {
      // --- STEP 1: ML Validation (Phase 3 Fraud/Risk Check) ---
      const mlRes = await axios.post(`${ML_SERVICE_URL}/risk/score`, {
        zone,
        trigger_type: trigger.type,
        value,
        threshold: trigger.threshold
      });

      const { risk_level, is_anomaly, alerts, confidence } = mlRes.data;

      // Log the event with ML metadata
      await prisma.triggerEvent.create({
        data: {
          triggerType: trigger.type as any,
          zone,
          value,
          threshold: trigger.threshold,
          source: trigger.type.startsWith('HEAVY') ? 'Open-Meteo' : 'Mock',
          // Store AI findings in rawPayload for dashboard visualization
          rawPayload: { 
            risk_level, 
            is_anomaly, 
            alerts, 
            confidence,
            unit: trigger.unit 
          },
        },
      });

      // --- STEP 2: Only Fire if ML gives the Green Light ---
      if (is_anomaly) {
        logger.warn({ zone, type: trigger.type, alerts }, 'ML BLOCKED TRIGGER: Anomaly detected');
        continue; // Don't fire claims for anomalies
      }

      if (risk_level === 'CRITICAL' || risk_level === 'HIGH') {
        logger.warn({ zone, risk_level, confidence }, '🔥 AI CONFIRMED DISRUPTION: Firing Claims');
        await fireClaims(zone, trigger.type, value, trigger.threshold, mlRes.data);
      }

    } catch (err) {
      logger.error({ zone, trigger: trigger.type }, 'ML Service unavailable during trigger evaluation');
      // Fallback: fire anyway if it's a major breach, or log for review
    }
  }
}

async function fireClaims(
  zone: string,
  triggerType: string,
  triggerValue: number,
  threshold: number,
  mlData: any
) {
  const activePolicies = await prisma.policy.findMany({
    where: { status: 'ACTIVE', worker: { zone } },
    select: { id: true },
  });

  const batchSize = 50;
  for (let i = 0; i < activePolicies.length; i += batchSize) {
    const batch = activePolicies.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(p =>
        import('./claimPipeline').then(m =>
          m.processTriggerClaim({ 
            policyId: p.id, 
            triggerType, 
            triggerValue, 
            threshold,
            // Pass the ML data down so the claim record stores the confidence/severity
            mlMetadata: mlData 
          })
        )
      )
    );
  }
}