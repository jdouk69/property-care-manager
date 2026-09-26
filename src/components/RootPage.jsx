import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import Dashboard from "@/pages/Dashboard";
import WebsiteHome from "@/pages/website/WebsiteHome";
import AccessNotApproved from "@/components/AccessNotApproved";

// Root URL behavior:
// - Logged OUT: the public one-page website homepage.
// - Logged IN with an approved role (admin/staff): the operational Dashboard,
//   exactly as before — no change to the staff workflow or post-login redirect.
// - Logged in with any other role: the same fail-closed Access Not Approved
//   screen the protected routes show.
const APPROVED_ROLES = ["admin", "staff"];

export default function RootPage() {
  const { isAuthenticated, isLoadingAuth, authChecked, checkUserAuth, user } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) return <WebsiteHome />;

  if (!user || !APPROVED_ROLES.includes(user.role)) return <AccessNotApproved />;

  return <Dashboard />;
}