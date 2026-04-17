import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore'; 
import styles from './pages.module.css';

// Added specific IDs for better logic mapping
const DEFS = [
  { id:1, name:'Heavy Rainfall',      icon:'🌧️', threshold:35,  warnAt:25,  src:'Open-Meteo', live:true,  fmt:(v:number)=>`${v.toFixed(1)} mm/hr` },
  { id:2, name:'Extreme Heat',         icon:'🌡️', threshold:42,  warnAt:38,  src:'Open-Meteo', live:true,  fmt:(v:number)=>`${v.toFixed(1)}°C` },
  { id:3, name:'Flood Red Alert',      icon:'🌊', threshold:1,   warnAt:0.5, src:'IMD Feed',   live:false, fmt:(v:number)=>v>=1?'🔴 RED ALERT':'🟢 Clear' },
  { id:4, name:'Severe AQI',           icon:'😷', threshold:400, warnAt:300, src:'CPCB API',   live:false, fmt:(v:number)=>`AQI ${Math.round(v)}` },
  { id:5, name:'Zone Order Collapse', icon:'📉', threshold:60,  warnAt:40,  src:'Platform',   live:false, fmt:(v:number)=>`-${v.toFixed(0)}% orders` },
  { id:6, name:'Curfew / Bandh',       icon:'🚫', threshold:1,   warnAt:0.5, src:'NLP Monitor',live:false, fmt:(v:number)=>v>=1?'⛔ Verified':'✅ Clear' },
];

const INITIAL_NLP = [
  { source: 'Twitter/X', text: "Section 144 rumored in T-Nagar area due to protests...", sentiment: 'Negative', risk: 'Medium' },
  { source: 'News API', text: "Official: Curfew imposed in North Chennai districts from 9PM.", sentiment: 'Alert', risk: 'High' },
  { source: 'Local Feed', text: "Traffic moving normally in Velachery; no disruption detected.", sentiment: 'Positive', risk: 'Low' },
];

type LogEntry = { ts: string; src: string; type: string; msg: string };

