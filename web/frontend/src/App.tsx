import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Features } from './pages/Features';
import { Epics } from './pages/Epics';
import { Kanban } from './pages/Kanban';
import { Gantt } from './pages/Gantt';

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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="features" element={<Features />} />
            <Route path="kanban" element={<Kanban />} />
            <Route path="gantt" element={<Gantt />} />
            <Route path="epics" element={<Epics />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
