import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ThemeProvider } from 'next-themes';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import LoginRedirect from '@/components/LoginRedirect';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';

const Login = lazy(() => import('@/pages/Login'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const RootPage = lazy(() => import('@/components/RootPage'));
const Clients = lazy(() => import('@/pages/Clients'));
const Properties = lazy(() => import('@/pages/Properties'));
const PropertyDetail = lazy(() => import('@/pages/PropertyDetail'));
const Tasks = lazy(() => import('@/pages/Tasks'));
const Inspections = lazy(() => import('@/pages/Inspections'));
const Maintenance = lazy(() => import('@/pages/Maintenance'));
const MaintenanceIssueDetail = lazy(() => import('@/pages/MaintenanceIssueDetail'));
const Contractors = lazy(() => import('@/pages/Contractors'));
const Expenses = lazy(() => import('@/pages/Expenses'));
const Keys = lazy(() => import('@/pages/Keys'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const Reports = lazy(() => import('@/pages/Reports'));
const Search = lazy(() => import('@/pages/Search'));
const Settings = lazy(() => import('@/pages/Settings'));
const Profile = lazy(() => import('@/pages/Profile'));
const BusinessBilling = lazy(() => import('@/pages/BusinessBilling'));
const AutomationLog = lazy(() => import('@/pages/AutomationLog'));
const Invoices = lazy(() => import('@/pages/Invoices'));
const ServicePackages = lazy(() => import('@/pages/ServicePackages'));
const OwnerCommunications = lazy(() => import('@/pages/OwnerCommunications'));
const Deliveries = lazy(() => import('@/pages/Deliveries'));
const Visits = lazy(() => import('@/pages/Visits'));
const VisitDetail = lazy(() => import('@/pages/VisitDetail'));
const OwnerRepReports = lazy(() => import('@/pages/OwnerRepReports'));
const PropertyDocuments = lazy(() => import('@/pages/PropertyDocuments'));
const ChecklistTemplates = lazy(() => import('@/pages/ChecklistTemplates'));
const ClientHub = lazy(() => import('@/pages/ClientHub'));
const ServiceAgreement = lazy(() => import('@/pages/ServiceAgreement'));
const AgreementTerms = lazy(() => import('@/pages/AgreementTerms'));
const ServiceSetup = lazy(() => import('@/pages/ServiceSetup'));
const IntakeForm = lazy(() => import('@/pages/IntakeForm'));
const AgreementPublic = lazy(() => import('@/pages/AgreementPublic'));
const IntakeReview = lazy(() => import('@/pages/IntakeReview'));
const MonitoringPlanReview = lazy(() => import('@/pages/MonitoringPlanReview'));
const PropertyAssistance = lazy(() => import('@/pages/PropertyAssistance'));
const OneTimeServices = lazy(() => import('@/pages/OneTimeServices'));
const Billing = lazy(() => import('@/pages/Billing'));
const AdminUsers = lazy(() => import('@/pages/AdminUsers'));
const WebsiteHome = lazy(() => import('@/pages/website/WebsiteHome'));
const WebsiteAbout = lazy(() => import('@/pages/website/WebsiteAbout'));
const WebsiteContact = lazy(() => import('@/pages/website/WebsiteContact'));
const SampleReportPage = lazy(() => import('@/pages/website/SampleReportPage'));
const CarePlanDetailsPage = lazy(() => import('@/pages/website/CarePlanDetailsPage'));
const OnDemandServiceDetailsPage = lazy(() => import('@/pages/website/OnDemandServiceDetailsPage'));
const AssessmentRequests = lazy(() => import('@/pages/AssessmentRequests'));
const WebsiteEditor = lazy(() => import('@/pages/WebsiteEditor'));

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
      {/* Root: public website homepage when logged out, Dashboard when logged in. */}
      <Route path="/" element={<RootPage />} />
      {/* Public website landing page — ONE scrolling page; pricing section at #services (live, server-side). */}
      <Route path="/landing-page" element={<WebsiteHome />} />
      {/* Old /home URL redirects to the landing page, preserving any section hash. */}
      <Route path="/home" element={<Navigate to={`/landing-page${window.location.hash}`} replace />} />
      {/* Old prices URL now redirects to the landing page pricing section. */}
      <Route path="/prices" element={<Navigate to="/landing-page#services" replace />} />
      {/* Public About and Contact pages. */}
      <Route path="/about" element={<WebsiteAbout />} />
      <Route path="/contact" element={<WebsiteContact />} />
      {/* Public sample visit report preview (illustrative fixture only). */}
      <Route path="/sample-report" element={<SampleReportPage />} />
      <Route path="/care-plan-details" element={<CarePlanDetailsPage />} />
      <Route path="/service-details" element={<OnDemandServiceDetailsPage />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<LoginRedirect />} />}>
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
        <Route path="/profile" element={<Profile />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/inspections" element={<Inspections />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/open-issues" element={<Maintenance openOnly />} />
        <Route path="/maintenance/:id" element={<MaintenanceIssueDetail />} />
        <Route path="/contractors" element={<Contractors />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/keys" element={<Keys />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/search" element={<Search />} />
        <Route element={<AdminRoute />}>
          <Route path="/settings" element={<Settings />} />
          <Route path="/business-billing" element={<BusinessBilling />} />
          <Route path="/agreement-terms" element={<AgreementTerms />} />
          <Route path="/automation" element={<AutomationLog />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/services" element={<ServicePackages />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/assessment-requests" element={<AssessmentRequests />} />
          <Route path="/website-editor" element={<WebsiteEditor />} />
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
    <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange>
      <LanguageProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center" role="status" aria-label="Loading page"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /><span className="sr-only">Loading page…</span></div>}>
              <AuthenticatedApp />
            </Suspense>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App