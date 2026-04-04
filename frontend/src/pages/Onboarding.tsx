import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { mlApi, workerApi, policyApi } from '../api/services'; // Added policyApi
import { useAuthStore } from '../store/authStore';
import styles from './pages.module.css';

const STEPS   = ['Your Details', 'Choose Plan', 'Confirm'];
const ZONES   = ['Velachery','Tambaram','Sholinganallur','Anna Nagar','Adyar','T. Nagar','Porur','Guindy'];
const PLATFMS = ['Blinkit','Zepto','Swiggy Instamart','Amazon Flex','Zomato'];
const TIERS   = [
  { id:'basic',    name:'Basic Shield',    base:29, max:500,  desc:'Casual / part-time workers' },
  { id:'standard', name:'Standard Shield', base:49, max:1000, desc:'Regular full-time workers', popular:true },
  { id:'pro',      name:'Pro Shield',      base:79, max:2000, desc:'High-earning / high-risk zones' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { setUser, user } = useAuthStore();

  const [step,    setStep]    = useState(1);
  const [busy,    setBusy]    = useState(false);
  const [mlData,  setMlData]  = useState<any>(null);
  const [form, setForm] = useState({
    name:'', phone: user?.phone || '', aadhaar:'', platform:'', zone:'',
    hours:8, tenure:4, tier:'standard', upi:'',
  });

  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const tier = TIERS.find(t => t.id === form.tier)!;

  // --- PHASE 2: FRAUD DETECTION SIGNALS ---
  const getDeviceSignals = () => ({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenRes: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    isTrusted: true
  });

  const goStep3 = async () => {
    setBusy(true);
    try {
      const res = await mlApi.predictPremium({
        zone: form.zone, tier: form.tier,
        avg_hours: form.hours, tenure_months: form.tenure, is_monsoon: true,
      });
      setMlData(res.data);
      setStep(3);
    } catch {
      toast.error('Could not compute premium — using base rate');
      setMlData({ final_premium: tier.base, coverage_hours: 8, explanation: 'Base rate applied.' });
      setStep(3);
    } finally { setBusy(false); }
  };

const activate = async () => {
    setBusy(true);
    try {
      const fraudSignals = getDeviceSignals();

      // 1. Create Worker Profile
      await workerApi.createProfile({
        name: form.name, 
        platform: form.platform, 
        zone: form.zone,
        avgDailyHours: form.hours, 
        tenureMonths: form.tenure, 
        upiId: form.upi,
      });

      // 2. Create Policy with Phase 2 Data
      // We use 'as any' to bypass the 'PolicyCreatePayload' restriction
      await policyApi.create({
        tier: form.tier, 
        zone: form.zone, 
        platform: form.platform,
        avg_hours: form.hours, 
        tenure_months: form.tenure, 
        upi_id: form.upi,
        premium: mlData.final_premium, // Added for Phase 2
        device_metadata: fraudSignals  // Added for Phase 2
      } as any);

      setUser({ ...user!, name: form.name, hasProfile: true });
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Activation failed');
    } finally { setBusy(false); }
  };

  return (
    <div className={`${styles.page} ${styles.narrow} anim-in`}>
      <h1 className={styles.pageTitle}>Create Your Account</h1>
      <p className={styles.pageSub}>Income protection for delivery workers — 3 simple steps</p>

      <div className={styles.stepsBar}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className={styles.stepNode}>
              <div className={`${styles.stepCircle} ${step > i+1 ? styles.stepDone : step === i+1 ? styles.stepActive : ''}`}>
                {step > i+1 ? '✓' : i+1}
              </div>
              <span className={`${styles.stepLabel} ${step === i+1 ? styles.stepLabelActive : ''}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={styles.stepLine} />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className={`${styles.card} anim-in`}>
          <h3 className={styles.cardTitle}>Personal Information</h3>
          <div className={styles.fg}><label className={styles.fl}>Full Name</label>
            <input className={styles.fi} placeholder="e.g. Arjun Kumar" value={form.name} onChange={e => upd('name', e.target.value)} />
          </div>
          <div className={styles.g2}>
            <div className={styles.fg}><label className={styles.fl}>Mobile Number</label>
              <input className={styles.fi} placeholder="+91 98765 43210" value={form.phone} onChange={e => upd('phone', e.target.value)} />
            </div>
            <div className={styles.fg}><label className={styles.fl}>Aadhaar (last 4)</label>
              <input className={styles.fi} placeholder="XXXX" maxLength={4} value={form.aadhaar} onChange={e => upd('aadhaar', e.target.value)} />
            </div>
          </div>
          <div className={styles.g2}>
            <div className={styles.fg}><label className={styles.fl}>Platform</label>
              <select className={styles.fi} value={form.platform} onChange={e => upd('platform', e.target.value)}>
                <option value="">Select platform</option>
                {PLATFMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className={styles.fg}><label className={styles.fl}>Zone</label>
              <select className={styles.fi} value={form.zone} onChange={e => upd('zone', e.target.value)}>
                <option value="">Select zone</option>
                {ZONES.map(z => <option key={z}>{z}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.g2}>
            <div className={styles.fg}><label className={styles.fl}>Daily Hours: <strong style={{color:'var(--amber)'}}>{form.hours}h</strong></label>
              <input type="range" min={2} max={14} value={form.hours} onChange={e => upd('hours', +e.target.value)} />
            </div>
            <div className={styles.fg}><label className={styles.fl}>Tenure: <strong style={{color:'var(--amber)'}}>{form.tenure}mo</strong></label>
              <input type="range" min={0} max={48} value={form.tenure} onChange={e => upd('tenure', +e.target.value)} />
            </div>
          </div>
          <div className={styles.fg}><label className={styles.fl}>UPI ID</label>
            <input className={styles.fi} placeholder="yourname@upi" value={form.upi} onChange={e => upd('upi', e.target.value)} />
          </div>
          <button className={`${styles.btn} ${styles.btnAmber} ${styles.btnFull} ${styles.btnLg}`}
            onClick={() => setStep(2)} disabled={!form.name || !form.platform || !form.zone || !form.upi}>
            Continue →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="anim-in">
          <p className={styles.secLabel}>Select Your Weekly Plan</p>
          <div className={`${styles.g3} ${styles.mb3}`}>
            {TIERS.map(t => (
              <div key={t.id} className={`${styles.tierCard} ${form.tier === t.id ? styles.tierSel : ''} ${t.popular ? styles.tierPopular : ''}`}
                onClick={() => upd('tier', t.id)}>
                <div className={styles.tierName}>{t.name}</div>
                <div className={styles.tierPrice}>₹{t.base}<span className={styles.tierPer}>/wk</span></div>
                <div className={styles.tierCov}>Up to ₹{t.max} payout</div>
                <div className={styles.tierDesc}>{t.desc}</div>
              </div>
            ))}
          </div>
          <div className={`${styles.alertBanner} ${styles.alertAmber} ${styles.mb3}`}>
            <span>🤖</span>
            <div>Your final premium is computed by our AI model using zone flood risk, seasonal index, and tenure. Shown in next step.</div>
          </div>
          <div className={styles.btnRow}>
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStep(1)}>← Back</button>
            <button className={`${styles.btn} ${styles.btnAmber} ${styles.btnLg} ${styles.btnGrow}`} onClick={goStep3} disabled={busy}>
              {busy ? <><span className="spinning">⚙</span> Computing...</> : 'Calculate My Premium →'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && mlData && (
        <div className={`${styles.card} anim-in`}>
          <h3 className={styles.cardTitle}>Confirm & Activate Coverage</h3>
          <div className={styles.premiumHighlight}>
            <div className={styles.premiumLabel}>Your AI-Adjusted Weekly Premium</div>
            <div className={`${styles.premiumAmt} glowing`}>₹{mlData.final_premium}</div>
            <div className={styles.premiumSub}>Auto-deducted from your {form.platform} earnings</div>
          </div>
          <p style={{fontSize:12,color:'var(--text3)',marginBottom:8,fontStyle:'italic'}}>{mlData.explanation}</p>
          <table className={styles.confirmTable}>
            <tbody>
              {[['Name',form.name],['Platform',form.platform],['Zone',form.zone],
                ['Plan',tier.name],['Max Payout',`₹${tier.max}/week`],
                ['Coverage Hours',`${mlData.coverage_hours}h/day`],
                ['UPI ID',form.upi]].map(([k,v]) => (
                <tr key={k}><td className={styles.confirmKey}>{k}</td><td className={styles.confirmVal}>{v}</td></tr>
              ))}
            </tbody>
          </table>
          <div className={`${styles.alertBanner} ${styles.alertGreen} ${styles.mb3}`}>
            <span>🔒</span>
            <div style={{fontSize:12}}>Device signals collected only during active policy window for fraud validation. DPDPA 2023 compliant.</div>
          </div>
          <div className={styles.btnRow}>
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStep(2)}>← Back</button>
            <button className={`${styles.btn} ${styles.btnGreen} ${styles.btnLg} ${styles.btnGrow}`} onClick={activate} disabled={busy}>
              {busy ? <><span className="spinning">⚙</span> Activating...</> : '🛡️ Activate My Coverage'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}