import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout    from './components/layout/Layout';
import Spinner   from './components/ui/Spinner';

// Lazy-loaded pages for code splitting
const Login            = lazy(() => import('./pages/Login'));
const Onboarding       = lazy(() => import('./pages/Onboarding'));
const WorkerDashboard  = lazy(() => import('./pages/WorkerDashboard'));
const PolicyManagement = lazy(() => import('./pages/PolicyManagement'));
const ClaimsPage       = lazy(() => import('./pages/ClaimsPage'));
const MLPricingPage    = lazy(() => import('./pages/MLPricingPage'));
const TriggerMonitor   = lazy(() => import('./pages/TriggerMonitor'));
const AdminDashboard   = lazy(() => import('./pages/AdminDashboard'));

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isLoggedIn, user } = useAuthStore();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuthStore();
  if (isLoggedIn) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<Spinner fullScreen />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

        {/* Protected — all authenticated users */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<WorkerDashboard />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="policies"   element={<PolicyManagement />} />
          <Route path="claims"     element={<ClaimsPage />} />
          <Route path="pricing"    element={<MLPricingPage />} />
          <Route path="triggers"   element={<TriggerMonitor />} />

          {/* Admin/Insurer only */}
          <Route path="admin" element={
            <ProtectedRoute roles={['ADMIN', 'INSURER']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
