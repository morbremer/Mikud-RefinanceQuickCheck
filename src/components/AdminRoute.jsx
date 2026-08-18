import { Navigate } from 'react-router-dom';
import { useAdminSession } from '@/lib/useAdminSession';

const LoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-[#060b14]">
    <div className="w-8 h-8 border-4 border-[#1e2d4a] border-t-[#C5A059] rounded-full animate-spin"></div>
  </div>
);

const AccessDenied = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 bg-[#060b14]" dir="rtl">
    <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-3xl">
      🔒
    </div>
    <h1 className="text-xl font-bold text-white">אין לך הרשאה לצפות בעמוד זה</h1>
    <p className="text-[#8892B0] text-sm max-w-sm">
      עמוד זה מיועד לצוות מיקוד משכנתאות בלבד. אם לדעתך מדובר בטעות, פנה למנהל המערכת.
    </p>
  </div>
);

/**
 * AdminRoute — wraps מרכז חיתום מוסדי so it only renders once the caller is
 * a logged-in admin. Defense-in-depth alongside the server-side checks
 * already in every touched Edge Function (buildUnderwriterReport,
 * processUnderwriterCase, etc.) — this guard alone is not the real security
 * boundary, the functions' own appMetadata.role checks are.
 */
export default function AdminRoute({ children }) {
  const { isLoading, isAuthenticated, isAdmin } = useAdminSession();

  if (isLoading) return <LoadingFallback />;
  if (!isAuthenticated) return <Navigate to="/UnderwriterLogin" replace />;
  if (!isAdmin) return <AccessDenied />;
  return children;
}
