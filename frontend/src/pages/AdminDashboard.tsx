import { useAdminStats } from '../hooks/useApi';
import styles from './pages.module.css';

const FORECAST = [
  {day:'Thu 3 Apr',rain:'High',heat:'Low', risk:'High',col:'var(--red)'},
  {day:'Fri 4 Apr',rain:'High',heat:'Low', risk:'High',col:'var(--red)'},
  {day:'Sat 5 Apr',rain:'Med', heat:'Low', risk:'Med', col:'var(--amber)'},
  {day:'Sun 6 Apr',rain:'Low', heat:'Med', risk:'Low', col:'var(--green)'},
  {day:'Mon 7 Apr',rain:'Low', heat:'Low', risk:'Low', col:'var(--green)'},
  {day:'Tue 8 Apr',rain:'Low', heat:'High',risk:'Med', col:'var(--amber)'},
];

const HEAT_MOCK = [
  {zone:'Velachery',risk:82,claims:18,col:'var(--red)'},
  {zone:'Tambaram', risk:71,claims:12,col:'var(--red)'},
  {zone:'Sholinganallur',risk:60,claims:8,col:'var(--amber)'},
  {zone:'Porur',     risk:55,claims:6, col:'var(--amber)'},
  {zone:'Anna Nagar',risk:40,claims:4,col:'var(--green)'},
  {zone:'Adyar',     risk:30,claims:2, col:'var(--green)'},
];

export default function AdminDashboard() {
  const { data: statsData, isLoading } = useAdminStats();
  const stats = statsData?.data;

  // Phase 2: Dynamic calculation for risk exposure
  const riskExposure = (stats?.activePolicies || 0) * 1000;

  return (
    <div className={`${styles.page} anim-in`}>
      <h1 className={styles.pageTitle}>📊 Insurer Dashboard</h1>
      <p className={styles.pageSub}>Live analytics · Chennai region</p>

      <div className={styles.g4}>
        {[
          { label:'Active Policies',   value: isLoading?'…':stats?.activePolicies??'0',    color:'cGreen' },
          { label:'Risk Exposure',     value: isLoading?'…':`₹${(riskExposure/1000).toFixed(1)}K`, color:'cRed' },
          { label:'Weekly Premiums',   value: isLoading?'…':`₹${((stats?.weeklyPremiumPool||0)/1000).toFixed(1)}K`, color:'cAmber' },
          { label:'Loss Ratio',        value: isLoading?'…':`${stats?.lossRatio??'0'}%`,  color:'' },
        ].map(s => (
          <div className={styles.stat} key={s.label}>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={`${styles.statValue} ${s.color?styles[s.color as keyof typeof styles]:''}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className={styles.g2}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Zone Risk Heatmap</h3>
          {HEAT_MOCK.map(h => (
            <div className={styles.heatRow} key={h.zone}>
              <div className={styles.heatZone}>{h.zone}</div>
              <div style={{flex:1}}>
                <div className={styles.pbar}><div className={styles.pfill} style={{width:`${h.risk}%`,background:h.col}} /></div>
              </div>
              <span className={styles.mono} style={{color:h.col,width:90,textAlign:'right',fontWeight:700,fontSize:12}}>{h.risk}% · {h.claims}cl</span>
            </div>
          ))}
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Claims Queue</h3>
          {[
            {label:'Auto-Approved (BCS ≥ 0.70)', count:isLoading?'…':stats?.paidClaims??41,   col:'var(--green)', sub:'Zero human touch'},
            {label:'Soft Hold (BCS 0.50–0.69)',  count:isLoading?'…':stats?.heldClaims??5,    col:'var(--amber)', sub:'Pending validation'},
            {label:'Hard Hold — Manual Review',  count:2, col:'var(--red)',   sub:'Adjuster assigned'},
          ].map(q => (
            <div key={q.label} className={styles.queueRow}>
              <div>
                <div style={{fontSize:13,fontWeight:600}}>{q.label}</div>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{q.sub}</div>
              </div>
              <div style={{fontFamily:'var(--head)',fontSize:32,fontWeight:800,color:q.col}}>{q.count}</div>
            </div>
          ))}
          <div style={{height:1,background:'var(--border)',margin:'12px 0'}} />
          <div className={styles.metaRow}><span className={styles.cMuted}>Zero-touch rate</span><span className={`${styles.bold} ${styles.cGreen}`}>{stats?.zeroTouchRate??85}%</span></div>
          <div className={styles.metaRow}><span className={styles.cMuted}>Avg settlement time</span><span className={`${styles.bold} ${styles.cAmber}`}>2.8 seconds</span></div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>7-Day Disruption Forecast (Prophet Model)</h3>
        <div className={styles.g3}>
          {FORECAST.map(f => (
            <div className={styles.predCard} key={f.day}>
              <div className={styles.predDay}>{f.day}</div>
              <div style={{fontSize:12,color:'var(--text3)',marginBottom:8}}>🌧️ {f.rain} &nbsp; 🌡️ {f.heat}</div>
              <span className={styles.predBadge} style={{background:`${f.col}18`,color:f.col,border:`1px solid ${f.col}44`}}>{f.risk} Risk</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}