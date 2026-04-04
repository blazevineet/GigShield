import { useState } from 'react';
import { usePremiumPrediction } from '../hooks/useApi';
import styles from './pages.module.css';

const ZONES   = ['Velachery','Tambaram','Sholinganallur','Anna Nagar','Adyar','T. Nagar','Porur','Guindy'];
const TIERS   = [{id:'basic',name:'Basic Shield',base:29},{id:'standard',name:'Standard Shield',base:49},{id:'pro',name:'Pro Shield',base:79}];

export default function MLPricingPage() {
  const [zone,    setZone]    = useState('Velachery');
  const [tier,    setTier]    = useState('standard');
  const [hours,   setHours]   = useState(8);
  const [tenure,  setTenure]  = useState(4);
  const [monsoon, setMonsoon] = useState(true);
  const [run,     setRun]     = useState(false);

  const { data: mlData, isFetching } = usePremiumPrediction(
    { zone, tier, avg_hours: hours, tenure_months: tenure, is_monsoon: monsoon },
    run,
  );

  const selTier = TIERS.find(t => t.id === tier)!;
  const diff = mlData ? mlData.final_premium - selTier.base : 0;

  return (
    <div className={`${styles.page} anim-in`}>
      <h1 className={styles.pageTitle}>🤖 AI Premium Engine</h1>
      <p className={styles.pageSub}>XGBoost-style feature-weighted model · 5 hyper-local signals · ±25% dynamic adjustment + coverage hours</p>

      <div className={styles.g2}>
        {/* Inputs */}
        <div className={styles.card} style={{background:'linear-gradient(135deg,#0d1525,#0f1c2e)',border:'1px solid #1e3a5f'}}>
          <h3 className={styles.cardTitle}>Risk Parameters</h3>
          <div className={styles.fg}><label className={styles.fl}>Zone</label>
            <select className={styles.fi} value={zone} onChange={e=>{setZone(e.target.value);setRun(false);}}>
              {ZONES.map(z=><option key={z}>{z}</option>)}
            </select>
          </div>
          <div className={styles.g2}>
            <div className={styles.fg}><label className={styles.fl}>Tier</label>
              <select className={styles.fi} value={tier} onChange={e=>{setTier(e.target.value);setRun(false);}}>
                {TIERS.map(t=><option key={t.id} value={t.id}>{t.name} (₹{t.base})</option>)}
              </select>
            </div>
            <div className={styles.fg}><label className={styles.fl}>Monsoon</label>
              <select className={styles.fi} value={monsoon?'yes':'no'} onChange={e=>{setMonsoon(e.target.value==='yes');setRun(false);}}>
                <option value="yes">Yes — Active</option>
                <option value="no">No — Off-season</option>
              </select>
            </div>
          </div>
          <div className={styles.fg}><label className={styles.fl}>Daily Hours: <strong style={{color:'var(--amber)'}}>{hours}h</strong></label>
            <input type="range" min={2} max={14} value={hours} onChange={e=>{setHours(+e.target.value);setRun(false);}} />
          </div>
          <div className={styles.fg}><label className={styles.fl}>Tenure: <strong style={{color:'var(--amber)'}}>{tenure} months</strong></label>
            <input type="range" min={0} max={48} value={tenure} onChange={e=>{setTenure(+e.target.value);setRun(false);}} />
          </div>
          <button className={`${styles.btn} ${styles.btnAmber} ${styles.btnFull} ${styles.btnLg}`}
            onClick={()=>setRun(true)} disabled={isFetching}>
            {isFetching ? <><span className="spinning">⚙</span> Running ML model...</> : '▶ Run ML Model'}
          </button>
        </div>

        {/* Output */}
        <div className={styles.col}>
          <div className={styles.card} style={{background:'linear-gradient(135deg,#0f1e10,#0d1a1a)',border:'1px solid #1a3a25',textAlign:'center'}}>
            <div style={{fontSize:10,color:'var(--text3)',letterSpacing:2,textTransform:'uppercase',marginBottom:6}}>Weekly Premium</div>
            <div style={{fontFamily:'var(--head)',fontSize:72,fontWeight:800,color:'var(--amber)',lineHeight:1}} className={mlData?'glowing':''}>
              ₹{mlData?.final_premium ?? selTier.base}
            </div>
            <div style={{display:'inline-block',marginTop:10,padding:'4px 14px',borderRadius:20,fontSize:13,fontWeight:700,
              background:diff>0?'rgba(239,68,68,.15)':diff<0?'rgba(16,185,129,.15)':'rgba(255,255,255,.06)',
              color:diff>0?'var(--red)':diff<0?'var(--green)':'var(--text3)'}}>
              {mlData ? (diff>0?`+₹${diff} risk loading`:diff<0?`-₹${Math.abs(diff)} safe zone discount`:'Base rate') : 'Run model to compute'}
            </div>
            {mlData && <>
              <div style={{height:1,background:'var(--border)',margin:'14px 0'}} />
              <div style={{fontSize:10,color:'var(--text3)',letterSpacing:2,textTransform:'uppercase',marginBottom:6}}>Dynamic Coverage Hours</div>
              <div style={{fontFamily:'var(--head)',fontSize:40,fontWeight:800,color:'var(--cyan)',lineHeight:1}}>{mlData.coverage_hours}h</div>
              <div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>per day covered</div>
              {mlData.safe_bonus>0    && <div style={{fontSize:11,color:'var(--green)',marginTop:4}}>+{mlData.safe_bonus}h safe zone bonus</div>}
              {mlData.off_season_bonus>0 && <div style={{fontSize:11,color:'var(--green)'}}>+{mlData.off_season_bonus}h off-season bonus</div>}
              {mlData.tenure_bonus>0  && <div style={{fontSize:11,color:'var(--green)'}}>+{mlData.tenure_bonus}h tenure loyalty bonus</div>}
              <div style={{fontSize:12,color:'var(--text3)',marginTop:8,fontStyle:'italic'}}>{mlData.explanation}</div>
            </>}
          </div>

          {mlData && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Feature Weights</h3>
              {Object.entries(mlData.features).map(([k, f]: [string, any]) => (
                <div key={k} className={styles.featureRow}>
                  <div>
                    <div style={{fontSize:13,color:'var(--text2)'}}>{f.label}</div>
                    <div style={{fontSize:11,color:'var(--text3)'}}>weight: {(f.weight*100).toFixed(0)}%</div>
                  </div>
                  <div className={styles.featureRight}>
                    <div style={{width:56}}>
                      <div className={styles.pbar}><div className={styles.pfill} style={{width:`${f.value*100}%`,background:f.value>0.6?'var(--red)':f.value>0.3?'var(--amber)':'var(--green)'}} /></div>
                    </div>
                    <span className={styles.mono} style={{color:f.value>0.6?'var(--red)':f.value>0.3?'var(--amber)':'var(--green)',fontWeight:700}}>{f.value.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              <div style={{height:1,background:'var(--border)',margin:'12px 0'}} />
              <div className={styles.metaRow}><span className={styles.cMuted}>Risk Score</span><span className={`${styles.mono} ${styles.bold} ${styles.cAmber}`}>{mlData.risk_score.toFixed(4)}</span></div>
              <div className={styles.metaRow}><span className={styles.cMuted}>Multiplier</span><span className={`${styles.mono} ${styles.bold}`}>{mlData.multiplier}×</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
