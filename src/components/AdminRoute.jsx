import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

// Route-level guard for Owner/Admin-only pages (Settings, Billing, Invoices,
// Services, Checklist Templates, Automation Log, agreement administration,
// intake review, monitoring-plan confirmation, service/pricing setup).
// Mirrors ProtectedRoute's auth handling, then checks the user role.
// Renders nothing but a spinner until the role is known, so privileged
// content is never exposed on a partial load. Staff are redirected to the
// Dashboard without the admin page ever mounting.
export default function AdminRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth, user } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  // Authenticated: role check. Unknown or missing role is treated as
  // non-admin (safe fallback).
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}