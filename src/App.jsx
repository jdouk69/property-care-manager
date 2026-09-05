import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import { ThemeProvider } from 'next-themes';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import Dashboard from '@/pages/Dashboard';
import Clients from '@/pages/Clients';
import Properties from '@/pages/Properties';
import PropertyDetail from '@/pages/PropertyDetail';
import Tasks from '@/pages/Tasks';
import Inspections from '@/pages/Inspections';
import Maintenance from '@/pages/Maintenance';
import MaintenanceIssueDetail from '@/pages/MaintenanceIssueDetail';
import Contractors from '@/pages/Contractors';
import Expenses from '@/pages/Expenses';
import Keys from '@/pages/Keys';
import Calendar from '@/pages/Calendar';
import Reports from '@/pages/Reports';
import Search from '@/pages/Search';
import Settings from '@/pages/Settings';
import AutomationLog from '@/pages/AutomationLog';
import Invoices from '@/pages/Invoices';
import ServicePackages from '@/pages/ServicePackages';
import OwnerCommunications from '@/pages/OwnerCommunications';
import Deliveries from '@/pages/Deliveries';
import Visits from '@/pages/Visits';
import VisitDetail from '@/pages/VisitDetail';
import OwnerRepReports from '@/pages/OwnerRepReports';
import PropertyDocuments from '@/pages/PropertyDocuments';
import ChecklistTemplates from '@/pages/ChecklistTemplates';
import ClientHub from '@/pages/ClientHub';
import ServiceAgreement from '@/pages/ServiceAgreement';
import ServiceSetup from '@/pages/ServiceSetup';
import IntakeForm from '@/pages/IntakeForm';
import AgreementPublic from '@/pages/AgreementPublic';
import IntakeReview from '@/pages/IntakeReview';
import MonitoringPlanReview from '@/pages/MonitoringPlanReview';
import PropertyAssistance from '@/pages/PropertyAssistance';
import OneTimeServices from '@/pages/OneTimeServices';
import Billing from '@/pages/Billing';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Public customer intake — NOT protected. Gated by secure token server-side. */}
      <Route path="/intake/:token" element={<IntakeForm />} />
      <Route path="/agreement/:token" element={<AgreementPublic />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientHub />} />
        <Route element={<AdminRoute />}>
          <Route path="/clients/:id/intake" element={<IntakeReview />} />
        </Route>
        <Route path="/properties" element={<Properties />} />
        <Route path="/properties/:id" element={<PropertyDetail />} />
        <Route element={<AdminRoute />}>
          <Route path="/properties/:id/monitoring-plan" element={<MonitoringPlanReview />} />
          <Route path="/properties/:id/service-setup" element={<ServiceSetup />} />
        </Route>
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/inspections" element={<Inspections />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/maintenance/:id" element={<MaintenanceIssueDetail />} />
        <Route path="/contractors" element={<Contractors />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/keys" element={<Keys />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/search" element={<Search />} />
        <Route element={<AdminRoute />}>
          <Route path="/settings" element={<Settings />} />
          <Route path="/automation" element={<AutomationLog />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/services" element={<ServicePackages />} />
        </Route>
        <Route path="/communications" element={<OwnerCommunications />} />
        <Route path="/deliveries" element={<Deliveries />} />
        <Route path="/visits" element={<Visits />} />
        <Route path="/visits/:id" element={<VisitDetail />} />
        <Route path="/rep-reports" element={<OwnerRepReports />} />
        <Route path="/documents" element={<PropertyDocuments />} />
        <Route element={<AdminRoute />}>
          <Route path="/checklist-templates" element={<ChecklistTemplates />} />
          <Route path="/agreements/new" element={<ServiceAgreement />} />
          <Route path="/agreements/:id" element={<ServiceAgreement />} />
        </Route>
        <Route path="/property-assistance" element={<PropertyAssistance />} />
        <Route path="/property-assistance/:id" element={<PropertyAssistance />} />
        <Route path="/one-time" element={<OneTimeServices />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App