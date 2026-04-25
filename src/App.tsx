// ========================================
// Joan's Academic Hub — App 入口
// ========================================
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/context/AuthContext';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import LibraryPage from '@/pages/LibraryPage';
import PaperDetailPage from '@/pages/PaperDetailPage';
import ResearchPage from '@/pages/ResearchPage';
import SettingsPage from '@/pages/SettingsPage';
import AdminPage from '@/pages/AdminPage';
import ImportExportPage from '@/pages/ImportExportPage';
import MyLibraryPage from '@/pages/MyLibraryPage';
import MaterialsPage from '@/pages/MaterialsPage';
import AIChatPage from '@/pages/AIChatPage';
import AppLayout from '@/components/layout/AppLayout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-primary-500 font-serif text-lg">贞德正在加载...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
                  <Route path="library" element={<LibraryPage />} />
                  <Route path="paper/:id" element={<PaperDetailPage />} />
                  <Route path="my-library" element={<MyLibraryPage />} />
                  <Route path="materials" element={<MaterialsPage />} />
                  <Route path="ai-chat" element={<AIChatPage />} />
                  <Route path="research" element={<ResearchPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="admin" element={<AdminPage />} />
                  <Route path="import-export" element={<ImportExportPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
            <TooltipProvider>
              <AppRoutes />
              <Toaster
                position="top-right"
                richColors
                closeButton
                toastOptions={{
                  className: 'font-sans',
                }}
              />
            </TooltipProvider>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  );
}
