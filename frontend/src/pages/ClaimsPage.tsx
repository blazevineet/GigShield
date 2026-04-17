import { useState, useEffect, useCallback } from 'react';
import { useClaims } from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';
import styles from './pages.module.css';

const PIPE_STEPS = [
  { icon:'🌧️', title:'Trigger detected',        detail:'Open-Meteo: 42mm/hr > 35mm/hr' },
  { icon:'📍', title:'Worker location verified',  detail:'GPS stationary at zone boundary' },
  { icon:'🤖', title:'BCS fraud score computed',  detail:'Score: 0.98 · Threshold: 0.70 ✓' },
  { icon:'📋', title:'Claim auto-created',         detail:'2.3 seconds from trigger' },
  { icon:'💸', title:'₹500 dispatched via UPI',   detail:'Razorpay → arjun@blink' },
  { icon:'📱', title:'Worker notified via SMS',    detail:'No action needed' },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string,string]> = {
    PAID:['bGreen','✓ Paid'], PENDING:['bAmber','⏳ Pending'],
    AUTO_APPROVED:['bGreen','Auto Approved'], SOFT_HOLD:['bAmber','Soft Hold'],
    HARD_HOLD:['bRed','Hard Hold'], REJECTED:['bRed','Rejected'],
  };
  const [cls,label] = map[status]||['bMuted',status];
  return <span className={`${styles.badge} ${styles[cls as keyof typeof styles]}`}>{label}</span>;
}

