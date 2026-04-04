// ── PolicyManagement.tsx ──────────────────────────────────

import { usePolicies } from '../hooks/useApi';
import styles from './pages.module.css';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    ACTIVE:    ['bGreen','● Active'], EXPIRING:['bAmber','⚠ Expiring'],
    EXPIRED:   ['bMuted','Expired'],  CANCELLED:['bRed','Cancelled'],
  };
  const [cls, label] = map[status] || ['bMuted', status];
  return <span className={`${styles.badge} ${styles[cls as keyof typeof styles]}`}>{label}</span>;
}

export default function PolicyManagement() {
  const { data, isLoading } = usePolicies();
  const policies = data?.data || [];

  return (
    <div className={`${styles.page} anim-in`}>
      <h1 className={styles.pageTitle}>Policy Management</h1>
      <p className={styles.pageSub}>Your weekly coverage policies</p>
      <div className={styles.g4}>
        {[
          { label:'Active Policies',    value: policies.filter((p:any)=>p.status==='ACTIVE').length, color:'cGreen' },
          { label:'Weekly Premium',     value:`₹${policies.find((p:any)=>p.status==='ACTIVE')?.finalPremium||'—'}`, color:'cAmber' },
          { label:'Max Payout',         value:`₹${policies.find((p:any)=>p.status==='ACTIVE')?.maxPayout||'—'}`, color:'' },
          { label:'Coverage Hours',     value:`${policies.find((p:any)=>p.status==='ACTIVE')?.coverageHours||'—'}h`, color:'cGreen' },
        ].map(s => (
          <div className={styles.stat} key={s.label}>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={`${styles.statValue} ${s.color ? styles[s.color as keyof typeof styles] : ''}`}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>All Policies</h3>
        {isLoading ? <p className={styles.cMuted}>Loading...</p> : (
          <div className={styles.tableWrap}>
            <table className={styles.tbl}>
              <thead><tr><th>Policy ID</th><th>Tier</th><th>Premium</th><th>Max Payout</th><th>Coverage Hours</th><th>Issued</th><th>Expires</th><th>Status</th></tr></thead>
              <tbody>
                {policies.map((p: any) => (
                  <tr key={p.id}>
                    <td><span className={`${styles.mono} ${styles.cAmber}`}>{p.id.slice(0,8)}...</span></td>
                    <td>{p.tier}</td>
                    <td className={`${styles.bold} ${styles.cAmber}`}>₹{p.finalPremium}/wk</td>
                    <td className={styles.cGreen}>₹{p.maxPayout}</td>
                    <td>{p.coverageHours}h/day</td>
                    <td className={styles.cMuted} style={{fontSize:12}}>{new Date(p.issuedAt).toLocaleDateString('en-IN')}</td>
                    <td className={styles.cMuted} style={{fontSize:12}}>{new Date(p.expiresAt).toLocaleDateString('en-IN')}</td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
                {policies.length === 0 && <tr><td colSpan={8} style={{textAlign:'center',color:'var(--text3)',padding:24}}>No policies found. Complete onboarding to create one.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
