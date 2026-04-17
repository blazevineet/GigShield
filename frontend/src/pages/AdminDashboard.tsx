import { useState, useEffect, useMemo } from 'react';
import { usePolicies, useClaims } from '../hooks/useApi'; // Removed useAdminStats
import styles from './pages.module.css';

const FORECAST = [
  { day: 'Wed 15 Apr', rain: 'High', heat: 'Low', risk: 'High', col: 'var(--red)' },
  { day: 'Thu 16 Apr', rain: 'Extreme', heat: 'Low', risk: 'Extreme', col: 'var(--red)' },
  { day: 'Fri 17 Apr', rain: 'Med', heat: 'Low', risk: 'Med', col: 'var(--amber)' },
  { day: 'Sat 18 Apr', rain: 'Low', heat: 'Med', risk: 'Low', col: 'var(--green)' },
];

// Demo Configuration
const DEMO_BASELINE_POLICIES = 85; 

export default function AdminDashboard() {
  // REMOVED: useAdminStats and statsLoading as they were unused due to our new logic
  const { data: policiesData, isLoading: policiesLoading } = usePolicies(); 
  const { data: claimsData } = useClaims();     
  
  // REMOVED: useAuthStore/user as it was not being used in the component body
  const [localClaimsCount, setLocalClaimsCount] = useState(0);

  // --- Real-time Sync of Simulated Claims ---
  useEffect(() => {
    const sync = () => {
      let globalSimCount = 0;
      const storageKeyPrefix = 'GS_SIM_CLAIMS_';
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(storageKeyPrefix)) {
          try {
            const claims = JSON.parse(localStorage.getItem(key) || '[]');
            globalSimCount += claims.length;
          } catch (e) { console.error("Sync error", e); }
        }
      }
      setLocalClaimsCount(globalSimCount);
    };

    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('local-claims-updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('local-claims-updated', sync);
    };
  }, []);

  // --- Data Extraction ---
  const realPolicies = policiesData?.data || [];
  const realClaims = claimsData?.data || [];

  // --- Dynamic Zone Calculation ---
  const zonesData = useMemo(() => {
    const zones: Record<string, { name: string; policies: number; claims: number }> = {
      "Chennai Central": { name: "Chennai Central Hub", policies: 35, claims: 2 } // Mock baseline for variety
    };

    realPolicies.forEach((p: any) => {
      const zName = p.zone || "Chennai Hub";
      if (!zones[zName]) zones[zName] = { name: zName, policies: 0, claims: 0 };
      zones[zName].policies += 1;
    });

    realClaims.forEach((c: any) => {
      const zName = c.zone || "Chennai Hub";
      if (zones[zName]) zones[zName].claims += 1;
    });

    return Object.values(zones);
  }, [realPolicies, realClaims]);

  // --- Master Calculations ---
  const displayPoliciesCount = realPolicies.length + DEMO_BASELINE_POLICIES;
  const displayClaimsCount = realClaims.length + localClaimsCount;
  const displayExposure = displayPoliciesCount * 1250;
  
  // Loss Ratio Calculation
  const currentLossRatio = displayPoliciesCount > 0 
    ? (displayClaimsCount / (displayPoliciesCount * 0.45)) * 100 
    : 0;

  const handleSwitchToWorker = () => {
    window.open(`/login?forceLogout=true&t=${Date.now()}`, '_blank');
  };

  return (
    <div className={`${styles.page} anim-in`}>
      <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className={styles.pageTitle}>🏛️ Insurer Command Center</h1>
          <p className={styles.pageSub}>Real-time Solvency & Multi-Zone Risk Exposure</p>
        </div>
        
        <button className={styles.btn} onClick={handleSwitchToWorker} style={{ fontSize: '11px' }}>
          <span>🛵</span> Switch to Worker Portal
        </button>
      </header>

      <div className={styles.g4}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Active Policies (Live)</div>
          <div className={`${styles.statValue} ${styles.cGreen}`}>
            {policiesLoading ? '...' : displayPoliciesCount}
          </div>
          <div className={styles.statSub}>{realPolicies.length} Real | {DEMO_BASELINE_POLICIES} Demo</div>
        </div>
        
        <div className={styles.stat}>
          <div className={styles.statLabel}>Total Risk Exposure</div>
          <div className={`${styles.statValue} ${styles.cRed}`}>₹{(displayExposure / 100000).toFixed(2)}L</div>
          <div className={styles.statSub}>Projected Liability Cap</div>
        </div>

        <div className={styles.stat}>
          <div className={styles.statLabel}>Current Loss Ratio</div>
          <div className={`${styles.statValue} ${currentLossRatio > 60 ? styles.cRed : styles.cAmber}`}>
            {currentLossRatio.toFixed(1)}%
          </div>
          <div className={styles.statSub}>
            {localClaimsCount > 0 ? `Alert: ${localClaimsCount} new demo claims` : 'Optimal solvency range'}
          </div>
        </div>

        <div className={styles.stat}>
          <div className={styles.statLabel}>Active Risk Capital</div>
          <div className={styles.statValue}>₹48.2L</div>
          <div className={styles.statSub} style={{ color: 'var(--green)' }}>Solvency: 1.42x ✓</div>
        </div>
      </div>

      <div className={styles.g2}>
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <h3 className={styles.cardTitle} style={{ margin: 0 }}>Geographical Risk Exposure</h3>
            <span className={styles.badge} style={{ fontSize: 10, background: 'var(--red)', fontWeight: 800 }}>LIVE CLUSTER MAP</span>
          </div>
          
          <div style={{
            height: 180,
            background: `linear-gradient(rgba(10,11,14,0.8), rgba(10,11,14,0.95)), url('https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/80.2,13.0,10/400x200?access_token=mock') center/cover`,
            borderRadius: 12,
            marginBottom: 20,
            position: 'relative',
            border: '1px solid var(--border)',
            overflow: 'hidden'
          }}>
            <div className="pulse" style={{ position: 'absolute', top: '40%', left: '45%', width: 60, height: 60, background: 'var(--red)', filter: 'blur(25px)', opacity: 0.4 }} />
            <div className="pulse" style={{ position: 'absolute', top: '60%', left: '30%', width: 40, height: 40, background: 'var(--amber)', filter: 'blur(20px)', opacity: 0.3 }} />
            
            <div style={{ position: 'absolute', top: 15, right: 15, textAlign: 'right', background: 'rgba(0,0,0,0.5)', padding: '8px', borderRadius: '6px' }}>
              <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 800 }}>● {displayPoliciesCount} NODES ACTIVE</div>
              <div style={{ fontSize: 10, color: 'var(--red)', fontWeight: 800 }}>● {displayClaimsCount} TOTAL SETTLEMENTS</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {zonesData.map((zone, idx) => {
              const ratio = zone.policies > 0 ? (zone.claims / zone.policies) * 100 : 0;
              return (
                <div className={styles.heatRow} key={idx}>
                  <div className={styles.heatZone} style={{ fontSize: '11px', width: '120px' }}>{zone.name}</div>
                  <div style={{ flex: 1 }}>
                    <div className={styles.pbar}>
                      <div className={styles.pfill} style={{ width: `${Math.min(ratio, 100)}%`, background: ratio > 50 ? 'var(--red)' : 'var(--green)' }} />
                    </div>
                  </div>
                  <span className={styles.mono} style={{ color: 'var(--text)', width: 80, textAlign: 'right', fontWeight: 700, fontSize: 11 }}>
                    {ratio.toFixed(1)}% Loss
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Infrastructure Integrity</h3>
          {[
            { label: 'Database Integrity', sub: 'PostgreSQL Vector Cluster', status: 'STABLE' },
            { label: 'Parametric Oracles', sub: 'Open-Meteo & IMD Nodes', status: 'ACTIVE' },
            { label: 'Settlement Engine', sub: 'Razorpay Smart Payouts', status: 'ONLINE' },
            { label: 'ML Anomaly Detection', sub: 'BCS Fraud Score 0.98', status: 'SAFE' }
          ].map((item, idx) => (
            <div className={styles.queueRow} key={idx}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{item.sub}</div>
              </div>
              <div className={styles.cGreen} style={{ fontWeight: 800, fontSize: 11 }}>{item.status}</div>
            </div>
          ))}
        </div>
      </div>

      <section style={{ marginTop: '10px' }}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>AI Predictive Risk Forecast</h3>
          <div className={styles.g4}>
            {FORECAST.map(f => (
              <div className={styles.predCard} key={f.day} style={{ borderBottom: `3px solid ${f.col}` }}>
                <div className={styles.predDay}>{f.day}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>Precipitation: {f.rain}</div>
                <span className={styles.badge} 
                      style={{ background: `${f.col}18`, color: f.col, border: `1px solid ${f.col}44`, fontSize: '10px', padding: '2px 8px' }}>
                  {f.risk} Risk
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}