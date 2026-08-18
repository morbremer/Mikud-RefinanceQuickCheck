import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * whatIfNarrative — NEW function, not a Base44 port.
 *
 * Replaces WhatIfSimulator.jsx's direct-from-frontend
 * base44.integrations.Core.InvokeLLM({ prompt }) call. A Gemini/OpenAI API
 * key can't be exposed client-side, so this thin proxy exists purely to hold
 * the key server-side — same shape as extractSingleChunk's invokeGeminiRaw
 * helper (plain prompt in, plain text out, no schema).
 */
const MODEL = 'gemini-3-flash-preview';

export default {
  fetch: withSupabase({ auth: ["user"] }, async (req, ctx) => {
    try {
      if (ctx.userClaims?.appMetadata?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { prompt } = await req.json();
      if (!prompt) return Response.json({ error: 'prompt is required' }, { status: 400 });

      const apiKey = Deno.env.get('GEMINI_API_KEY');
      if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = genAI.getGenerativeModel({ model: MODEL });

      const result = await geminiModel.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
      return Response.json({ text: result.response.text() });

    } catch (error) {
      console.error('whatIfNarrative error:', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }
  }),
};