export default function ClaimsPage() {
  const { user } = useAuthStore();
  const { data: claimsResponse } = useClaims(); 
  const [simulatedClaims, setSimulatedClaims] = useState<any[]>([]);
  const [phase, setPhase]   = useState<'idle'|'ramping'|'processing'|'done'>('idle');
  const [done,  setDone]    = useState(0);
  const [rain,  setRain]    = useState(18.4);

  const storageKey = `GS_SIM_CLAIMS_${user?.id || 'guest'}`;

  // --- Real-time Sync Logic ---
  const syncClaims = useCallback(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setSimulatedClaims(JSON.parse(saved));
      } catch (e) {
        setSimulatedClaims([]);
      }
    } else {
      setSimulatedClaims([]);
    }
  }, [storageKey]);

  useEffect(() => {
    syncClaims();
    window.addEventListener('storage', syncClaims);
    window.addEventListener('local-claims-updated', syncClaims);
    return () => {
      window.removeEventListener('storage', syncClaims);
      window.removeEventListener('local-claims-updated', syncClaims);
    };
  }, [syncClaims]);

  const clearSimulations = () => {
    localStorage.removeItem(storageKey);
    syncClaims(); 
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('local-claims-updated'));
  };

  // --- Data Merging ---
  const apiClaims = claimsResponse?.data || [];
  const allClaims = [...simulatedClaims, ...apiClaims];

  // --- Stats (Filtered to Real DB Data) ---
  const genuineTotal = apiClaims.length;
  const genuineApproved = apiClaims.filter((c:any) => ['PAID','AUTO_APPROVED'].includes(c.status)).length;
  const genuineSoftHold = apiClaims.filter((c:any) => c.status === 'SOFT_HOLD').length;
  const genuineHardHold = apiClaims.filter((c:any) => c.status === 'HARD_HOLD').length;

  // --- Demo Animation Logic ---
  const startDemo = () => {
    setPhase('ramping'); 
    setDone(0);
    let v = 18.4;
    const ramp = setInterval(() => {
      v = Math.min(v + 2.4, 42.8); 
      setRain(v);
      if (v >= 42.8) { 
        clearInterval(ramp); 
        startPipeline(); 
      }
    }, 150);
  };

  const startPipeline = () => {
    setPhase('processing');
    PIPE_STEPS.forEach((_,i) => setTimeout(() => setDone(i+1), i*850));
    
    setTimeout(() => {
      setPhase('done');
      const demoClaim = {
        id: `DEMO-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        triggerType: 'HEAVY_RAINFALL',
        payoutAmount: 500,
        bcsScore: 0.98,
        firedAt: new Date().toISOString(),
        status: 'PAID'
      };
      
      const current = JSON.parse(localStorage.getItem(storageKey) || '[]');
      localStorage.setItem(storageKey, JSON.stringify([demoClaim, ...current]));
      
      window.dispatchEvent(new Event('local-claims-updated'));
      window.dispatchEvent(new Event('storage'));
    }, PIPE_STEPS.length * 850 + 300);
  };

  const reset = () => { setPhase('idle'); setDone(0); setRain(18.4); };

  return (
    <div className={`${styles.page} anim-in`}>
      <h1 className={styles.pageTitle}>⚡ Claims & Zero-Touch UX</h1>
      <p className={styles.pageSub}>Automated parametric settlements powered by AI Fraud detection</p>

      <div className={styles.g4}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Total Claims</div>
          <div className={styles.statValue}>{genuineTotal + simulatedClaims.length}</div>
          <div className={styles.statSub}>{simulatedClaims.length} simulated</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Auto-Approved</div>
          <div className={`${styles.statValue} ${styles.cGreen}`}>{genuineApproved + simulatedClaims.length}</div>
          <div className={styles.statSub} style={{color:'var(--green)'}}>100% Reliability</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Soft Hold</div>
          <div className={`${styles.statValue} ${styles.cAmber}`}>{genuineSoftHold}</div>
          <div className={styles.statSub}>Requires GPS check</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Hard Hold</div>
          <div className={`${styles.statValue} ${styles.cRed}`}>{genuineHardHold}</div>
          <div className={styles.statSub}>Potential Fraud</div>
        </div>
      </div>

      <div className={styles.g2}>
        <div className={styles.phoneWrap}>
          <div className={styles.phone}>
            <div className={styles.phoneNotch} />
            <div className={styles.phoneScreen}>
              <div className={styles.phoneTitleBar}>
                <span className={styles.phoneAppName}>🛡️ GigShield</span>
                <span className={styles.phoneTime}>{new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
              </div>
              <div className={styles.phoneBody}>
                {phase==='idle' && (
                  <div>
                    <div className={styles.phoneHero}>
                      <div className={`${styles.phoneAmt} ${styles.cGreen}`}>₹1,000</div>
                      <div className={styles.phoneAmtLabel}>Active Protection</div>
                    </div>
                    <div className={styles.phoneMini}>
                      <div className={styles.phoneMiniRow}><span>🌧️ Rainfall</span><span className={styles.cGreen}>{rain.toFixed(1)} mm/hr</span></div>
                      <div className={styles.phoneMiniRow}><span>🛡️ Status</span><span className={`${styles.bold} ${styles.cGreen}`}>Protected</span></div>
                    </div>
                  </div>
                )}
                {phase==='ramping' && (
                  <div>
                    <div className={styles.phoneBanner} style={{background: rain > 35 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)'}}>
                      <div style={{fontWeight:700,fontSize:13,color: rain > 35 ? 'var(--red)' : 'var(--amber)'}}>
                        {rain > 35 ? '🚨 THRESHOLD BREACHED' : '🌧️ Monitoring Rain...'}
                      </div>
                    </div>
                    <div className={styles.phoneMini}>
                      <div style={{fontSize:32,fontWeight:800,color: rain > 35 ? 'var(--red)' : 'var(--amber)',textAlign:'center'}}>
                        {rain.toFixed(1)}<span style={{fontSize:14}}> mm</span>
                      </div>
                      <div className={styles.pbar} style={{marginTop:8}}>
                        <div className={styles.pfill} style={{width:`${Math.min(rain/50*100,100)}%`, background: rain > 35 ? 'var(--red)' : 'var(--amber)'}} />
                      </div>
                    </div>
                  </div>
                )}
                {phase==='processing' && (
                  <div>
                    <div className={styles.phoneProcessing}>
                      <span className="spinning" style={{fontSize:20,color:'var(--amber)'}}>⚙</span>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--amber)',marginTop:6}}>AI PIPELINE RUNNING</div>
                    </div>
                    <div className={styles.phoneMini}>
                      {PIPE_STEPS.slice(0, 4).map((s,i)=>(
                        <div className={styles.phoneMiniRow} key={i} style={{opacity: i <= done ? 1 : 0.4}}>
                          <span>{i < done ? '✅' : '○'}</span>
                          <span style={{fontSize:11}}>{s.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {phase==='done' && (
                  <div style={{animation:'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'}}>
                    <div className={styles.phonePayout}>
                      <div style={{fontSize:26}}>💰</div>
                      <div style={{fontFamily:'var(--head)',fontSize:38,fontWeight:800,color:'var(--green)',marginTop:4}}>₹500</div>
                      <div style={{fontSize:11,color:'var(--green)',fontWeight:700}}>INSTANT PAYOUT</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className={styles.phoneCtrls}>
            {phase==='idle' && <button className={`${styles.btn} ${styles.btnGreen} ${styles.btnFull}`} onClick={startDemo}>▶ Run Claims Demo</button>}
            {phase!=='idle' && <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnFull}`} onClick={reset}>↺ Reset Interface</button>}
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Auto-Claim Logic Node</h3>
          {PIPE_STEPS.map((s,i)=>(
            <div key={i} className={`${styles.pipeStep} ${done > i ? styles.pipeDone : done === i && phase === 'processing' ? styles.pipeActive : ''}`}>
              <div className={`${styles.pipeNum} ${done > i ? styles.pipeNumDone : done === i && phase === 'processing' ? styles.pipeNumActive : ''}`}>
                {done > i ? '✓' : i + 1}
              </div>
              <div style={{flex:1}}>
                <div className={styles.pipeTitle}>{s.icon} {s.title}</div>
                <div className={styles.pipeDetail}>{s.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.card} style={{marginTop: 20}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
          <h3 className={styles.cardTitle} style={{margin:0}}>Claims History Ledger</h3>
          {simulatedClaims.length > 0 && (
            <button onClick={clearSimulations} className={`${styles.btn} ${styles.btnSm} ${styles.btnRed}`} style={{fontSize:10, padding: '4px 10px'}}>
              🗑️ Clear Demo Data
            </button>
          )}
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.tbl}>
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Trigger Event</th>
                <th>Payout</th>
                <th>BCS AI Score</th>
                <th>Date & Time (IST)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allClaims
                .sort((a,b) => new Date(b.firedAt).getTime() - new Date(a.firedAt).getTime())
                .map((c:any) => {
                  const isSimulated = c.id.startsWith('DEMO-') || c.id.startsWith('SIM-');
                  
                  // Handle Date Parsing strictly to avoid "Invalid Date"
                  const rawDate = new Date(c.firedAt || c.createdAt);
                  const formattedDate = isNaN(rawDate.getTime()) 
                    ? '—' 
                    : rawDate.toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      });

                  return (
                    <tr key={c.id} className={isSimulated ? styles.simRow : ''}>
                      <td>
                        <span className={styles.mono} style={{fontSize:11, color: isSimulated ? 'var(--amber)' : 'inherit'}}>
                          {isSimulated ? '✨ ' : ''}{c.id.slice(0,12)}
                        </span>
                      </td>
                      <td style={{fontSize:12, textTransform: 'capitalize'}}>
                        {c.triggerType.toLowerCase().replace(/_/g,' ')}
                      </td>
                      <td className={styles.bold} style={{color: isSimulated ? 'var(--amber)' : 'var(--text)'}}>
                        ₹{c.payoutAmount}
                      </td>
                      <td>
                        <span className={styles.mono} style={{
                          color: c.bcsScore >= 0.8 ? 'var(--green)' : 'var(--amber)',
                          fontWeight: 700
                        }}>
                          {(c.bcsScore || 0.85).toFixed(2)}
                        </span>
                      </td>
                      <td className={styles.cMuted} style={{fontSize:11}}>
                        {formattedDate}
                      </td>
                      <td><StatusBadge status={c.status} /></td>
                    </tr>
                  );
                })}
              {allClaims.length === 0 && (
                <tr>
                  <td colSpan={6} style={{textAlign:'center', color:'var(--text3)', padding: 40}}>
                    No records found in the claims ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}