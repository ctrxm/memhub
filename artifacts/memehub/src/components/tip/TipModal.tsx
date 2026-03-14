import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/shared";
import { X, Copy, Check, Loader2, ChevronDown, Zap, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const PRESET_AMOUNTS = [1, 3, 5, 10, 25];

const CRYPTO_LABELS: Record<string, { name: string; icon: string }> = {
  btc: { name: "Bitcoin", icon: "₿" },
  eth: { name: "Ethereum", icon: "Ξ" },
  usdt: { name: "Tether", icon: "₮" },
  usdc: { name: "USD Coin", icon: "$" },
  ltc: { name: "Litecoin", icon: "Ł" },
  bnb: { name: "BNB", icon: "B" },
  sol: { name: "Solana", icon: "◎" },
  doge: { name: "Dogecoin", icon: "Ð" },
  trx: { name: "TRON", icon: "T" },
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
  const { isAuthenticated, token, user } = useAuth();
  const { toast } = useToast();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>("choose");
  const [amount, setAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [currency, setCurrency] = useState("btc");
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
      .then(d => { if (d.currencies?.length) { setCurrencies(d.currencies); setCurrency(d.currencies[0]); } })
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
          if (d.status === "finished") {
            if (pollRef.current) clearInterval(pollRef.current);
            setStep("done");
          } else if (["failed", "expired", "refunded"].includes(d.status)) {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch {}
        finally { setIsPolling(false); }
      }, 10_000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [payment, step]);

  const actualAmount = useCustom ? parseFloat(customAmount) || 0 : amount;

  const handleCreate = async () => {
    if (!isAuthenticated || !token) {
      toast({ title: "Login required", variant: "destructive" });
      return;
    }
    if (actualAmount < 1) {
      toast({ title: "Minimum tip is $1", variant: "destructive" });
      return;
    }
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
    } finally {
      setIsCreating(false);
    }
  };

  const copyAddress = () => {
    if (!payment?.payAddress) return;
    navigator.clipboard.writeText(payment.payAddress).catch(() => {});
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2500);
  };

  const STATUS_INFO: Record<string, { label: string; color: string }> = {
    waiting: { label: "Waiting for payment…", color: "text-yellow-400" },
    confirming: { label: "Confirming on blockchain…", color: "text-blue-400" },
    confirmed: { label: "Confirmed! Processing…", color: "text-blue-400" },
    sending: { label: "Sending to creator…", color: "text-blue-400" },
    partially_paid: { label: "Partial payment received", color: "text-orange-400" },
    finished: { label: "Payment complete!", color: "text-green-400" },
    failed: { label: "Payment failed", color: "text-destructive" },
    expired: { label: "Payment expired", color: "text-muted-foreground" },
  };

  const currentStatus = pollingStatus || payment?.status || "waiting";
  const statusInfo = STATUS_INFO[currentStatus];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-md bg-card border border-border/60 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/40">
          <div>
            <h2 className="text-lg font-bold">Tip {toUsername}</h2>
            <p className="text-xs text-muted-foreground">Send crypto directly to this creator</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step: Choose amount + currency */}
        {step === "choose" && (
          <div className="p-5 space-y-5">
            {/* Presets */}
            <div>
              <p className="text-sm font-semibold mb-2 text-muted-foreground">Choose amount (USD)</p>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {PRESET_AMOUNTS.map(a => (
                  <button
                    key={a}
                    onClick={() => { setAmount(a); setUseCustom(false); }}
                    className={cn(
                      "py-2 rounded-xl text-sm font-bold border transition-colors",
                      !useCustom && amount === a
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-muted-foreground border-border hover:border-primary hover:text-foreground"
                    )}
                  >
                    ${a}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUseCustom(v => !v)}
                  className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors", useCustom ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground")}
                >
                  Custom
                </button>
                {useCustom && (
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full pl-7 pr-3 py-2 bg-background border border-border rounded-xl text-sm font-semibold focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Currency picker */}
            <div>
              <p className="text-sm font-semibold mb-2 text-muted-foreground">Pay with</p>
              <div className="relative">
                <button
                  onClick={() => setShowCurrencyPicker(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-secondary rounded-xl border border-border hover:border-primary transition-colors"
                >
                  <span className="flex items-center gap-2 font-bold">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-black">
                      {CRYPTO_LABELS[currency]?.icon || currency[0]?.toUpperCase()}
                    </span>
                    {CRYPTO_LABELS[currency]?.name || currency.toUpperCase()}
                    <span className="text-muted-foreground text-xs font-normal">({currency.toUpperCase()})</span>
                  </span>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showCurrencyPicker && "rotate-180")} />
                </button>
                {showCurrencyPicker && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                    {currencies.map(c => (
                      <button
                        key={c}
                        onClick={() => { setCurrency(c); setShowCurrencyPicker(false); }}
                        className={cn("w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary transition-colors", c === currency && "text-primary font-bold")}
                      >
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-black">
                          {CRYPTO_LABELS[c]?.icon || c[0]?.toUpperCase()}
                        </span>
                        {CRYPTO_LABELS[c]?.name || c.toUpperCase()}
                        <span className="text-muted-foreground text-xs ml-auto">{c.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">You're tipping</span>
                <span className="font-bold text-foreground">${actualAmount.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-muted-foreground">Paid in</span>
                <span className="font-bold text-primary">{currency.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-muted-foreground">To</span>
                <span className="font-bold">@{toUsername}</span>
              </div>
            </div>

            {!isAuthenticated ? (
              <Link href="/login">
                <Button className="w-full h-12 font-bold">Log in to send tip</Button>
              </Link>
            ) : (
              <Button
                className="w-full h-12 font-bold gap-2"
                onClick={handleCreate}
                isLoading={isCreating}
                disabled={actualAmount < 1}
              >
                <Zap className="w-5 h-5" /> Send ${actualAmount.toFixed(2)} Tip
              </Button>
            )}
          </div>
        )}

        {/* Step: Payment address */}
        {step === "payment" && payment && (
          <div className="p-5 space-y-4">
            <div className="text-center py-2">
              <p className="text-2xl font-black text-primary">{payment.payAmount} {payment.payCurrency.toUpperCase()}</p>
              <p className="text-sm text-muted-foreground">= ${payment.priceAmount} USD</p>
            </div>

            {/* Address */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Send to this address:</p>
              <div className="flex items-center gap-2 p-3 bg-secondary rounded-xl border border-border">
                <p className="flex-1 text-xs font-mono break-all text-foreground">{payment.payAddress}</p>
                <button
                  onClick={copyAddress}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  {copiedAddress ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-primary" />}
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-center gap-2 py-2">
              {isPolling ? (
                <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              )}
              <p className={cn("text-sm font-semibold", statusInfo?.color || "text-muted-foreground")}>
                {statusInfo?.label || currentStatus}
              </p>
            </div>

            {payment.expiresAt && (
              <p className="text-xs text-muted-foreground text-center">
                Expires: {new Date(payment.expiresAt).toLocaleString()}
              </p>
            )}

            <p className="text-xs text-muted-foreground text-center">
              This page checks status automatically every 10 seconds.
            </p>

            <Button variant="outline" className="w-full" onClick={onClose}>Close (payment continues)</Button>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold">Tip sent!</h3>
            <p className="text-muted-foreground">Your ${payment?.priceAmount} tip to @{toUsername} has been confirmed on the blockchain.</p>
            <Button className="w-full" onClick={onClose}>Done</Button>
          </div>
        )}
      </div>
    </div>
  );
}
