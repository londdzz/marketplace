import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './auth/AuthProvider';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import './i18n';
import { Home } from './pages/Home';
import { ListingPage } from './pages/Listing';
import { Saved } from './pages/Saved';
import { Search } from './pages/Search';
import './styles/fonts';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';

/**
 * Browsing arrives with the page; everything else arrives when it is asked
 * for.
 *
 * Somebody who followed a link to a car should not be made to download the
 * sell form, the message threads and the privacy policy before they can see
 * it. Home, search, a car and the shortlist are what most visits are, so they
 * stay in the first bundle; the rest is a chunk each, fetched on the click
 * that needs it.
 */
const Account = {
  Blocked: lazy(() => import('./pages/Account').then((m) => ({ default: m.Blocked }))),
  Credits: lazy(() => import('./pages/Account').then((m) => ({ default: m.Credits }))),
  MyListings: lazy(() => import('./pages/Account').then((m) => ({ default: m.MyListings }))),
  Profile: lazy(() => import('./pages/Account').then((m) => ({ default: m.Profile }))),
  SavedSearches: lazy(() => import('./pages/Account').then((m) => ({ default: m.SavedSearches }))),
};

const Messages = lazy(() => import('./pages/Messages').then((m) => ({ default: m.Messages })));
const Sell = lazy(() => import('./pages/Sell').then((m) => ({ default: m.Sell })));
const SignIn = lazy(() => import('./pages/SignIn').then((m) => ({ default: m.SignIn })));
const Privacy = lazy(() => import('./pages/Legal').then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Legal').then((m) => ({ default: m.Terms })));
const Support = lazy(() => import('./pages/Support').then((m) => ({ default: m.Support })));
const DeleteAccount = lazy(() => import('./pages/Support').then((m) => ({ default: m.DeleteAccount })));
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

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
          <Suspense fallback={<Spinner />}>
            <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/listing/:id" element={<ListingPage />} />
              <Route path="/saved" element={<Saved />} />
              <Route path="/saved-searches" element={<Account.SavedSearches />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/:id" element={<Messages />} />
              <Route path="/sell" element={<Sell />} />
              <Route path="/my-listings" element={<Account.MyListings />} />
              <Route path="/credits" element={<Account.Credits />} />
              <Route path="/profile" element={<Account.Profile />} />
              <Route path="/blocked" element={<Account.Blocked />} />
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/support" element={<Support />} />
              <Route path="/delete-account" element={<DeleteAccount />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
