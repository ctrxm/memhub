import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Wallet as WalletIcon, TrendingUp, Clock, ArrowDownRight, ArrowUpRight, ChevronLeft, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/shared";
import { Avatar } from "@/components/ui/shared";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  waiting: { label: "Waiting", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  confirming: { label: "Confirming", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  confirmed: { label: "Confirmed", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  sending: { label: "Sending", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  partially_paid: { label: "Partial", className: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  finished: { label: "Completed", className: "bg-green-500/15 text-green-400 border-green-500/30" },
  failed: { label: "Failed", className: "bg-destructive/15 text-destructive border-destructive/30" },
  refunded: { label: "Refunded", className: "bg-muted/50 text-muted-foreground border-border" },
  expired: { label: "Expired", className: "bg-muted/50 text-muted-foreground border-border" },
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
  received: any[];
  sent: any[];
}

export default function Wallet() {
  const { isAuthenticated, token, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"received" | "sent">("received");

  useEffect(() => {
    if (!isAuthenticated || !token) { setLoading(false); return; }
    fetch(`${BASE}/api/tips/wallet`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setData)
      .catch(() => toast({ title: "Failed to load wallet", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [isAuthenticated, token]);

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

  if (!data?.tipsEnabled) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Tips Not Enabled</h2>
        <p className="text-muted-foreground mb-6">Your account doesn't have the tip feature activated yet. Apply to unlock your wallet.</p>
        <Button onClick={() => setLocation("/tip-apply")} className="gap-2">
          Apply for Tip Feature <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  const currentList = tab === "received" ? data.received : data.sent;

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
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-5 rounded-2xl border border-green-500/20 bg-green-500/5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Total Received</span>
          </div>
          <p className="text-3xl font-bold text-green-300">${data.totalReceived}</p>
          <p className="text-xs text-muted-foreground mt-1">USD equivalent</p>
        </div>
        <div className="p-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">Pending</span>
          </div>
          <p className="text-3xl font-bold text-yellow-300">${data.pendingReceived}</p>
          <p className="text-xs text-muted-foreground mt-1">Awaiting confirmation</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-xl mb-6">
        <button
          onClick={() => setTab("received")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "received" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <ArrowDownRight className="w-4 h-4 text-green-400" /> Received ({data.received.length})
        </button>
        <button
          onClick={() => setTab("sent")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "sent" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <ArrowUpRight className="w-4 h-4 text-primary" /> Sent ({data.sent.length})
        </button>
      </div>

      {/* Transaction list */}
      {currentList.length === 0 ? (
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
                <p className="font-bold text-base">${tip.amountUsd.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground uppercase">{tip.cryptoCurrency}</p>
                <div className="mt-1">
                  <StatusBadge status={tip.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
