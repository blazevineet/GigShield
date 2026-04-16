import { useState, useEffect, useRef } from 'react';
import { usePolicies, useClaims, useCreateClaim } from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';
import { useQueryClient } from '@tanstack/react-query'; 
import styles from './pages.module.css';
import { Claim } from '../api/services';

const TRIGGER_DEFS = [
  { id: 1, name: 'Heavy Rainfall',     icon: '🌧️', threshold: 35,  warnAt: 25,  fmt: (v: number) => `${v.toFixed(1)} mm/hr` },
  { id: 2, name: 'Extreme Heat',        icon: '🌡️', threshold: 42,  warnAt: 38,  fmt: (v: number) => `${v.toFixed(1)}°C` },
  { id: 3, name: 'Flood Red Alert',     icon: '🌊', threshold: 1,   warnAt: 0.5, fmt: (v: number) => v >= 1 ? '🔴 RED ALERT' : '🟢 Clear' },
  { id: 4, name: 'Severe AQI',           icon: '😷', threshold: 400, warnAt: 300, fmt: (v: number) => `AQI ${Math.round(v)}` },
  { id: 5, name: 'Zone Order Collapse', icon: '📉', threshold: 60,  warnAt: 40,  fmt: (v: number) => `-${v.toFixed(0)}% orders` },
];

export default function WorkerDashboard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient(); 
  
  // Fetch with polling to ensure the "Total Recovered" and "History" stay live
  // Add refetchInterval: 3000 (3 seconds) to keep the dashboard live
