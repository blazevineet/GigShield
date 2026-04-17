import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import styles from './Layout.module.css';

const WORKER_NAV = [
  { path: '/',         label: 'Dashboard',       icon: '🏠' },
  { path: '/onboarding',label: 'Onboarding',      icon: '📋' },
  { path: '/policies',  label: 'My Policy',        icon: '🛡️' },
  { path: '/claims',    label: 'Claims',           icon: '⚡' },
  { path: '/pricing',   label: 'Premium Engine',   icon: '🤖' },
  { path: '/triggers',  label: 'Trigger Monitor',  icon: '📡' },
];
const ADMIN_NAV = [
  { path: '/admin',     label: 'Overview',         icon: '📊' },
  { path: '/policies',  label: 'All Policies',     icon: '🛡️' },
  { path: '/claims',    label: 'Claims Queue',     icon: '⚡' },
  { path: '/pricing',   label: 'Pricing Engine',   icon: '🤖' },
  { path: '/triggers',  label: 'Live Triggers',    icon: '📡' },
];

export default function Layout() {
  const { user, logout }  = useAuthStore();
  const location          = useLocation();
  const navigate          = useNavigate();
  const isAdmin           = user?.role === 'ADMIN' || user?.role === 'INSURER';
  const nav               = isAdmin ? ADMIN_NAV : WORKER_NAV;

  const handleLogout = async () => {
    try { 
      // 1. Optional Backend Logout
      await fetch('/api/v1/auth/logout', { method: 'POST' }); 
    } catch (err) {
      console.warn("Backend logout failed, proceeding with local clear.");
    } finally {
      // 2. Clear this tab's specific session storage
      sessionStorage.removeItem('gigshield-auth');
      
      // 3. Reset Zustand State
      logout();
      
      // 4. Redirect to login
      navigate('/login');
    }
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandRow}>
            <div className={styles.logomark}>🛵</div>
            <span className={styles.brandName}>GigShield</span>
          </div>
          <p className={styles.tagline}>AI Parametric Income Insurance</p>
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          <p className={styles.navSection}>{isAdmin ? 'Insurer Portal' : 'Worker Portal'}</p>
          {nav.map(item => (
            <button
              key={item.path}
              className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}

          <div className={styles.divider} />
          <p className={styles.navSection}>Platform</p>
          <div className={styles.navMeta}><span>📍</span> Chennai, India</div>
          <div className={styles.navMeta}><span>🏪</span> Blinkit · Zepto · Swiggy</div>
        </nav>

        {/* User footer */}
        <div className={styles.footer}>
          {user && (
            <div className={styles.userRow}>
              <div className={styles.userAvatar}>{user.name?.[0] || '?'}</div>
              <div className={styles.userInfo}>
                <div className={styles.userName}>{user.name || user.phone}</div>
                <div className={styles.userRole}>{user.role}</div>
              </div>
            </div>
          )}
          <button className={styles.logoutBtn} onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}