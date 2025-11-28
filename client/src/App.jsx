import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import WelcomePage from './pages/WelcomePage';
import OnboardingPage from './pages/OnboardingPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import WorkerDashboard from './pages/worker/WorkerDashboard';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import SiteManagement from './pages/owner/SiteManagement';
import AttendanceList from './pages/owner/AttendanceList';
import AnalyticsDashboard from './pages/owner/AnalyticsDashboard';
import SupplierManagement from './pages/owner/SupplierManagement';
import QuotesManager from './pages/owner/QuotesManager';
import SALPage from './pages/owner/SALPage';
import SignaturePage from './pages/owner/SignaturePage';
import CompanySettings from './pages/owner/CompanySettings';
import EmployeeManagement from './pages/owner/EmployeeManagement';
import MaterialsCatalog from './pages/owner/MaterialsCatalog';
import MaterialApproval from './pages/owner/MaterialApproval';
import Loading from './components/Loading';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Protected Route Component
const ProtectedRoute = ({ children, requireOwner = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireOwner && user.role !== 'owner') {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Worker Routes */}
      <Route
        path="/worker"
        element={
          <ProtectedRoute>
            <WorkerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Owner Routes */}
      <Route
        path="/owner"
        element={
          <ProtectedRoute requireOwner>
            <OwnerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/employees"
        element={
          <ProtectedRoute requireOwner>
            <EmployeeManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/sites"
        element={
          <ProtectedRoute requireOwner>
            <SiteManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/attendance"
        element={
          <ProtectedRoute requireOwner>
            <AttendanceList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/analytics"
        element={
          <ProtectedRoute requireOwner>
            <AnalyticsDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/materials"
        element={
          <ProtectedRoute requireOwner>
            <MaterialsCatalog />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/material-approval"
        element={
          <ProtectedRoute requireOwner>
            <MaterialApproval />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/suppliers"
        element={
          <ProtectedRoute requireOwner>
            <SupplierManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/quotes"
        element={
          <ProtectedRoute requireOwner>
            <QuotesManager />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/sals"
        element={
          <ProtectedRoute requireOwner>
            <SALPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/signature"
        element={
          <ProtectedRoute requireOwner>
            <SignaturePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/settings"
        element={
          <ProtectedRoute requireOwner>
            <CompanySettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/worker-functions"
        element={
          <ProtectedRoute requireOwner>
            <WorkerDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
