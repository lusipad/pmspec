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
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="features" element={<Features />} />
                <Route path="kanban" element={<Kanban />} />
                <Route path="gantt" element={<Gantt />} />
                <Route path="epics" element={<Epics />} />
                <Route path="milestones" element={<Milestones />} />
                <Route path="ai" element={<AIAssistant />} />
                <Route path="import" element={<Import />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
