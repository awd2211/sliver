import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useEffect } from 'react';
import { Toaster } from 'sonner';
import { MainLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TerminalSettingsProvider } from '@/contexts';
import { Loader2 } from 'lucide-react';

// Lazy load pages for better code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Login = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })));
const Sessions = lazy(() => import('@/pages/Sessions').then(m => ({ default: m.Sessions })));
const SessionDetail = lazy(() => import('@/pages/SessionDetail').then(m => ({ default: m.SessionDetail })));
const Beacons = lazy(() => import('@/pages/Beacons').then(m => ({ default: m.Beacons })));
const BeaconDetail = lazy(() => import('@/pages/BeaconDetail').then(m => ({ default: m.BeaconDetail })));
const Jobs = lazy(() => import('@/pages/Jobs').then(m => ({ default: m.Jobs })));
const Implants = lazy(() => import('@/pages/Implants').then(m => ({ default: m.Implants })));
const Hosts = lazy(() => import('@/pages/Hosts').then(m => ({ default: m.Hosts })));
const Loot = lazy(() => import('@/pages/Loot').then(m => ({ default: m.Loot })));
const Credentials = lazy(() => import('@/pages/Credentials').then(m => ({ default: m.Credentials })));
const Websites = lazy(() => import('@/pages/Websites').then(m => ({ default: m.Websites })));
const Operators = lazy(() => import('@/pages/Operators').then(m => ({ default: m.Operators })));
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })));
const Armory = lazy(() => import('@/pages/Armory').then(m => ({ default: m.Armory })));
const C2Profiles = lazy(() => import('@/pages/C2Profiles').then(m => ({ default: m.C2Profiles })));
const Certificates = lazy(() => import('@/pages/Certificates').then(m => ({ default: m.Certificates })));
const Canaries = lazy(() => import('@/pages/Canaries').then(m => ({ default: m.Canaries })));
const Topology = lazy(() => import('@/pages/Topology').then(m => ({ default: m.Topology })));
const Monitor = lazy(() => import('@/pages/Monitor').then(m => ({ default: m.Monitor })));
const Builders = lazy(() => import('@/pages/Builders').then(m => ({ default: m.Builders })));
const Reactions = lazy(() => import('@/pages/Reactions').then(m => ({ default: m.Reactions })));
const TaskMany = lazy(() => import('@/pages/TaskMany').then(m => ({ default: m.TaskMany })));
const Profiles = lazy(() => import('@/pages/Profiles').then(m => ({ default: m.Profiles })));
const Aliases = lazy(() => import('@/pages/Aliases').then(m => ({ default: m.Aliases })));
const Extensions = lazy(() => import('@/pages/Extensions').then(m => ({ default: m.Extensions })));
const Crack = lazy(() => import('@/pages/Crack').then(m => ({ default: m.Crack })));
const TrafficEncoders = lazy(() => import('@/pages/TrafficEncoders'));
const Licenses = lazy(() => import('@/pages/Licenses'));
const CompilerInfo = lazy(() => import('@/pages/CompilerInfo'));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

function App() {
  useEffect(() => {
    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <ErrorBoundary>
      <TerminalSettingsProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="sessions" element={<Sessions />} />
                <Route path="sessions/:id" element={<SessionDetail />} />
                <Route path="beacons" element={<Beacons />} />
                <Route path="beacons/:id" element={<BeaconDetail />} />
                <Route path="jobs" element={<Jobs />} />
                <Route path="implants" element={<Implants />} />
                <Route path="hosts" element={<Hosts />} />
                <Route path="loot" element={<Loot />} />
                <Route path="credentials" element={<Credentials />} />
                <Route path="websites" element={<Websites />} />
                <Route path="operators" element={<Operators />} />
                <Route path="settings" element={<Settings />} />
                <Route path="armory" element={<Armory />} />
                <Route path="c2profiles" element={<C2Profiles />} />
                <Route path="certificates" element={<Certificates />} />
                <Route path="canaries" element={<Canaries />} />
                <Route path="topology" element={<Topology />} />
                <Route path="monitor" element={<Monitor />} />
                <Route path="builders" element={<Builders />} />
                <Route path="reactions" element={<Reactions />} />
                <Route path="taskmany" element={<TaskMany />} />
                <Route path="profiles" element={<Profiles />} />
                <Route path="aliases" element={<Aliases />} />
                <Route path="extensions" element={<Extensions />} />
                <Route path="crack" element={<Crack />} />
                <Route path="traffic-encoders" element={<TrafficEncoders />} />
                <Route path="licenses" element={<Licenses />} />
                <Route path="compiler" element={<CompilerInfo />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--card-foreground))',
              },
            }}
          />
        </QueryClientProvider>
      </TerminalSettingsProvider>
    </ErrorBoundary>
  );
}

export default App;
