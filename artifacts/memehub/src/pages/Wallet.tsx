import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet as WalletIcon, TrendingUp, Clock, ArrowDownRight, ArrowUpRight,
  ChevronLeft, Loader2, ExternalLink, SendHorizonal, History, CheckCircle2,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/shared";
import { Avatar } from "@/components/ui/shared";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  waiting:        { label: "Waiting",     className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  confirming:     { label: "Confirming",  className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  confirmed:      { label: "Confirmed",   className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  sending:        { label: "Sending",     className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  partially_paid: { label: "Partial",     className: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  finished:       { label: "Completed",   className: "bg-green-500/15 text-green-400 border-green-500/30" },
  completed:      { label: "Completed",   className: "bg-green-500/15 text-green-400 border-green-500/30" },
  failed:         { label: "Failed",      className: "bg-destructive/15 text-destructive border-destructive/30" },
  rejected:       { label: "Rejected",    className: "bg-destructive/15 text-destructive border-destructive/30" },
  refunded:       { label: "Refunded",    className: "bg-muted/50 text-muted-foreground border-border" },
  expired:        { label: "Expired",     className: "bg-muted/50 text-muted-foreground border-border" },
  pending:        { label: "Pending",     className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  processing:     { label: "Processing",  className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || { label: status, className: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.className}`}>
      {s.label}
    </span>
  );
}

interface WalletData {
  tipsEnabled: boolean;
  totalReceived: string;
  pendingReceived: string;
  taskEarnings: string;
  received: any[];
  sent: any[];
}

export default function Wallet() {
  const { isAuthenticated, token, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"received" | "sent" | "withdraw">("received");

  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawForm, setWithdrawForm] = useState({ address: "", currency: "USDT", amountUsd: "" });
  const [withdrawing, setWithdrawing] = useState(false);

  const taskEarnings = data ? parseFloat(data.taskEarnings || "0") : 0;
  const tipsReceived = data ? parseFloat(data.totalReceived || "0") : 0;

  const availableBalance = (() => {
    if (!data) return 0;
    const total = tipsReceived + taskEarnings;
    const completedW = withdrawals.filter(w => w.status === "completed").reduce((s: number, w: any) => s + parseFloat(w.amountUsd), 0);
    const pendingW = withdrawals.filter(w => ["pending", "processing"].includes(w.status)).reduce((s: number, w: any) => s + parseFloat(w.amountUsd), 0);
    return Math.max(0, total - completedW - pendingW);
  })();

  const fetchData = () => {
    if (!isAuthenticated || !token) { setLoading(false); return; }
    Promise.all([
      fetch(`${BASE}/api/tips/wallet`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${BASE}/api/tips/withdraw/history`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([walletData, historyData]) => {
        setData(walletData);
        setWithdrawals(historyData.withdrawals || []);
      })
      .catch(() => toast({ title: "Failed to load wallet", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [isAuthenticated, token]);

  const handleWithdraw = async () => {
    if (!token) return;
    const { address, currency, amountUsd } = withdrawForm;
    if (!address.trim()) return toast({ title: "Address required", description: "Enter your crypto wallet address.", variant: "destructive" });
    const amount = parseFloat(amountUsd);
    if (!amount || amount <= 0) return toast({ title: "Invalid amount", description: "Enter a valid amount.", variant: "destructive" });
    if (amount > availableBalance) return toast({ title: "Insufficient balance", description: `Max available: $${availableBalance.toFixed(2)}`, variant: "destructive" });

    setWithdrawing(true);
    try {
      const res = await fetch(`${BASE}/api/tips/withdraw/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ address: address.trim(), currency, amountUsd: amount }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Withdrawal failed");
      toast({ title: "Withdrawal submitted!", description: "Admin will process your request shortly." });
      setWithdrawals(prev => [result.withdrawal, ...prev]);
      setWithdrawForm(f => ({ ...f, address: "", amountUsd: "" }));
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setWithdrawing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <WalletIcon className="w-12 h-12 text-primary" />
        <h2 className="text-2xl font-bold">Sign in Required</h2>
        <Link href="/login"><Button>Log in</Button></Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasAnyBalance = tipsReceived > 0 || taskEarnings > 0 || withdrawals.length > 0;
  const showTipsTabs = data?.tipsEnabled;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to Feed
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <WalletIcon className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">My Wallet</h1>
          <p className="text-muted-foreground">@{user?.username}</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className={`grid gap-3 mb-8 ${showTipsTabs ? "grid-cols-4" : "grid-cols-2"}`}>
        {showTipsTabs && (
          <>
            <div className="p-4 rounded-2xl border border-green-500/20 bg-green-500/5">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[10px] font-semibold text-green-400 uppercase tracking-wide">Tips Received</span>
              </div>
              <p className="text-xl font-bold text-green-300">${data?.totalReceived}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Completed tips</p>
            </div>
            <div className="p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wide">Pending</span>
              </div>
              <p className="text-xl font-bold text-yellow-300">${data?.pendingReceived}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Awaiting confirm</p>
            </div>
          </>
        )}
        <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5">
          <div className="flex items-center gap-1.5 mb-1">
            <Briefcase className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide">Task Rewards</span>
          </div>
          <p className="text-xl font-bold text-purple-300">${taskEarnings.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Approved earnings</p>
        </div>
        <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Available</span>
          </div>
          <p className="text-xl font-bold text-primary">${availableBalance.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Withdrawable</p>
        </div>
      </div>

      {/* Tips not enabled notice */}
      {!showTipsTabs && (
        <div className="mb-6 p-4 rounded-xl border border-border/50 bg-secondary/20 flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Tips not enabled</p>
            <p className="text-xs text-muted-foreground mt-0.5">Your tip feature isn't active yet. You can still withdraw task rewards above.</p>
            <button onClick={() => setLocation("/tip-apply")} className="mt-2 text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
              Apply for Tips <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-xl mb-6">
        {showTipsTabs && (
          <>
            <button
              onClick={() => setTab("received")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === "received" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ArrowDownRight className="w-3.5 h-3.5 text-green-400" /> Received ({data?.received.length ?? 0})
            </button>
            <button
              onClick={() => setTab("sent")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === "sent" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-primary" /> Sent ({data?.sent.length ?? 0})
            </button>
          </>
        )}
        <button
          onClick={() => setTab("withdraw")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === "withdraw" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <SendHorizonal className="w-3.5 h-3.5 text-orange-400" /> Withdraw
        </button>
      </div>

      {/* Withdraw Tab */}
      {tab === "withdraw" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl border border-border/60 bg-secondary/20 space-y-4">
            <h3 className="font-bold text-base flex items-center gap-2">
              <SendHorizonal className="w-4 h-4 text-orange-400" /> Request Withdrawal
            </h3>
            <p className="text-xs text-muted-foreground">
              Available balance: <span className="font-bold text-foreground">${availableBalance.toFixed(2)} USD</span>
              {taskEarnings > 0 && <span className="ml-2 text-purple-400">(includes ${taskEarnings.toFixed(2)} task rewards)</span>}
            </p>

            {/* Currency */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Crypto Currency</label>
              <div className="flex flex-wrap gap-2">
                {["USDT", "BNB"].map(coin => (
                  <button
                    key={coin}
                    onClick={() => setWithdrawForm(f => ({ ...f, currency: coin }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase border transition-colors ${withdrawForm.currency === coin ? "bg-primary text-primary-foreground border-primary" : "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
                  >
                    {coin}
                  </button>
                ))}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your {withdrawForm.currency} Address</label>
              <input
                type="text"
                value={withdrawForm.address}
                onChange={e => setWithdrawForm(f => ({ ...f, address: e.target.value }))}
                placeholder={`Enter your ${withdrawForm.currency} wallet address`}
                className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-mono focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount (USD)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={availableBalance}
                  value={withdrawForm.amountUsd}
                  onChange={e => setWithdrawForm(f => ({ ...f, amountUsd: e.target.value }))}
                  placeholder="0.00"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={() => setWithdrawForm(f => ({ ...f, amountUsd: availableBalance.toFixed(2) }))}
                  className="px-3 py-2.5 rounded-xl border border-border/60 text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>

            <Button
              className="w-full h-11 font-bold gap-2"
              onClick={handleWithdraw}
              disabled={withdrawing || availableBalance <= 0}
              isLoading={withdrawing}
            >
              <SendHorizonal className="w-4 h-4" />
              {availableBalance <= 0 ? "No Balance to Withdraw" : "Submit Withdrawal Request"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">Withdrawals are processed manually by admin within 1–3 business days.</p>
          </div>

          {/* Withdrawal History */}
          {withdrawals.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2 text-muted-foreground">
                <History className="w-4 h-4" /> Withdrawal History
              </h3>
              {withdrawals.map((w: any) => (
                <div key={w.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-secondary/20">
                  <div className="w-9 h-9 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <SendHorizonal className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-muted-foreground truncate">{w.address}</p>
                    <p className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleDateString()} · {w.currency.toUpperCase()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold">${parseFloat(w.amountUsd).toFixed(2)}</p>
                    <div className="mt-1"><StatusBadge status={w.status} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Received / Sent Tabs (tips only) */}
      {showTipsTabs && tab !== "withdraw" && (
        (() => {
          const currentList = tab === "received" ? (data?.received ?? []) : (data?.sent ?? []);
          return currentList.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <WalletIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No {tab} tips yet</p>
              <p className="text-sm mt-1">{tab === "received" ? "Share your posts and your fans can tip you!" : "You haven't tipped anyone yet."}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentList.map((tip: any) => (
                <div key={tip.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors">
                  {tab === "received" ? (
                    <>
                      <div className="relative">
                        <Avatar src={tip.from?.avatar} fallback={tip.from?.username || "?"} className="w-10 h-10" />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                          <ArrowDownRight className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">
                          {tip.from ? (
                            <Link href={`/u/${tip.from.username}`} className="hover:text-primary transition-colors">{tip.from.username}</Link>
                          ) : "Anonymous"}
                        </p>
                        {tip.post && (
                          <p className="text-xs text-muted-foreground truncate">
                            on <Link href={`/post/${tip.postId}`} className="hover:underline">{tip.post.title}</Link>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">{new Date(tip.createdAt).toLocaleDateString()}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <Avatar src={tip.to?.avatar} fallback={tip.to?.username || "?"} className="w-10 h-10" />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <ArrowUpRight className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">
                          to{" "}
                          {tip.to ? (
                            <Link href={`/u/${tip.to.username}`} className="hover:text-primary transition-colors">{tip.to.username}</Link>
                          ) : "Unknown"}
                        </p>
                        {tip.post && (
                          <p className="text-xs text-muted-foreground truncate">
                            for <Link href={`/post/${tip.postId}`} className="hover:underline">{tip.post.title}</Link>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">{new Date(tip.createdAt).toLocaleDateString()}</p>
                      </div>
                    </>
                  )}
                  <div className="text-right shrink-0">
                    <p className="font-bold text-base">${parseFloat(tip.amountUsd).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground uppercase">{tip.cryptoCurrency}</p>
                    <div className="mt-1">
                      <StatusBadge status={tip.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()
      )}
    </div>
  );
}
