import { useState, useEffect, useRef } from 'react';
import { usePolicies, useClaims, useCreateClaim } from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';
import { useQueryClient } from '@tanstack/react-query'; 
import styles from './pages.module.css';

// Fix for Index Signature error
const TRIGGER_DEFS = [
  { id: 1, name: 'Heavy Rainfall',     icon: '🌧️', threshold: 35,  warnAt: 25,  fmt: (v: number) => `${v.toFixed(1)} mm/hr` },
  { id: 2, name: 'Extreme Heat',        icon: '🌡️', threshold: 42,  warnAt: 38,  fmt: (v: number) => `${v.toFixed(1)}°C` },
  { id: 3, name: 'Flood Red Alert',     icon: '🌊', threshold: 1,   warnAt: 0.5, fmt: (v: number) => v >= 1 ? '🔴 RED ALERT' : '🟢 Clear' },
  { id: 4, name: 'Severe AQI',           icon: '😷', threshold: 400, warnAt: 300, fmt: (v: number) => `AQI ${Math.round(v)}` },
  { id: 5, name: 'Zone Order Collapse', icon: '📉', threshold: 60,  warnAt: 40,  fmt: (v: number) => `-${v.toFixed(0)}% orders` },
];

export default function WorkerDashboard() {
  const { user, clearSession: _clearSession } = useAuthStore(); 
  const queryClient = useQueryClient(); 
  
  const { data: policiesData } = usePolicies({ status: 'ACTIVE' }, { refetchInterval: 3000 });
  const { data: claimsData }   = useClaims(undefined, { refetchInterval: 3000 });
  const { mutate: autoPayout } = useCreateClaim();
  
  const [rain, setRain] = useState(18.4);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localSimClaims, setLocalSimClaims] = useState<any[]>([]);
  const hasTriggered = useRef(false); 

  const storageKey = `GS_SIM_CLAIMS_${user?.id || 'guest'}`;

  useEffect(() => {
    const sync = () => {
      const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setLocalSimClaims(data);
    };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('local-claims-updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('local-claims-updated', sync);
    };
  }, [storageKey]);

  useEffect(() => {
    const t = setInterval(() => {
      setRain(v => Math.max(0, v + (Math.random() - 0.38) * 3));
    }, 2500);
    return () => clearInterval(t);
  }, []);

  const activePolicy = policiesData?.data?.[0];
  const firing = rain >= 35;

  useEffect(() => {
    if (firing && activePolicy && !hasTriggered.current && !isProcessing) {
      hasTriggered.current = true; 
      setIsProcessing(true); 
      
      const newSimClaim = {
        id: `DEMO-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        policyId: activePolicy.id,
        triggerType: 'HEAVY_RAINFALL',
        triggerValue: parseFloat(rain.toFixed(2)),
        payoutAmount: 500,
        status: 'PAID',
        firedAt: new Date().toISOString(),
        isSimulated: true
      };

      autoPayout({
        policyId: activePolicy.id,
        triggerType: 'RAIN',
        triggerValue: parseFloat(rain.toFixed(2)),
        threshold: 35,
        mlMetadata: { is_anomaly: false, confidence: 0.98, severity: 1.2 } 
      }, {
        onSuccess: () => {
          const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
          localStorage.setItem(storageKey, JSON.stringify([newSimClaim, ...existing]));
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('local-claims-updated'));
          queryClient.invalidateQueries();
          setIsProcessing(false);
        },
        onError: (err: any) => {
          if (err?.response?.status !== 422) hasTriggered.current = false; 
          setIsProcessing(false);
        }
      });
    }

    if (!firing && rain < 25) {
      if (hasTriggered.current) hasTriggered.current = false; 
    }
  }, [firing, rain, activePolicy, autoPayout, queryClient, isProcessing, storageKey]); 

  const apiClaims = claimsData?.data || [];
  const allUserClaims = [...localSimClaims, ...apiClaims];
  
  const totalPaid = apiClaims.reduce((acc: number, c: any) => 
    acc + (['PAID', 'AUTO_APPROVED', 'SETTLED'].includes(c.status) ? (Number(c.payoutAmount) || 0) : 0), 0);

  const currentTrustScore = allUserClaims[0]?.mlMetadata?.confidence 
    ? `${(allUserClaims[0].mlMetadata.confidence * 100).toFixed(0)}%` 
    : '98%';

  // FIX: Added Record type to allow number indexing
  const liveVals: Record<number, number> = { 1: rain, 2: 33.1, 3: 0, 4: 112, 5: 18 };

  const handleSwitchToAdmin = () => {
    const url = `/login?forceLogout=true&t=${Date.now()}`;
    window.open(url, '_blank');
  };

  return (
    <div className={`${styles.page} anim-in`}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
           <h1 className={styles.pageTitle}>Welcome back, {user?.name || 'there'} 👋</h1>
           <p className={styles.pageSub}>
            {activePolicy
              ? `Shield Active · Protected in ${activePolicy.zone || 'Velachery'}` 
              : 'No active policy — complete onboarding to get covered'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={handleSwitchToAdmin}
              className="hover:scale-105 active:scale-95 transition-transform"
              style={{ padding: '10px 18px', background: '#ffab00', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', boxShadow: '0 4px 12px rgba(255, 171, 0, 0.2)' }}
            >
              🏛️ Open Insurer Portal
            </button>

            <div className="flex items-center gap-2 bg-[#1a2235] px-4 py-2 rounded-full border border-[#1c2840]">
               <span className={`h-2 w-2 rounded-full ${activePolicy ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
               <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                 {activePolicy ? 'AI Monitoring Active' : 'Offline'}
               </span>
            </div>
        </div>
      </header>

      {(firing || isProcessing) && activePolicy && (
        <div className={`${styles.alertBanner} ${styles.alertRed} pulsing-border`}>
          <span style={{ fontSize: 24 }}>🛡️</span>
          <div>
            <div className={styles.alertTitle}>{isProcessing ? "AI Analyzing Trigger..." : "AI Verified Protection!"}</div>
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
          <div className={styles.statSub}>Direct to UPI (Genuine)</div>
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
                {active ? <span className={`${styles.badge} ${styles.bRed} pulsing`}>● BREACHED</span> : warn ? <span className={`${styles.badge} ${styles.bAmber}`}>⚠ WARNING</span> : <span className={`${styles.badge} ${styles.bGreen}`}>✓ SAFE</span>}
              </div>
            );
          })}
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Shield Payout History</h3>
          {allUserClaims.length > 0 ? (
            <div className={styles.timeline}>
              {allUserClaims.sort((a,b) => {
                // FIX: Cast to any to avoid "arithmetic on type any" error
                const timeA = new Date(a.firedAt || a.createdAt).getTime();
                const timeB = new Date(b.firedAt || b.createdAt).getTime();
                return timeB - timeA;
              })
                .slice(0, 5).map((c: any) => {
                  const isPaid = ['PAID', 'AUTO_APPROVED', 'SETTLED'].includes(c.status);
                  const dateObj = new Date(c.firedAt || c.createdAt);
                  const displayTime = isNaN(dateObj.getTime()) 
                    ? "—" 
                    : dateObj.toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hour12: true });

                  return (
                    <div className={styles.tlItem} key={c.id}>
                      <div className={styles.tlDot} style={{ background: isPaid ? 'var(--green)' : 'var(--amber)' }} />
                      <div className="flex-1">
                        <div className={styles.tlTime}>
                          {displayTime} · {(c.triggerType || '').replace(/_/g, ' ')}
                          {(c.id?.startsWith('DEMO-') || c.isSimulated) && <span className="ml-2 text-amber-500 font-bold text-[9px] tracking-widest">[DEMO]</span>}
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