const SANDBOX = process.env.NOWPAYMENTS_SANDBOX === "true";
const BASE = SANDBOX
  ? "https://api-sandbox.nowpayments.io/v1"
  : "https://api.nowpayments.io/v1";

const API_KEY = process.env.NOWPAYMENTS_API_KEY || "";

async function npFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    throw new Error((data?.message as string) || `NOWPayments error ${res.status}`);
  }
  return data as T;
}

export interface NpPayment {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  expiration_estimate_date: string;
  created_at: string;
}

export async function createPayment(params: {
  priceAmount: number;
  priceCurrency: string;
  payCurrency: string;
  orderId: string;
  orderDescription: string;
  ipnCallbackUrl?: string;
}): Promise<NpPayment> {
  return npFetch<NpPayment>("/payment", {
    method: "POST",
    body: JSON.stringify({
      price_amount: params.priceAmount,
      price_currency: params.priceCurrency,
      pay_currency: params.payCurrency,
      order_id: params.orderId,
      order_description: params.orderDescription,
      ...(params.ipnCallbackUrl ? { ipn_callback_url: params.ipnCallbackUrl } : {}),
    }),
  });
}

export async function getPayment(paymentId: string): Promise<NpPayment> {
  return npFetch<NpPayment>(`/payment/${paymentId}`);
}

export async function getAvailableCurrencies(): Promise<string[]> {
  const data = await npFetch<{ currencies: string[] }>("/currencies");
  return data.currencies || [];
}

export async function getStatus(): Promise<{ message: string }> {
  return npFetch<{ message: string }>("/status");
}

export function isConfigured(): boolean {
  return !!API_KEY;
}
