import { useState, useEffect } from 'react';
import { usePolicies, useClaims } from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';
import styles from './pages.module.css';

const TRIGGER_DEFS = [
  { id: 1, name: 'Heavy Rainfall',      icon: '🌧️', threshold: 35,  warnAt: 25,  fmt: (v: number) => `${v.toFixed(1)} mm/hr` },
  { id: 2, name: 'Extreme Heat',        icon: '🌡️', threshold: 42,  warnAt: 38,  fmt: (v: number) => `${v.toFixed(1)}°C` },
  { id: 3, name: 'Flood Red Alert',     icon: '🌊', threshold: 1,   warnAt: 0.5, fmt: (v: number) => v >= 1 ? '🔴 RED ALERT' : '🟢 Clear' },
  { id: 4, name: 'Severe AQI',          icon: '😷', threshold: 400, warnAt: 300, fmt: (v: number) => `AQI ${Math.round(v)}` },
  { id: 5, name: 'Zone Order Collapse', icon: '📉', threshold: 60,  warnAt: 40,  fmt: (v: number) => `-${v.toFixed(0)}% orders` },
  { id: 6, name: 'Curfew / Bandh',      icon: '🚫', threshold: 1,   warnAt: 0.5, fmt: (v: number) => v >= 1 ? '⛔ Verified' : '✅ Clear' },
];

export default function WorkerDashboard() {
  const { user } = useAuthStore();
  const { data: policiesData } = usePolicies({ status: 'ACTIVE' });
  const { data: claimsData }   = useClaims();
  const [rain, setRain] = useState(18.4);

  useEffect(() => {
    const t = setInterval(() => setRain(v => Math.max(0, v + (Math.random() - 0.38) * 3)), 2200);
    return () => clearInterval(t);
  }, []);

  const activePolicy = policiesData?.data?.[0];
  const recentClaims = claimsData?.data?.slice(0, 3) || [];
  const firing = rain >= 35;
  const liveVals: Record<number, number> = { 1: rain, 2: 33.1, 3: 0, 4: 112, 5: 18, 6: 0 };

  return (
    <div className={`${styles.page} anim-in`}>
      <h1 className={styles.pageTitle}>Welcome back, {user?.name || 'there'} 👋</h1>
      <p className={styles.pageSub}>
        {activePolicy
          ? `Coverage active · ${activePolicy.worker?.zone} zone · ${activePolicy.worker?.platform}`
          : 'No active policy — complete onboarding to get covered'}
      </p>

      {firing && (
        <div className={`${styles.alertBanner} ${styles.alertRed}`}>
          <span style={{ fontSize: 20 }}>🌧️</span>
          <div>
            <div className={styles.alertTitle}>Heavy Rainfall Detected — {rain.toFixed(1)}mm/hr</div>
            <div className={styles.alertBody}>Threshold breached (35mm/hr). Claim is being auto-initiated — no action needed from you.</div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className={styles.g4}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>This Week's Cover</div>
          <div className={`${styles.statValue} ${styles.cAmber}`}>₹{activePolicy?.maxPayout?.toLocaleString() || '—'}</div>
          <div className={styles.statSub}>{activePolicy ? `${activePolicy.tier} · Active` : 'No active policy'}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Premium Paid</div>
          <div className={styles.statValue}>₹{activePolicy?.finalPremium || '—'}</div>
          <div className={styles.statSub}>AI-adjusted weekly</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Total Claims</div>
          <div className={styles.statValue}>{claimsData?.meta?.total ?? '—'}</div>
          <div className={styles.statSub}>All time</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Coverage Hours</div>
          <div className={`${styles.statValue} ${styles.cGreen}`}>{activePolicy?.coverageHours ?? '—'}h</div>
          <div className={styles.statSub}>Per day covered</div>
        </div>
      </div>

      <div className={styles.g2}>
        {/* Trigger monitor */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Live Disruption Monitor</h3>
          {TRIGGER_DEFS.map(def => {
            const v = liveVals[def.id] ?? 0;
            const active = v >= def.threshold;
            const warn   = !active && v >= def.warnAt;
            return (
              <div key={def.id} className={styles.trigRow}>
                <div className={styles.trigLeft}>
                  <span className={styles.trigIcon}>{def.icon}</span>
                  <div>
                    <div className={styles.trigName}>{def.name}</div>
                    <div className={styles.trigVal}>{def.fmt(v)}</div>
                  </div>
                </div>
                {active
                  ? <span className={`${styles.badge} ${styles.bRed} pulsing`}>● ACTIVE</span>
                  : warn
                  ? <span className={`${styles.badge} ${styles.bAmber}`}>⚠ WARN</span>
                  : <span className={`${styles.badge} ${styles.bGreen}`}>✓ Safe</span>}
              </div>
            );
          })}
        </div>

        <div className={styles.col}>
          {/* Policy coverage */}
          {activePolicy && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Weekly Coverage</h3>
              <div className={styles.covRow}>
                <span className={styles.cMuted}>Coverage period</span>
                <span className={styles.cAmber} style={{ fontWeight: 700 }}>
                  {new Date(activePolicy.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} →{' '}
                  {new Date(activePolicy.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <div className={styles.pbar}>
                <div className={styles.pfill} style={{
                  width: `${Math.min(((Date.now() - new Date(activePolicy.issuedAt).getTime()) /
                    (new Date(activePolicy.expiresAt).getTime() - new Date(activePolicy.issuedAt).getTime())) * 100, 100)}%`,
                  background: 'var(--amber)',
                }} />
              </div>
              <div className={styles.covDates}>
                <span>Tier: {activePolicy.tier}</span>
                <span>Max: ₹{activePolicy.maxPayout}</span>
              </div>
            </div>
          )}

          {/* Recent claims */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Recent Claims</h3>
            {recentClaims.length === 0 ? (
              <p style={{ color: 'var(--text3)', fontSize: 13 }}>No claims yet. Claims are auto-initiated when a trigger fires.</p>
            ) : (
              <div className={styles.timeline}>
                {recentClaims.map((c: any) => (
                  <div className={styles.tlItem} key={c.id}>
                    <div className={styles.tlDot} style={{
                      background: c.status === 'PAID' ? 'var(--green)' : c.status === 'PENDING' ? 'var(--amber)' : 'var(--text3)',
                    }} />
                    <div>
                      <div className={styles.tlTime}>{new Date(c.firedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      <div className={styles.tlText}>₹{c.payoutAmount} · {c.triggerType.replace(/_/g, ' ')} · <span style={{ color: c.status === 'PAID' ? 'var(--green)' : 'var(--amber)' }}>{c.status}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
