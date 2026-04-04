import { useState, useEffect, useCallback } from 'react';
import styles from './pages.module.css';

const DEFS = [
  { id:1, name:'Heavy Rainfall',      icon:'🌧️', threshold:35,  warnAt:25,  src:'Open-Meteo', live:true,  fmt:(v:number)=>`${v.toFixed(1)} mm/hr` },
  { id:2, name:'Extreme Heat',        icon:'🌡️', threshold:42,  warnAt:38,  src:'Open-Meteo', live:true,  fmt:(v:number)=>`${v.toFixed(1)}°C` },
  { id:3, name:'Flood Red Alert',     icon:'🌊', threshold:1,   warnAt:0.5, src:'IMD Feed',   live:false, fmt:(v:number)=>v>=1?'🔴 RED ALERT':'🟢 Clear' },
  { id:4, name:'Severe AQI',          icon:'😷', threshold:400, warnAt:300, src:'CPCB API',   live:false, fmt:(v:number)=>`AQI ${Math.round(v)}` },
  { id:5, name:'Zone Order Collapse', icon:'📉', threshold:60,  warnAt:40,  src:'Platform',   live:false, fmt:(v:number)=>`-${v.toFixed(0)}% orders` },
  { id:6, name:'Curfew / Bandh',      icon:'🚫', threshold:1,   warnAt:0.5, src:'NLP Monitor',live:false, fmt:(v:number)=>v>=1?'⛔ Verified':'✅ Clear' },
];

type LogEntry = { ts: string; src: string; type: string; msg: string };

