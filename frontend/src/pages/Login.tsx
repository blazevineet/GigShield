import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../api/services';
import { useAuthStore } from '../store/authStore';
import styles from './Login.module.css';
import { User } from '../store/authStore'; 

type Step = 'phone' | 'otp';

export default function Login() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { setTokens, setUser, clearSession, isLoggedIn } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // --- TAB ISOLATION LOGIC ---
  useEffect(() => {
    const isForceLogout = searchParams.get('forceLogout') === 'true';

    if (isForceLogout) {
      // 1. Wipe the sessionStorage for THIS tab only.
      // This ensures the new tab starts completely fresh.
      sessionStorage.removeItem('gigshield-auth');
      
      // 2. Clear the internal Zustand state (memory)
      clearSession();
      
      // 3. Clean up the URL
      navigate('/login', { replace: true });
      
      toast.success('Session reset for new portal');
    } else if (isLoggedIn) {
      // Auto-redirect if already logged in and NOT forcing a logout
      const user = useAuthStore.getState().user;
      if (user?.role === 'ADMIN' || user?.role === 'INSURER') {
        navigate('/admin');
      } else {
        navigate(user?.hasProfile ? '/' : '/onboarding');
      }
    }
  }, [searchParams, clearSession, navigate, isLoggedIn]);

const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Clean the input and handle auto-prefixing for Indian numbers
    let formattedPhone = phone.trim().replace(/\s/g, '');
    
    // If user enters exactly 10 digits, auto-prepend +91
    if (formattedPhone.length === 10 && /^\d+$/.test(formattedPhone)) {
      formattedPhone = `+91${formattedPhone}`;
    }

    // 2. Validate against the required format
    if (!formattedPhone.match(/^\+91[6-9]\d{9}$/)) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      // 3. Use the formatted phone for the API call
      await authApi.sendOtp({ phone: formattedPhone });
      
      // Update the local state so the OTP verification step has the correct number
      setPhone(formattedPhone);
      
      toast.success('OTP sent to your mobile');
      setStep('otp');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.verifyOtp({ phone, otp });
      let { accessToken, refreshToken, user } = res.data;

      // --- ADMIN BYPASS LOGIC ---
      // Hardcoded for demo purposes
      if (phone === '+919876543210') {
        user = { 
          ...user, 
          role: 'ADMIN', 
          name: 'Admin (Demo)' 
        };
      }

      setTokens(accessToken, refreshToken);
      setUser(user as User); 

      toast.success(`Welcome back, ${user.name || 'Partner'}!`);
      
      if (user.role === 'ADMIN' || user.role === 'INSURER') {
        navigate('/admin');
      } else {
        navigate(user.hasProfile ? '/' : '/onboarding');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.logo}>🛵</div>
          <h1 className={styles.title}>GigShield</h1>
          <p className={styles.sub}>Income protection for delivery workers</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp}>
            <div className={styles.fg}>
              <label className={styles.fl}>Mobile Number</label>
              <input
                className={styles.fi}
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\s/g, ''))}
                autoComplete="tel"
                autoFocus
              />
              <p className={styles.hint}>We'll send a 6-digit OTP to verify your number</p>
            </div>
            <button className={styles.btnPrimary} type="submit" disabled={loading}>
              {loading ? <span className="spinning">⚙️</span> : 'Send OTP →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div className={styles.phoneBadge}>
              <span>📱 {phone}</span>
              <button type="button" className={styles.changeBtn} onClick={() => setStep('phone')}>
                Change
              </button>
            </div>
            <div className={styles.fg}>
              <label className={styles.fl}>Enter OTP</label>
              <input
                className={`${styles.fi} ${styles.otpInput}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="• • • • • •"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
              <p className={styles.hint}>OTP expires in 5 minutes</p>
            </div>
            <button 
              className={styles.btnPrimary} 
              type="submit" 
              disabled={loading || otp.length !== 6}
            >
              {loading ? <span className="spinning">⚙️</span> : 'Verify & Sign In →'}
            </button>
            <button type="button" className={styles.btnText} onClick={handleSendOtp}>
              Resend OTP
            </button>
          </form>
        )}

        <p className={styles.legal}>
          By signing in, you agree to our Terms of Service and Privacy Policy.
          Data collected under DPDPA 2023.
        </p>
      </div>
    </div>
  );
}