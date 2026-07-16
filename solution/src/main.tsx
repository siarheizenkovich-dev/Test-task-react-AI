import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 4xx won't heal on retry (auth/permissions/validation); transient
      // 5xx and network errors get one more attempt.
      retry: (failureCount, error) => {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (status !== undefined && status < 500) return false;
        return failureCount < 1;
      },
      staleTime: 15_000,
    },
  },
});

const start = async () => {
  // The mock backend lives in the browser — it must be running before the
  // app fires its first request.
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
};

void start();
