import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Lock, Send, User, Clock } from 'lucide-react';

/**
 * InternalNotes — internal notes between underwriters only.
 * These notes are flagged is_internal: true and never appear in the PDF report.
 *
 * ── MIGRATION NOTE (Base44 → Supabase) ──
 * - base44.auth.me() → supabase.auth.getUser(). full_name lives in
 *   user_metadata (Base44's User.full_name has no direct Supabase equivalent) —
 *   falls back to email if not set.
 * - Message.filter/create, AuditLog.create → supabase.from('messages'/'audit_log').
 * - Message.subscribe(...) (Base44's proprietary realtime) → native Supabase
 *   Realtime postgres_changes subscription, filtered server-side by case_id
 *   (replaces the original's manual event.data.case_id === caseId check).
 */
export default function InternalNotes({ caseId }) {
  const [notes, setNotes] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!caseId) return;
    const load = async () => {
      const { data: all } = await supabase
        .from('messages')
        .select('*')
        .eq('case_id', caseId)
        .eq('is_internal', true)
        .order('timestamp', { ascending: false })
        .limit(50);
      setNotes((all || []).reverse());
    };
    load();
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`internal-notes:${caseId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `case_id=eq.${caseId}`,
      }, (payload) => {
        if (payload.new?.is_internal) setNotes(prev => [...prev, payload.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [caseId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  const handleSend = async () => {
    if (!input.trim() || !caseId || !user) return;
    setSending(true);
    try {
      const { error: msgError } = await supabase.from('messages').insert({
        case_id: caseId,
        sender_type: 'admin',
        sender_name: user.user_metadata?.full_name || user.email,
        sender_email: user.email,
        content: input.trim(),
        is_internal: true,
        read: false,
        timestamp: new Date().toISOString(),
      });
      if (msgError) throw msgError;
      // Log to audit
      await supabase.from('audit_log').insert({
        user_email: user.email,
        action_type: 'edit',
        target_entity: 'Message',
        target_id: caseId,
        description: 'הוספת הערה פנימית לתיק',
        sensitive_data: true,
      });
      setInput('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  return (
    <div className="bg-[#0d1524] border border-[#1e2d4a] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[#1e2d4a] bg-[#080d16]">
        <Lock className="w-4 h-4 text-[#C5A059]" />
        <div>
          <p className="text-white text-sm font-semibold">הערות פנימיות — Internal Only</p>
          <p className="text-[#4a5568] text-xs">הערות אלו חסויות ואינן מופיעות ב-PDF</p>
        </div>
        <span className="mr-auto text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
          🔒 פנימי בלבד
        </span>
      </div>

      {/* Messages */}
      <div className="h-56 overflow-y-auto px-4 py-3 space-y-3">
        {notes.length === 0 ? (
          <p className="text-[#4a5568] text-xs text-center mt-8">אין הערות פנימיות עדיין</p>
        ) : notes.map((n, i) => (
          <div key={n.id || i} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-[#4a5568]">
              <User className="w-3 h-3" />
              <span className="text-[#8892B0]">{n.sender_name || n.sender_email}</span>
              <Clock className="w-3 h-3 mr-1" />
              <span>{formatTime(n.timestamp || n.created_at)}</span>
            </div>
            <div className="bg-[#C5A059]/8 border border-[#C5A059]/20 rounded-xl px-3 py-2 text-sm text-white leading-relaxed">
              {n.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#1e2d4a] px-4 py-3 flex items-center gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="כתוב הערה פנימית לחתמים..."
          className="flex-1 bg-[#080d16] border border-[#1e2d4a] text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#C5A059]/40 placeholder:text-[#4a5568]"
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-9 h-9 rounded-xl bg-[#C5A059] hover:bg-[#D4AF37] disabled:opacity-30 transition-all flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4 text-[#0A0F1A]" />
        </button>
      </div>
    </div>
  );
}