export default function TriggerMonitor() {
  const { user } = useAuthStore();
  const [vals, setVals] = useState<Record<number,number>>({1:18.4, 2:33.1, 3:0, 4:112, 5:18, 6:0});
  const [log, setLog] = useState<LogEntry[]>([]);
  const [fetching, setFetching] = useState(false);
  const [liveTemp, setLiveTemp] = useState<number|null>(null);
  const [nlpAlerts, setNlpAlerts] = useState(INITIAL_NLP);
  const [isScanning, setIsScanning] = useState(true);

  // Unified Storage Key
  const storageKey = `GS_SIM_CLAIMS_${user?.id || 'guest'}`;

  const addLog = useCallback((src:string, type:string, msg:string) => {
    const ts = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    setLog(l => [{ts,src,type,msg},...l].slice(0,50));
  }, []);

  // --- HELPER: Logic for injecting simulated claims ---
  const injectSimulatedClaim = useCallback((def: typeof DEFS[0]) => {
    // Standardize payout to 500 for Rain (matching your worker portal), 320 for others
    const amount = def.id === 1 ? 500 : 320;

    const newSimulatedClaim = {
      id: `DEMO-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, // Using DEMO prefix for consistency
      policyId: 'DEMO-POLICY-XYZ',
      triggerType: def.name.toUpperCase().replace(/ /g, '_'),
      triggerValue: (def.threshold * 1.15).toFixed(2),
      payoutAmount: amount,
      bcsScore: 0.95,
      firedAt: new Date().toISOString(), 
      createdAt: new Date().toISOString(), // Added for sorting fallback
      status: 'PAID',
      isSimulated: true // Flag for UI labels
    };

    try {
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      localStorage.setItem(storageKey, JSON.stringify([newSimulatedClaim, ...existing]));

      // Immediate UI Sync
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('local-claims-updated'));
    } catch (e) {
      console.error("Storage error", e);
    }
  }, [storageKey]);

  const fetchLive = useCallback(async () => {
    setFetching(true);
    addLog('SYSTEM','info','Polling Open-Meteo API for Chennai...');
    try {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=12.9784&longitude=80.2209&current=temperature_2m,precipitation,rain&timezone=Asia/Kolkata');
      const data = await res.json();
      const temp = data.current.temperature_2m;
      // Formula to estimate mm/hr from precip
      const rain = ((data.current.rain||0)+(data.current.precipitation||0)*0.5)*60;
      
      setLiveTemp(temp);
      setVals(v => ({...v, 1:Math.max(0,rain), 2:temp}));
      
      addLog('Open-Meteo','ok',`✓ temp=${temp}°C · rain≈${rain.toFixed(1)}mm/hr`);
      
      if (rain > 35) {
        addLog('TRIGGER','fire',`🚨 LIVE BREACH: Rainfall ${rain.toFixed(1)}mm > 35mm`);
        addLog('SYSTEM','info',`Real payout being processed by Backend...`);
      }
    } catch { 
      addLog('Open-Meteo','warn','⚠ API unreachable — using cached values'); 
    }
    setFetching(false);
  }, [addLog]);

  useEffect(() => {
    fetchLive();
    const t = setInterval(() => {
      // Simulate slight drift in AQI and Order numbers
      setVals(v => ({
        ...v, 
        4: Math.max(50, Math.min(450, v[4] + (Math.random() - .5) * 20)), 
        5: Math.max(0, Math.min(85, v[5] + (Math.random() - .5) * 6))
      }));
      setIsScanning(s => !s);
    }, 4000);
    return () => clearInterval(t);
  }, [fetchLive]);

  // --- MANUAL SIMULATION ---
  const simulate = (def: typeof DEFS[0]) => {
    const v = def.threshold * 1.18;
    setVals(prev => ({...prev, [def.id]: v}));
    addLog('SIMULATE','fire',`🎬 User-Triggered: ${def.name} [BREACHED]`);

    if (def.id === 6) {
      const discovery = { 
        source: 'POLICE DATA', 
        text: `🚨 VERIFIED: Local curfew confirmed. Automated settlements initiated for current zone.`, 
        sentiment: 'Critical', 
        risk: 'High' 
      };
      setNlpAlerts(prev => [discovery, ...prev.slice(0, 2)]);
    }
    
    // Core Simulation Logic
    injectSimulatedClaim(def);

    const amount = def.id === 1 ? 500 : 320;
    setTimeout(() => addLog('AUTO-CLAIM','info','AI Pipeline initiated · BCS computing...'), 600);
    setTimeout(() => addLog('AUTO-CLAIM','ok','Fraud Check: 0.98 Score · AUTO-APPROVED ✓'), 1600);
    setTimeout(() => addLog('UPI-PAYOUT','ok',`₹${amount} dispatched via Razorpay Node ✓`), 2600);
    
    // Reset the UI value after 10 seconds so the "Breach" state isn't permanent
    setTimeout(() => {
      setVals(prev => ({...prev, [def.id]: def.threshold * 0.45}));
      addLog('SYSTEM','info', `${def.name} returned to normal levels.`);
    }, 12000);
  };

  return (
    <div className={`${styles.page} anim-in`}>
      <h1 className={styles.pageTitle}>⚡ Parametric Trigger Monitor</h1>
      <p className={styles.pageSub}>Real-time weather node integration with AI-powered NLP sentiment analysis</p>

      <div className={styles.topBar}>
        <div className={styles.row}>
          <span className={`${styles.badge} ${styles.bGreen}`}>● Cloud Oracles Live</span>
          <span className={`${styles.badge} ${styles.bAmber}`}>● NLP Engine Listening</span>
          {liveTemp && <span className={`${styles.badge} ${styles.bBlue}`}>📍 Chennai: {liveTemp}°C</span>}
        </div>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={fetchLive} disabled={fetching}>
          {fetching ? '↻ Syncing...' : '↻ Refresh Oracle Data'}
        </button>
      </div>

      <div className={styles.trigGrid}>
        {DEFS.map(def => {
          const v = vals[def.id] ?? 0;
          const firing = v >= def.threshold;
          const warn = !firing && v >= def.warnAt;
          return (
            <div key={def.id} className={`${styles.trigCard} ${firing ? styles.trigFiring : warn ? styles.trigWarn : ''}`}>
              <div className={styles.trigCardStatus}>
                <span className={`${styles.liveDot} ${firing ? styles.dotRed : warn ? styles.dotAmber : styles.dotGreen}`} />
              </div>
              <div className={styles.trigCardIcon}>{def.icon}</div>
              <div className={styles.trigCardName}>{def.name}</div>
              <div className={styles.trigCardVal}>{def.fmt(v)}</div>
              <div className={styles.trigCardThresh}>Threshold: {def.fmt(def.threshold)}</div>
              <div className={styles.trigCardFooter}>
                <span className={`${styles.badge} ${def.live ? styles.badgeLive : styles.badgeMock}`}>
                  {def.live ? 'ORACLE' : 'MOCK'} · {def.src}
                </span>
                {firing ? <span className={`${styles.badge} ${styles.bRed}`}>BREACHED</span> : <span className={`${styles.badge} ${styles.bMuted}`}>NORMAL</span>}
              </div>
              {!firing && (
                <button 
                  className={`${styles.btn} ${styles.btnGhost} ${styles.btnFull} ${styles.btnSm}`} 
                  onClick={() => simulate(def)}
                  style={{marginTop: '12px', border: '1px solid rgba(255,255,255,0.1)'}}
                >
                  🎬 Simulate Breach
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.g2}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Oracle Pipeline & Settlement Feed</h3>
          <div className={styles.apiLog}>
            {log.map((e,i) => (
              <div className={styles.apiRow} key={i}>
                <span className={styles.apiTs}>{e.ts}</span>
                <span className={`${styles.apiSrc} ${styles[`src_${e.type}` as keyof typeof styles] || ''}`}>{e.src}</span>
                <span className={styles.apiMsg}>{e.msg}</span>
              </div>
            ))}
            {!log.length && <span className={styles.cMuted}>Connecting to external oracles...</span>}
          </div>
        </div>

        <div className={styles.card}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
            <h3 className={styles.cardTitle} style={{margin:0}}>🤖 NLP Context Analysis</h3>
            <span className={isScanning ? "spinning" : ""} style={{fontSize:12, opacity: isScanning ? 1 : 0.3}}>📡</span>
          </div>
          <div className={styles.apiLog}>
            {nlpAlerts.map((alert, i) => (
              <div key={i} style={{padding:'10px 0', borderBottom:'1px solid var(--border)'}}>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:4}}>
                  <span className={styles.bold} style={{color:'var(--amber)'}}>{alert.source}</span>
                  <span style={{color: alert.risk === 'High' ? 'var(--red)' : 'var(--amber)'}}>{alert.sentiment} Analysis</span>
                </div>
                <div style={{fontSize:12, lineHeight:1.4, opacity: 0.9}}>{alert.text}</div>
              </div>
            ))}
            <div style={{marginTop:12, fontSize:10, color:'var(--text3)', textAlign:'center'}}>
              {isScanning ? 'Monitoring local media & police frequencies...' : 'Scanning idle. No new anomalies detected.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}