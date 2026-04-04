/**
 * GigShield — Login Page
 * Handles OTP-based authentication for Workers and Admins.
 */

import { useState } from 'react'; // Removed 'React' to fix TS6133
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../api/services';
import { useAuthStore } from '../store/authStore';
import styles from './Login.module.css';

// Import your User type to fix the Role error
import { User } from '../store/authStore'; 

type Step = 'phone' | 'otp';

export default function Login() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { setTokens, setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validates Indian mobile format: +91 followed by 10 digits starting with 6-9
    if (!phone.match(/^\+91[6-9]\d{9}$/)) {
      toast.error('Enter a valid Indian mobile number (+91XXXXXXXXXX)');
      return;
    }
    setLoading(true);
    try {
      await authApi.sendOtp({ phone });
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
      const { accessToken, refreshToken, user } = res.data;

      // FIX: Cast 'user' as 'User' to resolve the 'role' string incompatibility
      setTokens(accessToken, refreshToken);
      setUser(user as User); 

      toast.success(`Welcome back, ${user.name || 'Partner'}!`);
      
      // Redirect based on profile status
      navigate(user.hasProfile ? '/' : '/onboarding');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        {/* Brand Header */}
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
                // Removes spaces automatically for the regex check
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