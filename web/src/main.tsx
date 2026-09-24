import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './auth/AuthProvider';
import { Layout } from './components/Layout';
import './i18n';
import { Home } from './pages/Home';
import { Privacy, Terms } from './pages/Legal';
import { ListingPage } from './pages/Listing';
import { NotFound } from './pages/NotFound';
import { Saved } from './pages/Saved';
import { Search } from './pages/Search';
import { SignIn } from './pages/SignIn';
import { DeleteAccount, Support } from './pages/Support';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reference data barely moves and cars move slowly; refetching on every
      // focus would make the site feel busy without telling anyone anything.
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/listing/:id" element={<ListingPage />} />
              <Route path="/saved" element={<Saved />} />
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/support" element={<Support />} />
              <Route path="/delete-account" element={<DeleteAccount />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
