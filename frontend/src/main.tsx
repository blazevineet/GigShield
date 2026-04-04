import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; 
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/global.css';

// Initialize the client that manages all your data fetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1a2235',
              color: '#e2e8f0',
              border: '1px solid #1c2840',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#001a0d' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#1a0000' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);