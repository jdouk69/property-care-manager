import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AccessNotApproved from '@/components/AccessNotApproved';

// Only these roles may enter the operational application. Everything else —
// including an authenticated-but-unapproved role or a missing role — is
// blocked (fail-closed).
const APPROVED_ROLES = ['admin', 'staff'];

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
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

  // Fail-closed approval gate: until the user's role is known and is an
  // approved role, the operational application never mounts. The spinner
  // above covers the loading window, and any other role (including "user"
  // or a missing role) gets the Access Not Approved screen — never the app.
  if (!user || !APPROVED_ROLES.includes(user.role)) {
    return <AccessNotApproved />;
  }

  return <Outlet />;
}