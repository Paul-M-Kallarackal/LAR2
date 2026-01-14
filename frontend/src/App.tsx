import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DashboardPage } from '@/pages/DashboardPage';
import { EditorPage } from '@/pages/EditorPage';
import { QuestionnairePage } from '@/pages/QuestionnairePage';
import { LoginPage } from '@/pages/LoginPage';
import SharedDocumentPage from '@/pages/SharedDocumentPage';
import BorrowerDashboard from '@/pages/BorrowerDashboard';
import { useAuthStore } from '@/stores/auth.store';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, token, isLoading, fetchUser } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (token && !user) {
      fetchUser();
    }
  }, [token, user, fetchUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function RoleBasedRedirect() {
  const { user, token, isLoading, fetchUser } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      fetchUser();
    }
  }, [token, user, fetchUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'borrower') {
    return <Navigate to="/borrower" replace />;
  }

  return <DashboardPage />;
}

export default function App() {
  useEffect(() => {
    localStorage.removeItem('theme');
    document.documentElement.classList.remove('dark');
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false} disableTransitionOnChange>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/shared/:token" element={<SharedDocumentPage />} />
            
            <Route path="/" element={<RoleBasedRedirect />} />
            
            <Route
              path="/borrower"
              element={
                <ProtectedRoute allowedRoles={['borrower']}>
                  <BorrowerDashboard />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/documents/:id"
              element={
                <ProtectedRoute allowedRoles={['provider']}>
                  <EditorPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/questionnaire/:templateId"
              element={
                <ProtectedRoute allowedRoles={['provider']}>
                  <QuestionnairePage />
                </ProtectedRoute>
              }
            />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  );
}
