// supabase/functions/_shared/gpay.service.ts
// IMPORTANT: This file must only ever run server-side (Supabase Edge Functions).
// GPAY secret/api keys must NEVER be bundled into the React app — that would
// leak them to every visitor. All GPAY calls go through Edge Functions below.

function generateSalt(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

async function hmacSha256Base64(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function buildQueryString(params: Record<string, unknown>): string {
  const sortedKeys = Object.keys(params).sort();
  return sortedKeys
    .map((key) => `${key}=${params[key] ?? ''}`)
    .join('&');
}

export class GPayService {
  constructor(
    private apiKey: string,
    private secretKey: string,
    private password: string,
    private baseUrl = 'https://gpay.ly/banking/api/onlinewallet/v1'
  ) {}

  private async signRequest(params: Record<string, unknown>) {
    const salt = generateSalt();
    const hashToken = salt + this.password;
    const queryString = buildQueryString(params);
    const hash = await hmacSha256Base64(this.secretKey, hashToken + queryString);
    return {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Accept-Language': 'ar',
        'Content-Type': 'application/json',
        'X-Signature-Salt': salt,
        'X-Signature-Hash': hash
      }
    };
  }

  private async request(endpoint: string, params: Record<string, unknown>) {
    const { headers } = await this.signRequest(params);
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GPay API Error ${res.status}: ${errText}`);
    }
    const data = await res.json();
    // TODO: verify response signature per GPAY docs before trusting `data`.
    return data.data;
  }

  getBalance() {
    return this.request('/info/balance', { request_timestamp: Date.now().toString() });
  }

  createPaymentRequest(amount: number, referenceNo?: string, description?: string) {
    return this.request('/payment/create-payment-request', {
      request_timestamp: Date.now().toString(),
      amount: amount.toFixed(3),
      ...(referenceNo ? { reference_no: referenceNo } : {}),
      ...(description ? { description } : {})
    });
  }

  checkPaymentStatus(requestId: string) {
    return this.request('/payment/check-payment-status', {
      request_timestamp: Date.now().toString(),
      request_id: requestId
    });
  }

  sendMoney(amount: number, walletGatewayId: string, referenceNo?: string, description?: string) {
    return this.request('/payment/send-money', {
      request_timestamp: Date.now().toString(),
      amount: amount.toFixed(3),
      wallet_gateway_id: walletGatewayId,
      ...(referenceNo ? { reference_no: referenceNo } : {}),
      description: description || 'سحب من محفظة الصرافة'
    });
  }

  checkWallet(walletGatewayId: string) {
    return this.request('/info/check-wallet', {
      request_timestamp: Date.now().toString(),
      wallet_gateway_id: walletGatewayId
    });
  }

  getDayStatement(date: string) {
    return this.request('/info/statement', { request_timestamp: Date.now().toString(), date });
  }
}

export function gpayFromEnv() {
  return new GPayService(
    Deno.env.get('GPAY_API_KEY')!,
    Deno.env.get('GPAY_SECRET_KEY')!,
    Deno.env.get('GPAY_PASSWORD')!,
    Deno.env.get('GPAY_BASE_URL') || undefined
  );
}
