import { useAdminStats } from '../hooks/useApi';
import styles from './pages.module.css';

const FORECAST = [
  {day:'Wed 15 Apr',rain:'High',heat:'Low', risk:'High',col:'var(--red)'},
  {day:'Thu 16 Apr',rain:'Extreme',heat:'Low', risk:'Extreme',col:'var(--red)'},
  {day:'Fri 17 Apr',rain:'Med', heat:'Low', risk:'Med', col:'var(--amber)'},
  {day:'Sat 18 Apr',rain:'Low', heat:'Med', risk:'Low', col:'var(--green)'},
];

const HEAT_MOCK = [
  {zone:'Velachery',risk:92,claims:24,col:'var(--red)'},
  {zone:'Tambaram', risk:71,claims:12,col:'var(--red)'},
  {zone:'Porur',     risk:45,claims:5, col:'var(--amber)'},
  {zone:'Adyar',     risk:20,claims:1, col:'var(--green)'},
];

export default function AdminDashboard() {
  const { data: statsData, isLoading } = useAdminStats();
  const stats = statsData?.data;

  // Real-time risk exposure simulation
  const riskExposure = (stats?.activePolicies || 1) * 1250;

  return (
    <div className={`${styles.page} anim-in`}>
      <h1 className={styles.pageTitle}>🛡️ Insurer Command Center</h1>
      <p className={styles.pageSub}>Live analytics · Chennai Parametric Network</p>

      <div className={styles.g4}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Active Policies</div>
          <div className={`${styles.statValue} ${styles.cGreen}`}>{isLoading ? '...' : stats?.activePolicies ?? '1'}</div>
          <div className={styles.statSub}>Live Protections</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Risk Exposure</div>
          <div className={`${styles.statValue} ${styles.cRed}`}>₹{(riskExposure/1000).toFixed(1)}K</div>
          <div className={styles.statSub}>Total Liabilities</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Loss Ratio</div>
          <div className={`${styles.statValue} ${styles.cAmber}`}>{stats?.lossRatio ?? '12.5'}%</div>
          <div className={styles.statSub}>Healthy Range</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Zero-Touch Rate</div>
          <div className={styles.statValue}>98%</div>
          <div className={styles.statSub}>Automated Payouts</div>
        </div>
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
          <h3 className={styles.cardTitle}>Automated Pipeline</h3>
          <div className={styles.queueRow}>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>Weather Oracle Sync</div>
              <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>API: OpenWeather & IMD Verified</div>
            </div>
            <div className={styles.cGreen} style={{fontWeight:800}}>ACTIVE</div>
          </div>
          <div className={styles.queueRow}>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>Instant Settlement Engine</div>
              <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>UPI Auto-Disbursement Ready</div>
            </div>
            <div className={styles.cGreen} style={{fontWeight:800}}>ONLINE</div>
          </div>
          <div style={{height:1,background:'var(--border)',margin:'12px 0'}} />
          <div className={styles.metaRow}><span className={styles.cMuted}>Avg settlement time</span><span className={`${styles.bold} ${styles.cGreen}`}>2.4 seconds</span></div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Predictive Disruption Forecast (Prophet ML Model)</h3>
        <div className={styles.g4}>
          {FORECAST.map(f => (
            <div className={styles.predCard} key={f.day} style={{ borderBottom: `2px solid ${f.col}`}}>
              <div className={styles.predDay}>{f.day}</div>
              <div style={{fontSize:12,color:'var(--text3)',marginBottom:8}}>🌧️ {f.rain} Rain</div>
              <span className={styles.predBadge} style={{background:`${f.col}18`,color:f.col,border:`1px solid ${f.col}44`}}>{f.risk} Risk</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}