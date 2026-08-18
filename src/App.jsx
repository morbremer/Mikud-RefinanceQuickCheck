import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import StagingBanner from './components/StagingBanner';
import AdminRoute from './components/AdminRoute';
import UnderwriterDashboard from './pages/UnderwriterDashboard';
import UnderwriterLogin from './pages/UnderwriterLogin';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// No auth/admin gating on the auto-generated Pages -- RefinanceQuickCheck
// requires no login, so the Base44-era loading/redirect/ProtectedRoute
// machinery was dead weight there. מרכז חיתום מוסדי is the one exception,
// gated below by AdminRoute (real Supabase Auth + appMetadata.role check).
//
// UnderwriterDashboard/UnderwriterLogin are rendered WITHOUT LayoutWrapper
// (unlike the original Base44 app, which did wrap them in its own Layout).
// This repo's Layout is a public marketing shell (nav bar, footer, floating
// chat widget) built for the two public tools -- both underwriter pages
// already build their own full "min-h-screen" dark admin UI with their own
// header, so wrapping them in the public shell would double up chrome
// rather than compose with it.
const AppRoutes = () => (
  <Routes>
    <Route path="/" element={
      <LayoutWrapper currentPageName={mainPageKey}>
        <MainPage />
      </LayoutWrapper>
    } />
    {Object.entries(Pages).map(([path, Page]) => (
      <Route
        key={path}
        path={`/${path}`}
        element={
          <LayoutWrapper currentPageName={path}>
            <Page />
          </LayoutWrapper>
        }
      />
    ))}
    <Route path="/UnderwriterLogin" element={<UnderwriterLogin />} />
    <Route path="/UnderwriterDashboard" element={
      <AdminRoute><UnderwriterDashboard /></AdminRoute>
    } />
    <Route path="*" element={<PageNotFound />} />
  </Routes>
);

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <StagingBanner />
        <AppRoutes />
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
