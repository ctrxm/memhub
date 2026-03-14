import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/shared";
import { X, Copy, Check, Loader2, ChevronDown, Zap, RefreshCw, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const PRESET_AMOUNTS = [1, 3, 5, 10, 25];

const CRYPTO_META: Record<string, { name: string; symbol: string; color: string }> = {
  btc:  { name: "Bitcoin",   symbol: "₿", color: "#F7931A" },
  eth:  { name: "Ethereum",  symbol: "Ξ", color: "#627EEA" },
  usdt: { name: "Tether",    symbol: "₮", color: "#26A17B" },
  usdc: { name: "USD Coin",  symbol: "$", color: "#2775CA" },
  ltc:  { name: "Litecoin",  symbol: "Ł", color: "#BFBBBB" },
  bnb:  { name: "BNB",       symbol: "B", color: "#F3BA2F" },
  sol:  { name: "Solana",    symbol: "◎", color: "#9945FF" },
  doge: { name: "Dogecoin",  symbol: "Ð", color: "#C2A633" },
  trx:  { name: "TRON",      symbol: "T", color: "#EF0027" },
};

type Step = "choose" | "payment" | "done";

interface PaymentInfo {
  tipId: number;
  paymentId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  priceAmount: number;
  expiresAt: string;
  status: string;
}

const STATUS_INFO: Record<string, { label: string; color: string; pulse: string }> = {
  waiting:       { label: "Waiting for payment…",      color: "text-yellow-400", pulse: "bg-yellow-400" },
  confirming:    { label: "Confirming on blockchain…", color: "text-blue-400",   pulse: "bg-blue-400" },
  confirmed:     { label: "Confirmed! Processing…",    color: "text-blue-400",   pulse: "bg-blue-400" },
  sending:       { label: "Sending to creator…",       color: "text-blue-400",   pulse: "bg-blue-400" },
  partially_paid:{ label: "Partial payment received",  color: "text-orange-400", pulse: "bg-orange-400" },
  finished:      { label: "Payment complete!",         color: "text-green-400",  pulse: "bg-green-400" },
  failed:        { label: "Payment failed",            color: "text-red-400",    pulse: "bg-red-400" },
  expired:       { label: "Payment expired",           color: "text-muted-foreground", pulse: "bg-muted-foreground" },
};

export function TipModal({
  toUserId,
  toUsername,
  postId,
  onClose,
}: {
  toUserId: string;
  toUsername: string;
  postId?: string;
  onClose: () => void;
}) {
  const { isAuthenticated, token } = useAuth();
  const { toast } = useToast();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>("choose");
  const [amount, setAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [currency, setCurrency] = useState("usdt");
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/tips/currencies`)
      .then(r => r.json())
      .then(d => { if (d.currencies?.length) { setCurrencies(d.currencies); } })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (payment && step === "payment") {
      pollRef.current = setInterval(async () => {
        try {
          setIsPolling(true);
          const r = await fetch(`${BASE}/api/tips/payment/${payment.paymentId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const d = await r.json();
          setPollingStatus(d.status);
          if (d.status === "finished") { clearInterval(pollRef.current!); setStep("done"); }
          else if (["failed", "expired", "refunded"].includes(d.status)) clearInterval(pollRef.current!);
        } catch {} finally { setIsPolling(false); }
      }, 10_000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [payment, step]);

  const actualAmount = useCustom ? parseFloat(customAmount) || 0 : amount;
  const meta = CRYPTO_META[currency];

  const handleCreate = async () => {
    if (!isAuthenticated || !token) { toast({ title: "Login required", variant: "destructive" }); return; }
    if (actualAmount < 1) { toast({ title: "Minimum tip is $1", variant: "destructive" }); return; }
    setIsCreating(true);
    try {
      const res = await fetch(`${BASE}/api/tips/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ toUserId, postId, amountUsd: actualAmount, cryptoCurrency: currency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create payment");
      setPayment(data);
      setStep("payment");
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally { setIsCreating(false); }
  };

  const copyAddress = () => {
    if (!payment?.payAddress) return;
    navigator.clipboard.writeText(payment.payAddress).catch(() => {});
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2500);
  };

  const currentStatus = pollingStatus || payment?.status || "waiting";
  const statusInfo = STATUS_INFO[currentStatus] || { label: currentStatus, color: "text-muted-foreground", pulse: "bg-muted-foreground" };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full sm:max-w-[420px] sm:mx-4 bg-card border border-border/50 sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-300">

        {/* Header */}
        <div className="relative px-5 pt-5 pb-4 border-b border-border/30">
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-border/60 sm:hidden" />
          <div className="flex items-center justify-between mt-2 sm:mt-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" fill="currentColor" />
              </div>
              <div>
                <h2 className="font-bold text-base leading-tight">Tip @{toUsername}</h2>
                <p className="text-xs text-muted-foreground">Send crypto to this creator</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step indicators */}
        {step !== "done" && (
          <div className="flex items-center gap-1 px-5 pt-3 pb-0">
            {(["choose", "payment"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-colors", step === s ? "bg-primary text-primary-foreground" : step === "payment" && s === "choose" ? "bg-green-500 text-white" : "bg-secondary text-muted-foreground")}>
                  {step === "payment" && s === "choose" ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={cn("text-[10px] font-semibold", step === s ? "text-foreground" : "text-muted-foreground")}>
                  {s === "choose" ? "Amount" : "Send"}
                </span>
                {i < 1 && <div className="w-6 h-px bg-border/50 mx-1" />}
              </div>
            ))}
          </div>
        )}

        {/* ── Step: Choose ── */}
        {step === "choose" && (
          <div className="p-5 space-y-5">
            {/* Preset amounts */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Amount (USD)</p>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {PRESET_AMOUNTS.map(a => (
                  <button
                    key={a}
                    onClick={() => { setAmount(a); setUseCustom(false); }}
                    className={cn(
                      "py-2.5 rounded-xl text-sm font-bold border-2 transition-all active:scale-95",
                      !useCustom && amount === a
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30 scale-105"
                        : "bg-secondary/50 text-muted-foreground border-transparent hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    ${a}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUseCustom(v => !v)}
                  className={cn("text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-all", useCustom ? "bg-primary/10 text-primary border-primary/40" : "border-border text-muted-foreground hover:text-foreground hover:border-border/80")}
                >
                  Custom
                </button>
                {useCustom && (
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
                    <input
                      type="number" min="1" step="0.5"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      placeholder="Enter amount"
                      autoFocus
                      className="w-full pl-7 pr-3 py-2 bg-secondary/50 border-2 border-border/60 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Currency picker */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pay with</p>
              <div className="relative">
                <button
                  onClick={() => setShowCurrencyPicker(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-secondary/50 rounded-2xl border-2 border-border/60 hover:border-primary/40 transition-colors"
                >
                  <span className="flex items-center gap-2.5 font-bold">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0" style={{ backgroundColor: meta?.color || "#888" }}>
                      {meta?.symbol || currency[0]?.toUpperCase()}
                    </span>
                    {meta?.name || currency.toUpperCase()}
                    <span className="text-muted-foreground text-xs font-normal uppercase">{currency}</span>
                  </span>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", showCurrencyPicker && "rotate-180")} />
                </button>
                {showCurrencyPicker && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-popover border border-border/60 rounded-2xl shadow-2xl z-20 max-h-52 overflow-y-auto">
                    {(currencies.length ? currencies : Object.keys(CRYPTO_META)).map(c => {
                      const cm = CRYPTO_META[c];
                      return (
                        <button
                          key={c}
                          onClick={() => { setCurrency(c); setShowCurrencyPicker(false); }}
                          className={cn("w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors first:rounded-t-2xl last:rounded-b-2xl", c === currency && "bg-primary/5")}
                        >
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0" style={{ backgroundColor: cm?.color || "#888" }}>
                            {cm?.symbol || c[0]?.toUpperCase()}
                          </span>
                          <span className="font-semibold text-sm">{cm?.name || c.toUpperCase()}</span>
                          <span className="ml-auto text-xs text-muted-foreground uppercase font-bold">{c}</span>
                          {c === currency && <Check className="w-3.5 h-3.5 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Summary card */}
            <div className="rounded-2xl overflow-hidden border border-primary/20">
              <div className="bg-primary/5 px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold">Total tip</span>
                <span className="font-black text-lg text-foreground">${actualAmount.toFixed(2)}</span>
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between border-t border-primary/10">
                <span className="text-xs text-muted-foreground">Currency</span>
                <span className="text-xs font-bold text-primary uppercase">{currency}</span>
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between border-t border-primary/10">
                <span className="text-xs text-muted-foreground">Recipient</span>
                <span className="text-xs font-bold">@{toUsername}</span>
              </div>
            </div>

            {!isAuthenticated ? (
              <Link href="/login">
                <Button className="w-full h-12 font-bold gap-2 text-base">
                  <Zap className="w-5 h-5" fill="currentColor" /> Log in to tip
                </Button>
              </Link>
            ) : (
              <Button
                className="w-full h-12 font-bold gap-2 text-base"
                onClick={handleCreate}
                isLoading={isCreating}
                disabled={actualAmount < 1}
              >
                <Zap className="w-5 h-5" fill="currentColor" />
                Send ${actualAmount.toFixed(2)} Tip
              </Button>
            )}
          </div>
        )}

        {/* ── Step: Payment ── */}
        {step === "payment" && payment && (
          <div className="p-5 space-y-4">
            {/* Amount display */}
            <div className="rounded-2xl bg-secondary/30 border border-border/40 p-4 text-center">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Send exactly</p>
              <p className="text-3xl font-black text-foreground">{payment.payAmount} <span className="text-primary uppercase">{payment.payCurrency}</span></p>
              <p className="text-sm text-muted-foreground mt-1">≈ ${payment.priceAmount} USD</p>
            </div>

            {/* Address */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Send to this {payment.payCurrency.toUpperCase()} address</p>
              <div className="flex items-stretch gap-2">
                <div className="flex-1 p-3 bg-secondary/50 rounded-xl border border-border/50 min-w-0">
                  <p className="text-xs font-mono break-all text-foreground leading-relaxed">{payment.payAddress}</p>
                </div>
                <button
                  onClick={copyAddress}
                  className={cn("shrink-0 w-12 flex items-center justify-center rounded-xl border-2 transition-all", copiedAddress ? "bg-green-500/10 border-green-500/50 text-green-400" : "bg-secondary/50 border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary")}
                >
                  {copiedAddress ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copiedAddress && <p className="text-xs text-green-400 font-semibold mt-1.5 text-center animate-in fade-in">Copied to clipboard!</p>}
            </div>

            {/* Live status */}
            <div className={cn("flex items-center justify-center gap-2 py-3 rounded-xl border", `border-${statusInfo.pulse}/20 bg-${statusInfo.pulse}/5`)}>
              {isPolling
                ? <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                : <span className={cn("w-2.5 h-2.5 rounded-full animate-pulse", statusInfo.pulse)} />
              }
              <p className={cn("text-sm font-bold", statusInfo.color)}>{statusInfo.label}</p>
            </div>

            {payment.expiresAt && (
              <p className="text-[11px] text-muted-foreground text-center">Expires {new Date(payment.expiresAt).toLocaleTimeString()}</p>
            )}
            <p className="text-[11px] text-muted-foreground text-center">Auto-checks every 10 seconds</p>

            <Button variant="outline" className="w-full rounded-xl" onClick={onClose}>Close (payment continues in background)</Button>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === "done" && (
          <div className="p-8 text-center space-y-5">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-green-500/15 border-2 border-green-500/40 flex items-center justify-center">
                <Check className="w-10 h-10 text-green-400" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black mb-1">Tip Sent!</h3>
              <p className="text-muted-foreground text-sm">Your <span className="font-bold text-foreground">${payment?.priceAmount}</span> tip to <span className="font-bold text-foreground">@{toUsername}</span> has been confirmed on the blockchain.</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Wallet className="w-3.5 h-3.5" />
              <span>Transaction verified</span>
            </div>
            <Button className="w-full h-11 font-bold" onClick={onClose}>Done</Button>
          </div>
        )}
      </div>
    </div>
  );
}