export default function TriggerMonitor() {
  const [vals,     setVals]     = useState<Record<number,number>>({1:18.4,2:33.1,3:0,4:112,5:18,6:0});
  const [log,      setLog]      = useState<LogEntry[]>([]);
  const [fetching, setFetching] = useState(false);
  const [liveTemp, setLiveTemp] = useState<number|null>(null);

  const addLog = useCallback((src:string, type:string, msg:string) => {
    const ts = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    setLog(l => [{ts,src,type,msg},...l].slice(0,50));
  }, []);

  const fetchLive = useCallback(async () => {
    setFetching(true);
    addLog('SYSTEM','info','Polling Open-Meteo API for Chennai...');
    try {
      const res  = await fetch('https://api.open-meteo.com/v1/forecast?latitude=12.9784&longitude=80.2209&current=temperature_2m,precipitation,rain&timezone=Asia/Kolkata');
      const data = await res.json();
      const temp = data.current.temperature_2m;
      const rain = ((data.current.rain||0)+(data.current.precipitation||0)*0.5)*60;
      setLiveTemp(temp);
      setVals(v => ({...v, 1:Math.max(0,rain), 2:temp}));
      addLog('Open-Meteo','ok',`✓ temp=${temp}°C · precip=${data.current.precipitation}mm · rain≈${rain.toFixed(2)}mm/hr`);
      if (rain>35) addLog('TRIGGER','fire',`🚨 FIRED: Rainfall ${rain.toFixed(1)}mm/hr > 35mm/hr`);
      if (temp>42) addLog('TRIGGER','fire',`🚨 FIRED: Heat ${temp}°C > 42°C`);
    } catch { addLog('Open-Meteo','warn','⚠ API unreachable — using cached values'); }
    setFetching(false);
  }, [addLog]);

  useEffect(() => {
    fetchLive();
    const t = setInterval(() => {
      setVals(v => ({...v, 4:Math.max(50,Math.min(450,v[4]+(Math.random()-.5)*20)), 5:Math.max(0,Math.min(85,v[5]+(Math.random()-.5)*6))}));
      if (Math.random()<.12) addLog('CPCB-API','ok',`AQI update: ${Math.round(80+Math.random()*80)}`);
      if (Math.random()<.10) addLog('Platform','ok',`Order volume: ${Math.round(70+Math.random()*30)}% of baseline`);
      if (Math.random()<.05) addLog('NLP-Monitor','info','Scanned 1,240 posts · 0 curfew keywords');
    }, 3200);
    return () => clearInterval(t);
  }, [fetchLive, addLog]);

  const simulate = (def: typeof DEFS[0]) => {
    const v = def.threshold*1.18;
    setVals(prev => ({...prev,[def.id]:v}));
    addLog('SIMULATE','fire',`🎬 ${def.name} → ${def.fmt(v)} [BREACHED]`);
    setTimeout(()=>addLog('AUTO-CLAIM','ok','Pipeline initiated · BCS computing...'),800);
    setTimeout(()=>addLog('AUTO-CLAIM','ok','BCS = 0.91 · AUTO-APPROVED ✓'),1800);
    setTimeout(()=>addLog('UPI-PAYOUT','ok','₹320 dispatched · Razorpay → arjun@blink ✓'),2800);
    setTimeout(()=>setVals(prev=>({...prev,[def.id]:def.threshold*0.55})),8000);
  };

  return (
    <div className={`${styles.page} anim-in`}>
      <h1 className={styles.pageTitle}>⚡ Parametric Trigger Monitor</h1>
      <p className={styles.pageSub}>2 live weather APIs · 4 mock feeds · auto-claim on threshold breach</p>

      <div className={styles.topBar}>
        <div className={styles.row}>
          <span className={`${styles.badge} ${styles.bGreen}`}>● Open-Meteo Live</span>
          <span className={`${styles.badge} ${styles.bBlue}`}>4 Mock APIs</span>
          {liveTemp && <span className={`${styles.badge} ${styles.bAmber}`}>📍 Chennai {liveTemp}°C</span>}
        </div>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={fetchLive} disabled={fetching}>
          {fetching ? <><span className="spinning">↻</span> Fetching...</> : '↻ Refresh Live Data'}
        </button>
      </div>

      <div className={styles.trigGrid}>
        {DEFS.map(def => {
          const v      = vals[def.id]??0;
          const firing = v>=def.threshold;
          const warn   = !firing && v>=def.warnAt;
          return (
            <div key={def.id} className={`${styles.trigCard} ${firing?styles.trigFiring:warn?styles.trigWarn:''}`}>
              <div className={styles.trigCardStatus}>
                <span className={`${styles.liveDot} ${firing?styles.dotRed:warn?styles.dotAmber:styles.dotGreen}`} />
              </div>
              <div className={styles.trigCardIcon}>{def.icon}</div>
              <div className={styles.trigCardName}>{def.name}</div>
              <div className={styles.trigCardVal}>{def.fmt(v)}</div>
              <div className={styles.trigCardThresh}>Threshold: {def.fmt(def.threshold)}</div>
              <div className={styles.trigCardFooter}>
                <span className={`${styles.badge} ${def.live?styles.badgeLive:styles.badgeMock}`}>{def.live?'LIVE':'MOCK'} · {def.src}</span>
                {firing?<span className={`${styles.badge} ${styles.bRed}`}>FIRING</span>:warn?<span className={`${styles.badge} ${styles.bAmber}`}>WARN</span>:<span className={`${styles.badge} ${styles.bMuted}`}>OK</span>}
              </div>
              {!firing && <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnFull} ${styles.btnSm}`} onClick={()=>simulate(def)}>🎬 Simulate Trigger</button>}
            </div>
          );
        })}
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Live API Feed</h3>
        <div className={styles.apiLog}>
          {log.map((e,i)=>(
            <div className={styles.apiRow} key={i}>
              <span className={styles.apiTs}>{e.ts}</span>
              <span className={`${styles.apiSrc} ${styles[`src_${e.type}` as keyof typeof styles]}`}>{e.src}</span>
              <span className={styles.apiMsg}>{e.msg}</span>
            </div>
          ))}
          {!log.length && <span className={styles.cMuted}>Waiting for API responses...</span>}
        </div>
      </div>
    </div>
  );
}
