// supabase/functions/_shared/cors.ts
// Supabase Edge Functions don't add CORS headers by default. Since the React
// app calls these functions directly from the browser (a different origin than
// the function's own URL), every request needs these headers or the browser
// blocks it at the preflight (OPTIONS) stage — the fetch fails with a generic
// network error before the function code ever runs. This was the most likely
// cause of "deposit/withdraw show errors even with env vars set".
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
