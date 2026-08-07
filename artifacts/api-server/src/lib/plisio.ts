import crypto from "crypto";

const BASE = "https://plisio.net/api/v1";

function getApiKey(): string {
  return process.env.PLISIO_API_KEY || "";
}

function getSecretKey(): string {
  return process.env.PLISIO_SECRET_KEY || "";
}

export function isConfigured(): boolean {
  return !!getApiKey();
}

/** USDT BEP20 and BNB are the only supported currencies */
export const SUPPORTED_CURRENCIES = [
  { id: "USDTBSC", label: "USDT (BEP20)", icon: "₮", network: "BSC" },
  { id: "BNB",     label: "BNB",          icon: "⬡", network: "BSC" },
];

async function plisioGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("api_key", getApiKey());
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  const json = await res.json() as any;

  if (json.status !== "success") {
    const msg = json.data?.message || json.message || `Plisio API error`;
    throw new Error(msg);
  }
  return json.data as T;
}

export interface PlisioInvoice {
  txn_id: string;
  invoice_url: string;
  wallet: string;
  amount: string;
  source_amount: string;
  source_currency: string;
  currency: string;
  expire_utc: string;
  qr_code?: string;
}

export async function createInvoice(params: {
  currency: "USDTBSC" | "BNB";
  amountUsd: number;
  orderId: string;
  orderName: string;
  callbackUrl: string;
  successUrl?: string;
  failUrl?: string;
}): Promise<PlisioInvoice> {
  return plisioGet<PlisioInvoice>("/invoices/new", {
    currency: params.currency,
    amount: String(params.amountUsd),
    source_currency: "USD",
    order_number: params.orderId,
    order_name: params.orderName,
    callback_url: params.callbackUrl,
    ...(params.successUrl ? { success_url: params.successUrl } : {}),
    ...(params.failUrl    ? { fail_url:    params.failUrl    } : {}),
    expire_min: "60",
  });
}

export interface PlisioTransaction {
  txn_id: string;
  status: "new" | "pending" | "completed" | "error" | "cancelled" | "expired" | "mismatch";
  amount: string;
  currency: string;
  source_amount: string;
  source_currency: string;
  order_number: string;
}

export async function getTransaction(txnId: string): Promise<PlisioTransaction> {
  return plisioGet<PlisioTransaction>(`/transactions/${txnId}`);
}

/**
 * Verify a Plisio webhook callback.
 * Plisio sends all params as POST body; verify_hash = md5(sorted values + secret_key)
 */
export function verifyWebhook(data: Record<string, string>): boolean {
  const secret = getSecretKey();
  if (!secret) return true; // skip verification if secret not configured

  const hash = data.verify_hash;
  if (!hash) return false;

  const sorted = Object.entries(data)
    .filter(([k]) => k !== "verify_hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
    .join("");

  const computed = crypto.createHash("md5").update(sorted + secret).digest("hex");
  return computed === hash;
}

/** Map Plisio status to our internal tip/payment status */
export function mapStatus(plisioStatus: string): string {
  switch (plisioStatus) {
    case "new":        return "waiting";
    case "pending":    return "confirming";
    case "completed":  return "finished";
    case "error":      return "failed";
    case "cancelled":  return "failed";
    case "expired":    return "expired";
    case "mismatch":   return "partially_paid";
    default:           return "waiting";
  }
}
