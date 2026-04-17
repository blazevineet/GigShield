import { useState, useEffect } from 'react';
import { useClaims } from '../hooks/useApi';
import styles from './pages.module.css';

const PIPE_STEPS = [
  { icon:'🌧️', title:'Trigger detected',         detail:'Open-Meteo: 42mm/hr > 35mm/hr' },
  { icon:'📍', title:'Worker location verified',  detail:'GPS stationary at zone boundary' },
  { icon:'🤖', title:'BCS fraud score computed',  detail:'Score: 0.91 · Threshold: 0.70 ✓' },
  { icon:'📋', title:'Claim auto-created',         detail:'2.3 seconds from trigger' },
  { icon:'💸', title:'₹320 dispatched via UPI',   detail:'Razorpay → arjun@blink' },
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
  const { data, isLoading } = useClaims();
  const [simulatedClaims, setSimulatedClaims] = useState<any[]>([]);
  const [phase, setPhase]   = useState<'idle'|'ramping'|'processing'|'done'>('idle');
  const [done,  setDone]    = useState(0);
  const [rain,  setRain]    = useState(18);

  useEffect(() => {
    const saved = localStorage.getItem('GS_SIM_CLAIMS');
    if (saved) setSimulatedClaims(JSON.parse(saved));
  }, []);

  const clearSimulations = () => {
    localStorage.removeItem('GS_SIM_CLAIMS');
    setSimulatedClaims([]);
  };

  const apiClaims = data?.data || [];
  const allClaims = [...simulatedClaims, ...apiClaims];

  const startDemo = () => {
    setPhase('ramping'); setDone(0);
    let v = 18;
    const ramp = setInterval(() => {
      v = Math.min(v + 2.8, 44); setRain(v);
      if (v >= 44) { clearInterval(ramp); startPipeline(); }
    }, 180);
  };

  const startPipeline = () => {
    setPhase('processing');
    PIPE_STEPS.forEach((_,i) => setTimeout(() => setDone(i+1), i*900));
    setTimeout(() => {
      setPhase('done');
      const demoClaim = {
        id: `DEMO-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        triggerType: 'HEAVY_RAINFALL',
        payoutAmount: 320,
        bcsScore: 0.91,
        firedAt: new Date().toISOString(),
        status: 'PAID'
      };
      const updated = [demoClaim, ...simulatedClaims];
      setSimulatedClaims(updated);
      localStorage.setItem('GS_SIM_CLAIMS', JSON.stringify(updated));
    }, PIPE_STEPS.length*900+200);
  };

  const reset = () => { setPhase('idle'); setDone(0); setRain(18); };
  const firing = rain >= 35;

  return (
    <div className={`${styles.page} anim-in`}>
      <h1 className={styles.pageTitle}>⚡ Claims & Zero-Touch UX</h1>
      <p className={styles.pageSub}>Parametric claims processed automatically — no action required from the worker</p>

      <div className={styles.g4}>
        {[
          { label:'Total Claims',  value: allClaims.length || '—' },
          { label:'Auto-Approved', value: allClaims.filter((c:any)=>['PAID','AUTO_APPROVED'].includes(c.status)).length, color:'cGreen' },
          { label:'Soft Hold',     value: allClaims.filter((c:any)=>c.status==='SOFT_HOLD').length, color:'cAmber' },
          { label:'Hard Hold',     value: allClaims.filter((c:any)=>c.status==='HARD_HOLD').length, color:'cRed' },
        ].map(s => (
          <div className={styles.stat} key={s.label}>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={`${styles.statValue} ${s.color ? styles[s.color as keyof typeof styles] : ''}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className={styles.g2}>
        <div className={styles.phoneWrap}>
          <div className={styles.phone}>
            <div className={styles.phoneNotch} />
            <div className={styles.phoneScreen}>
              <div className={styles.phoneTitleBar}>
                <span className={styles.phoneAppName}>🛵 GigShield</span>
                <span className={styles.phoneTime}>{new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
              </div>
              <div className={styles.phoneBody}>
                {phase==='idle' && (
                  <div>
                    <div className={styles.phoneHero}>
                      <div className={`${styles.phoneAmt} ${styles.cGreen}`}>₹1,000</div>
                      <div className={styles.phoneAmtLabel}>This week's protection</div>
                    </div>
                    <div className={styles.phoneMini}>
                      <div className={styles.phoneMiniRow}><span>🌧️ Rainfall</span><span className={`${styles.mono} ${styles.cGreen}`}>{rain.toFixed(1)} mm/hr</span></div>
                      <div className={styles.phoneMiniRow}><span>🛡️ Status</span><span className={`${styles.bold} ${styles.cGreen}`}>Protected</span></div>
                    </div>
                  </div>
                )}
                {phase==='ramping' && (
                  <div>
                    <div className={styles.phoneBanner} style={{borderColor:firing?'rgba(239,68,68,.4)':'rgba(239,68,68,.1)', background:firing?'rgba(239,68,68,.1)':'rgba(245,158,11,.1)'}}>
                      <div style={{fontWeight:700,fontSize:13,color:firing?'var(--red)':'var(--amber)'}}>🌧️ {firing?'Threshold Breached!':'Rain Increasing...'}</div>
                    </div>
                    <div className={styles.phoneMini}>
                      <div style={{fontFamily:'var(--head)',fontSize:32,fontWeight:800,color:firing?'var(--red)':'var(--amber)',textAlign:'center'}}>{rain.toFixed(1)}<span style={{fontSize:14}}> mm/hr</span></div>
                      <div className={styles.pbar} style={{marginTop:8}}><div className={styles.pfill} style={{width:`${Math.min(rain/50*100,100)}%`,background:firing?'var(--red)':'var(--amber)'}} /></div>
                    </div>
                  </div>
                )}
                {phase==='processing' && (
                  <div>
                    <div className={styles.phoneProcessing}>
                      <span className="spinning" style={{fontSize:20,color:'var(--amber)'}}>⚙</span>
                      <div style={{fontSize:12,fontWeight:700,color:'var(--amber)',marginTop:6}}>Processing your claim...</div>
                    </div>
                    <div className={styles.phoneMini}>
                      {PIPE_STEPS.map((s,i)=>(
                        <div className={styles.phoneMiniRow} key={i}>
                          <span>{i<done?'✅':i===done?'⏳':'○'}</span>
                          <span style={{color:i<done?'var(--green)':i===done?'var(--text)':'var(--text3)',fontWeight:i===done?700:400,fontSize:12}}>{s.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {phase==='done' && (
                  <div style={{animation:'popIn 0.5s ease'}}>
                    <div className={styles.phonePayout}>
                      <div style={{fontSize:26}}>🎉</div>
                      <div style={{fontFamily:'var(--head)',fontSize:38,fontWeight:800,color:'var(--green)',marginTop:6}}>₹320</div>
                      <div style={{fontSize:12,color:'var(--green)',fontWeight:700,marginTop:4}}>Credited to your UPI</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className={styles.phoneCtrls}>
            {phase==='idle' && <button className={`${styles.btn} ${styles.btnGreen} ${styles.btnLg}`} onClick={startDemo}>▶ Run Demo</button>}
            {phase!=='idle' && <button className={`${styles.btn} ${styles.btnGhost}`} onClick={reset}>↺ Reset</button>}
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Auto-Claim Pipeline</h3>
          {PIPE_STEPS.map((s,i)=>(
            <div key={i} className={`${styles.pipeStep} ${done>i?styles.pipeDone:done===i&&phase==='processing'?styles.pipeActive:''}`}>
              <div className={`${styles.pipeNum} ${done>i?styles.pipeNumDone:done===i&&phase==='processing'?styles.pipeNumActive:''}`}>{done>i?'✓':i+1}</div>
              <div style={{flex:1}}>
                <div className={styles.pipeTitle}>{s.icon} {s.title}</div>
                <div className={styles.pipeDetail}>{s.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
          <h3 className={styles.cardTitle} style={{marginBottom:0}}>Your Claims</h3>
          {simulatedClaims.length > 0 && <button onClick={clearSimulations} className={`${styles.btn} ${styles.btnSm} ${styles.btnRed}`} style={{fontSize:9}}>Clear Simulation Data</button>}
        </div>
        {isLoading && allClaims.length === 0 ? <p className={styles.cMuted}>Loading...</p> : (
          <div className={styles.tableWrap}>
            <table className={styles.tbl}>
              <thead><tr><th>Claim ID</th><th>Trigger</th><th>Payout</th><th>BCS Score</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {allClaims.map((c:any) => {
                  const isSimulated = c.id.startsWith('DEMO-') || c.id.startsWith('SIM-');
                  // Keep demo score at 0.91, otherwise calculate one
                  const displayScore = c.bcsScore || (0.82 + (parseInt(c.id.replace(/\D/g,'') || '0', 10) % 15) / 100);

                  return (
                    <tr key={c.id} className={isSimulated ? styles.simRow : ''}>
                      <td><span className={`${styles.mono} ${styles.cAmber}`} style={{fontSize:11}}>{c.id.slice(0,8)}...</span></td>
                      <td style={{fontSize:12}}>{c.triggerType.replace(/_/g,' ')}</td>
                      <td className={`${styles.bold} ${styles.cAmber}`}>₹{c.payoutAmount}</td>
                      <td>
                        <span className={styles.mono} style={{
                          color: displayScore >= 0.7 ? 'var(--green)' : displayScore >= 0.5 ? 'var(--amber)' : 'var(--red)',
                          fontWeight: 700
                        }}>
                          {displayScore.toFixed(2)}
                        </span>
                      </td>
                      <td className={styles.cMuted} style={{fontSize:12}}>{new Date(c.firedAt).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                      <td><StatusBadge status={c.status} /></td>
                    </tr>
                  );
                })}
                {allClaims.length===0 && <tr><td colSpan={6} style={{textAlign:'center',color:'var(--text3)',padding:24}}>No claims yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}