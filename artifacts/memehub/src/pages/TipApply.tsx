import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/shared";
import { Check, X, Loader2, Users, Award, ShieldCheck, Wallet, ArrowRight, Clock, ChevronLeft } from "lucide-react";
import { OvrHubLogoIcon } from "@/components/ui/OvrHubLogo";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiGet(path: string, token: string) {
  const res = await fetch(`${BASE}/api${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

async function apiPost(path: string, token: string, body: object = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

interface Eligibility {
  eligible: boolean;
  followers: number;
  hasCreatorBadge: boolean;
  notBanned: boolean;
  minFollowers: number;
  tipsEnabled: boolean;
  application: { status: string; rejectionReason?: string; createdAt: string } | null;
}

function RequirementRow({ ok, label, sub }: { ok: boolean; label: string; sub?: string }) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${ok ? "border-green-500/30 bg-green-500/5" : "border-border/50 bg-background"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${ok ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
        {ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      </div>
      <div>
        <p className={`font-semibold text-sm ${ok ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function TipApply() {
  const { isAuthenticated, token } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) { setLoading(false); return; }
    apiGet("/tips/eligibility", token)
      .then(setEligibility)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated, token]);

  const handleApply = async () => {
    if (!token) return;
    setApplying(true);
    try {
      await apiPost("/tips/apply", token);
      toast({ title: "Application submitted!", description: "We'll review your request and notify you." });
      const updated = await apiGet("/tips/eligibility", token);
      setEligibility(updated);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <OvrHubLogoIcon size={48} />
        <h2 className="text-2xl font-bold">Sign in Required</h2>
        <p className="text-muted-foreground">You need to be logged in to apply for the tip feature.</p>
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

  const app = eligibility?.application;
  const alreadyEnabled = eligibility?.tipsEnabled;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to Feed
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Wallet className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Tip Feature</h1>
          <p className="text-muted-foreground">Enable crypto tips on your posts</p>
        </div>
      </div>

      {alreadyEnabled ? (
        <div className="mt-8 p-6 rounded-2xl border border-green-500/30 bg-green-500/5 text-center">
          <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-green-400 mb-1">Tips Enabled!</h2>
          <p className="text-muted-foreground mb-4">Your account already has the tip feature active. Fans can tip you on any of your posts.</p>
          <Button onClick={() => setLocation("/wallet")} className="gap-2">
            <Wallet className="w-4 h-4" /> View My Wallet <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      ) : app?.status === "pending" ? (
        <div className="mt-8 p-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 text-center">
          <Clock className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-yellow-300 mb-1">Application Under Review</h2>
          <p className="text-muted-foreground">Your application was submitted on {new Date(app.createdAt).toLocaleDateString()}. We'll email you once it's reviewed.</p>
        </div>
      ) : app?.status === "rejected" ? (
        <div className="mt-8 p-6 rounded-2xl border border-destructive/30 bg-destructive/5 text-center">
          <X className="w-12 h-12 text-destructive mx-auto mb-3" />
          <h2 className="text-xl font-bold text-destructive mb-1">Application Rejected</h2>
          {app.rejectionReason && <p className="text-muted-foreground mb-2">Reason: {app.rejectionReason}</p>}
          <p className="text-muted-foreground text-sm">You may re-apply once you meet all requirements.</p>
        </div>
      ) : null}

      {/* Requirements */}
      {!alreadyEnabled && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-bold mb-4">Requirements</h2>

          <RequirementRow
            ok={(eligibility?.followers ?? 0) >= (eligibility?.minFollowers ?? 1000)}
            label={`${eligibility?.minFollowers?.toLocaleString() ?? "1,000"} Followers`}
            sub={`You have ${eligibility?.followers?.toLocaleString() ?? 0} followers`}
          />
          <RequirementRow
            ok={eligibility?.hasCreatorBadge ?? false}
            label="Creator Badge"
            sub="Must have a verified creator badge awarded by the admin"
          />
          <RequirementRow
            ok={eligibility?.notBanned ?? true}
            label="Account in Good Standing"
            sub="Your account must not be banned or suspended"
          />

          {(!app || app.status === "rejected") && (
            <Button
              className="w-full mt-6 h-12 text-base font-bold"
              disabled={!eligibility?.eligible || applying}
              isLoading={applying}
              onClick={handleApply}
            >
              {eligibility?.eligible ? "Submit Application" : "Requirements Not Met"}
              {eligibility?.eligible && <ArrowRight className="ml-2 w-5 h-5" />}
            </Button>
          )}

          {!eligibility?.eligible && (
            <p className="text-xs text-muted-foreground text-center">
              Meet all requirements above to unlock the apply button.
            </p>
          )}
        </div>
      )}

      {/* How it works */}
      <div className="mt-12 border-t border-border/40 pt-8">
        <h2 className="text-lg font-bold mb-4">How Tips Work</h2>
        <div className="grid gap-4">
          {[
            { icon: <Users className="w-5 h-5 text-primary" />, title: "Fans send crypto", desc: "Viewers can tip you directly on any of your posts in their preferred cryptocurrency." },
            { icon: <Wallet className="w-5 h-5 text-primary" />, title: "Wallet dashboard", desc: "Track all received tips — total earned, pending, and full transaction history." },
            { icon: <Award className="w-5 h-5 text-primary" />, title: "Powered by NOWPayments", desc: "Secure crypto gateway supporting BTC, ETH, USDT, SOL, and 300+ more currencies." },
          ].map(item => (
            <div key={item.title} className="flex gap-4 p-4 rounded-xl bg-secondary/30 border border-border/40">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">{item.icon}</div>
              <div>
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