const { data: policiesData } = usePolicies({ status: 'ACTIVE' }, { refetchInterval: 3000 });
const { data: claimsData }   = useClaims(undefined, { refetchInterval: 3000 });
  const { mutate: autoPayout } = useCreateClaim();
  
  const [rain, setRain] = useState(18.4);
  const [isProcessing, setIsProcessing] = useState(false);
  const hasTriggered = useRef(false); 

  // 1. Weather Simulation Loop
  useEffect(() => {
    const t = setInterval(() => {
      setRain(v => Math.max(0, v + (Math.random() - 0.38) * 3));
    }, 2500);
    return () => clearInterval(t);
  }, []);

  const activePolicy = policiesData?.data?.[0];
  const firing = rain >= 35;

  // 2. Refined Trigger Logic (Fixes the 422 Validation Errors)
  useEffect(() => {
    if (firing && activePolicy && !hasTriggered.current && !isProcessing) {
      hasTriggered.current = true; 
      setIsProcessing(true); // Lock UI processing
      
      console.log("🛡️ AI Shield: Threshold breached. Processing payout...");

      autoPayout({
        policyId: activePolicy.id,
        triggerType: 'RAIN',
        triggerValue: parseFloat(rain.toFixed(2)),
        threshold: 35,
        mlMetadata: { is_anomaly: false, confidence: 0.98, severity: 1.2 } 
      }, {
        onSuccess: () => {
          console.log("✅ Claim Recorded Successfully");
          // Immediate cache invalidation to update Total Recovered and History
          queryClient.invalidateQueries();
          setIsProcessing(false);
        },
        onError: (err: any) => {
          console.error("❌ Backend rejected claim:", err.response?.data || err.message);
          // Only unlock for retries if it wasn't a duplicate (422)
          if (err?.response?.status !== 422) {
            hasTriggered.current = false; 
          }
          setIsProcessing(false);
        }
      });
    }

    // Reset lock only when rain falls below safe threshold
    if (!firing && rain < 25) {
      if (hasTriggered.current) {
        console.log("🌤️ Weather cleared. System re-armed.");
        hasTriggered.current = false; 
      }
    }
  }, [firing, rain, activePolicy?.id, autoPayout, queryClient, isProcessing]); 

  // 3. UI Calculations
  const totalPaid = claimsData?.data?.reduce((acc: number, c: Claim) => 
    acc + (['PAID', 'AUTO_APPROVED', 'SETTLED', 'PENDING'].includes(c.status) ? (Number(c.payoutAmount) || 0) : 0), 0) || 0;

  // Sync Trust Score between Banner and Stat Box
  const latestClaim = claimsData?.data?.[0];
  const confidenceValue = latestClaim?.mlMetadata?.confidence ?? latestClaim?.aiConfidence;
  const currentTrustScore = confidenceValue 
    ? `${(confidenceValue * 100).toFixed(0)}%` 
    : '98%';

  const liveVals: Record<number, number> = { 1: rain, 2: 33.1, 3: 0, 4: 112, 5: 18 };

  return (
    <div className={`${styles.page} anim-in`}>
      <header className="flex justify-between items-center mb-6">
        <div>
           <h1 className={styles.pageTitle}>Welcome back, {user?.name || 'there'} 👋</h1>
           <p className={styles.pageSub}>
            {activePolicy
              ? `Shield Active · Protected in ${activePolicy.zone || 'Velachery'}` 
              : 'No active policy — complete onboarding to get covered'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#1a2235] px-4 py-2 rounded-full border border-[#1c2840]">
           <span className={`h-2 w-2 rounded-full ${activePolicy ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
           <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
             {activePolicy ? 'AI Monitoring Active' : 'Offline'}
           </span>
        </div>
      </header>

      {(firing || isProcessing) && activePolicy && (
        <div className={`${styles.alertBanner} ${styles.alertRed} pulsing-border`}>
          <span style={{ fontSize: 24 }}>🛡️</span>
          <div>
            <div className={styles.alertTitle}>
              {isProcessing ? "AI Analyzing Trigger..." : "AI Verified Protection!"}
            </div>
            <div className={styles.alertBody}>
              Rain in <b>{activePolicy.zone}</b> hit {rain.toFixed(1)}mm/hr. AI Confidence: <b>{currentTrustScore}</b>. 
              {isProcessing ? " Verifying movements..." : ` Recovery sent to ${user?.upiId || 'UPI ID'}.`}
            </div>
          </div>
        </div>
      )}

      <div className={styles.g4}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Active Coverage</div>
          <div className={`${styles.statValue} ${styles.cAmber}`}>₹{activePolicy?.maxPayout?.toLocaleString() || '0'}</div>
          <div className={styles.statSub}>{activePolicy ? `${activePolicy.tier} Tier` : 'Inactive'}</div>
        </div>
        
        <div className={styles.stat}>
          <div className={styles.statLabel}>Daily Payout Cap</div>
          <div className={styles.statValue}>₹500</div>
          <div className={styles.statSub}>Per 8hr Shift</div>
        </div>

        <div className={styles.stat}>
          <div className={styles.statLabel}>Total Recovered</div>
          <div className={`${styles.statValue} ${totalPaid > 0 ? styles.cGreen : ''}`}>₹{totalPaid.toLocaleString()}</div>
          <div className={styles.statSub}>Direct to UPI</div>
        </div>

        <div className={styles.stat}>
          <div className={styles.statLabel}>AI Trust Score</div>
          <div className={`${styles.statValue} ${styles.cGreen}`}>{currentTrustScore}</div>
          <div className={styles.statSub}>Verified Movements</div>
        </div>
      </div>

      <div className={styles.g2}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Real-time Parametric Monitor</h3>
          <p className="text-[11px] text-slate-500 mb-4 uppercase">Watching weather in {activePolicy?.zone || 'assigned zone'}</p>
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
                  ? <span className={`${styles.badge} ${styles.bRed} pulsing`}>● BREACHED</span>
                  : warn
                  ? <span className={`${styles.badge} ${styles.bAmber}`}>⚠ WARNING</span>
                  : <span className={`${styles.badge} ${styles.bGreen}`}>✓ SAFE</span>}
              </div>
            );
          })}
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Shield Payout History</h3>
          {(claimsData?.data?.length ?? 0) > 0 ? (
            <div className={styles.timeline}>
              {claimsData?.data?.slice(0, 5).map((c: Claim) => {
                  const isPaid = ['PAID', 'AUTO_APPROVED', 'SETTLED'].includes(c.status);
                  const dateObj = new Date(c.firedAt || c.createdAt);
                  return (
                    <div className={styles.tlItem} key={c.id}>
                      <div className={styles.tlDot} style={{ background: isPaid ? 'var(--green)' : 'var(--amber)' }} />
                      <div className="flex-1">
                        <div className={styles.tlTime}>
                          {dateObj.toLocaleDateString()} at {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {c.triggerType}
                        </div>
                        <div className={styles.tlText}>
                          <b>₹{c.payoutAmount}</b> · 
                          <span className={isPaid ? styles.cGreen : styles.cAmber}> {c.status}</span>
                        </div>
                      </div>
                    </div>
                  );
              })}
            </div>
          ) : (
            <div className="py-10 text-center opacity-40">
              <p style={{ fontSize: 13 }}>No weather disruptions detected yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}