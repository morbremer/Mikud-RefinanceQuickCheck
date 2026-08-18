import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

/**
 * lockEmployerFromPayslips — Employer Source-Of-Truth Enforcer
 *
 * Called from processUnderwriterCase as a POST-PROCESS step.
 * Input: { borrowers, payslips_borrower1, payslips_borrower2 }
 * Output: { borrowers } (updated), { log }
 *
 * Rule: the dominant employer appearing on payslips always wins over any
 * employer field derived from bank statements (e.g. "Citibank" from an RSU
 * credit). Prevents the wrong-employer-detection bug.
 *
 * ── MIGRATION NOTE (Base44 → Supabase) ──
 * base44.auth.me() → the auth: ["user", "secret"] gate itself (any logged-in
 * user, not admin-specifically — matches the original, no separate role
 * check). "secret" is also accepted because processUnderwriterCase calls
 * this function server-to-server via ctx.supabaseAdmin.functions.invoke(...),
 * which authenticates as "secret" mode, not "user".
 */
export default {
  fetch: withSupabase({ auth: ["user", "secret"] }, async (req, ctx) => {
    try {
      const { borrowers, payslips_borrower1, payslips_borrower2 } = await req.json();
      if (!borrowers) return Response.json({ error: 'borrowers required' }, { status: 400 });

      const log = [];
      const updatedBorrowers = [...borrowers];

      [[payslips_borrower1 || [], 0], [payslips_borrower2 || [], 1]].forEach(([slips, idx]) => {
        if (!slips.length || !updatedBorrowers[idx]) return;
        const counts = {};
        slips.forEach(p => {
          const e = (p.employer || '').trim();
          if (e && e.length > 1) counts[e] = (counts[e] || 0) + 1;
        });
        const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (!dominant) return;
        const current = updatedBorrowers[idx].employer || '';
        if (current !== dominant) {
          log.push({
            rule: 'EMPLOYER_LOCKED_FROM_PAYSLIP_SOURCE_OF_TRUTH',
            borrower: updatedBorrowers[idx].name,
            original: current,
            corrected: dominant,
            reason: 'מקור האמת הבלעדי למעסיק: תלוש השכר בלבד — לא העו"ש'
          });
          updatedBorrowers[idx] = { ...updatedBorrowers[idx], employer: dominant };
        }
      });

      return Response.json({ borrowers: updatedBorrowers, log });
    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }),
};
