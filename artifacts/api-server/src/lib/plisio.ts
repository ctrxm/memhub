import crypto from "crypto";

const BASE = "https://plisio.net/api/v1";

/**
 * Plisio uses ONE "Secret Key" from the API settings page.
 * That same key is used as the api_key query param AND for webhook verification.
 * The user may have saved it as PLISIO_SECRET_KEY or PLISIO_API_KEY — try both.
 */
function getSecretKey(): string {
  return process.env.PLISIO_SECRET_KEY || process.env.PLISIO_API_KEY || "";
}

export function isConfigured(): boolean {
  return !!getSecretKey();
}

/** Plisio-supported currencies (USDT TRC20 + BNB) */
export const SUPPORTED_CURRENCIES = [
  { id: "USDTTRC20", label: "USDT (TRC20)", icon: "₮", network: "TRON" },
  { id: "BNB",       label: "BNB",          icon: "⬡", network: "BSC" },
];

async function plisioGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("api_key", getSecretKey());
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString());
  const json = await res.json() as any;

  if (json.status !== "success") {
    const msg = json.data?.message || json.message || `Plisio API error: status=${json.status}`;
    throw new Error(msg);
  }
  return json.data as T;
}

/** Invoice response from Plisio /invoices/new */
export interface PlisioInvoice {
  txn_id: string;
  invoice_url: string;
  invoice_total_sum: string; // crypto amount
  source_amount?: string;    // fiat amount
  source_currency?: string;  // e.g. "USD"
  currency?: string;         // e.g. "USDTBSC"
  expire_utc?: string;
}

export async function createInvoice(params: {
  currency: "USDTBSC" | "BNB";
  amountUsd: number;
  orderId: string;
  orderName: string;
  callbackUrl?: string;
  successUrl?: string;
  failUrl?: string;
}): Promise<PlisioInvoice> {
  const queryParams: Record<string, string> = {
    currency: params.currency,
    source_currency: "USD",
    source_amount: String(params.amountUsd),
    order_number: params.orderId,
    order_name: params.orderName,
    expire_min: "60",
  };

  if (params.callbackUrl) queryParams.callback_url = params.callbackUrl;
  if (params.successUrl) queryParams.success_invoice_url = params.successUrl;
  if (params.failUrl) queryParams.fail_invoice_url = params.failUrl;

  return plisioGet<PlisioInvoice>("/invoices/new", queryParams);
}

export interface PlisioTransaction {
  txn_id: string;
  status: string;
  amount: string;
  currency: string;
  source_amount?: string;
  source_currency?: string;
  order_number?: string;
}

export async function getTransaction(txnId: string): Promise<PlisioTransaction> {
  return plisioGet<PlisioTransaction>(`/operations/${txnId}`);
}

/**
 * Verify a Plisio webhook callback.
 * Plisio webhook POST body includes verify_hash.
 * To verify: sort all params alphabetically (excluding verify_hash),
 * concatenate values, append the Secret Key, compute MD5.
 */
export function verifyWebhook(data: Record<string, string>): boolean {
  const secret = getSecretKey();
  if (!secret) return true; // skip verification if not configured

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
    case "new":
    case "pending":
      return "waiting";
    case "pending internal":
    case "confirming":
      return "confirming";
    case "completed":
      return "finished";
    case "error":
    case "cancelled":
      return "failed";
    case "expired":
      return "expired";
    case "mismatch":
      return "partially_paid";
    default:
      return "waiting";
  }
}
