import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Features } from './pages/Features';
import { Epics } from './pages/Epics';
import { Milestones } from './pages/Milestones';
import { Kanban } from './pages/Kanban';
import { Gantt } from './pages/Gantt';
import { AIAssistant } from './pages/AIAssistant';
import { Import } from './pages/Import';
import { PlanBuilder } from './pages/PlanBuilder';
import { Integrations } from './pages/Integrations';
import { ToastProvider } from './components/ui/Toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000, // 30 seconds
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="plan/new" element={<PlanBuilder />} />
                  <Route path="features" element={<Features />} />
                  <Route path="kanban" element={<Kanban />} />
                  <Route path="gantt" element={<Gantt />} />
                  <Route path="epics" element={<Epics />} />
                  <Route path="milestones" element={<Milestones />} />
                  <Route path="ai" element={<AIAssistant />} />
                  <Route path="import" element={<Import />} />
                  <Route path="integrations" element={<Integrations />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </QueryClientProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
