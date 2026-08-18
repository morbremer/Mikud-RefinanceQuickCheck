import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAdminSession } from '@/lib/useAdminSession';
import { Loader2, Lock } from 'lucide-react';

/**
 * UnderwriterLogin — internal-staff-only login for מרכז חיתום מוסדי.
 * No self-serve signup: admin accounts are created manually (Supabase
 * dashboard or CLI), with appMetadata.role = 'admin' set by service role.
 */
export default function UnderwriterLogin() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, isLoading: sessionLoading } = useAdminSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!sessionLoading && isAuthenticated && isAdmin) {
    navigate('/UnderwriterDashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      navigate('/UnderwriterDashboard', { replace: true });
    } catch (err) {
      setError('אימייל או סיסמה שגויים');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060b14] flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl border border-[#C5A059]/40 bg-[#0d1524] flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-[#C5A059]" />
          </div>
          <h1 className="text-white font-bold text-xl">מרכז חיתום מוסדי</h1>
          <p className="text-[#8892B0] text-sm mt-1">כניסה לצוות מיקוד משכנתאות בלבד</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-[#0d1524] border border-[#1e2d4a] rounded-2xl p-6">
          <div>
            <label className="text-[#8892B0] text-xs block mb-1.5">אימייל</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full bg-[#080d16] border border-[#1e2d4a] text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#C5A059]/40"
            />
          </div>
          <div>
            <label className="text-[#8892B0] text-xs block mb-1.5">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-[#080d16] border border-[#1e2d4a] text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#C5A059]/40"
            />
          </div>

          {error && (
            <div className="border border-red-500/30 bg-red-500/5 rounded-xl px-4 py-2.5 text-red-400 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#C5A059] hover:bg-[#D4AF37] disabled:opacity-50 text-[#0A0F1A] font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'כניסה'}
          </button>
        </form>
      </div>
    </div>
  );
}
