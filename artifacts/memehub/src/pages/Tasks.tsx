import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/shared";
import { useLocation } from "wouter";
import {
  Briefcase, Lock, CheckCircle2, Clock, XCircle, ChevronRight,
  Loader2, ExternalLink, Copy, RefreshCw, DollarSign, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CURRENCIES = [
  { id: "USDTTRC20", label: "USDT (TRC20)", icon: "₮", color: "text-green-400" },
  { id: "BNB",     label: "BNB",           icon: "⬡", color: "text-yellow-400" },
];

const COMPLETION_STATUS: Record<string, { label: string; color: string }> = {
  submitted: { label: "Under Review", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  approved:  { label: "Approved ✓",   color: "text-green-400 bg-green-400/10 border-green-400/30" },
  rejected:  { label: "Rejected",     color: "text-red-400 bg-red-400/10 border-red-400/30" },
};

interface Task {
  id: number;
  title: string;
  description: string;
  instructions: string;
  rewardUsd: string;
  maxCompletions: number;
  completionsCount: number;
  spotsLeft: number;
  status: string;
  mySubmission: any;
  createdAt: string;
}

export default function Tasks() {
  const { isAuthenticated, token, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [unlockStatus, setUnlockStatus] = useState<{ unlocked: boolean; unlockFeeUsd: number; pendingPayment: any } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tasks" | "mine">("tasks");

  // Unlock payment state
  const [selectedCurrency, setSelectedCurrency] = useState("USDTTRC20");
  const [paying, setPaying] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [polling, setPolling] = useState(false);

  // Submit state
  const [submitTask, setSubmitTask] = useState<Task | null>(null);
  const [proofText, setProofText] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !token) { setLoading(false); return; }
    try {
      const [statusRes, tasksRes, subRes] = await Promise.all([
        fetch(`${BASE}/api/tasks/unlock-status`, { headers }),
        fetch(`${BASE}/api/tasks`),
        fetch(`${BASE}/api/tasks/my-submissions`, { headers }),
      ]);
      const [statusData, tasksData, subData] = await Promise.all([
        statusRes.json(), tasksRes.json(), subRes.json(),
      ]);
      setUnlockStatus(statusData);
      setTasks(tasksData.tasks || []);
      setSubmissions(subData.submissions || []);
    } catch {
      toast({ title: "Error loading tasks", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Poll invoice status
  useEffect(() => {
    if (!invoiceData?.txnId || !token) return;
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      setPolling(true);
      try {
        const res = await fetch(`${BASE}/api/tasks/unlock-payment/${invoiceData.txnId}`, { headers });
        const data = await res.json();
        if (data.status === "completed") {
          setInvoiceData(null);
          setPolling(false);
          toast({ title: "Payment confirmed! Task access unlocked 🎉" });
          fetchData();
          return;
        }
        if (["expired", "failed"].includes(data.status)) {
          setInvoiceData(null);
          setPolling(false);
          toast({ title: "Payment expired or failed. Please try again.", variant: "destructive" });
          return;
        }
      } catch { /* ignore */ }
      setTimeout(poll, 8000);
    };
    const t = setTimeout(poll, 5000);
    return () => { stopped = true; clearTimeout(t); };
  }, [invoiceData?.txnId, token]);

  const handleUnlock = async () => {
    if (!isAuthenticated) { setLocation("/login"); return; }
    setPaying(true);
    try {
      const res = await fetch(`${BASE}/api/tasks/unlock`, {
        method: "POST", headers,
        body: JSON.stringify({ currency: selectedCurrency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create invoice");
      setInvoiceData(data);
    } catch (err: any) {
      toast({ title: err.message || "Failed to create payment", variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  const handleSubmit = async () => {
    if (!submitTask) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/tasks/${submitTask.id}/submit`, {
        method: "POST", headers,
        body: JSON.stringify({ proofText, proofUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit");
      toast({ title: "Submission sent! Admin will review it shortly." });
      setSubmitTask(null);
      setProofText(""); setProofUrl("");
      fetchData();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast({ title: "Copied!" }));
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <Briefcase className="w-16 h-16 text-primary mx-auto mb-4 opacity-60" />
          <h1 className="text-2xl font-bold mb-2">Task Board</h1>
          <p className="text-muted-foreground mb-6">Login to earn money by completing tasks</p>
          <Button onClick={() => setLocation("/login")}>Login to Continue</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-primary" /> Task Board
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Complete tasks and earn crypto rewards</p>
          </div>
          {unlockStatus?.unlocked && (
            <button onClick={fetchData} className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !unlockStatus?.unlocked ? (
          /* ── LOCKED STATE ── */
          <div className="space-y-4">
            {invoiceData ? (
              /* Payment pending */
              <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-400/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="font-bold">Waiting for Payment</h2>
                    <p className="text-sm text-muted-foreground">Send exactly the amount below to unlock task access</p>
                  </div>
                </div>

                <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">USD Amount</span>
                    <span className="font-bold text-lg">${invoiceData.amountUsd} USD</span>
                  </div>
                  {invoiceData.amount && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Crypto Amount</span>
                      <span className="font-semibold text-sm">{invoiceData.amount} {invoiceData.currency}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Open the invoice page to get the exact payment address and complete your payment.</p>
                </div>

                <div className="flex gap-3">
                  {invoiceData.invoiceUrl && (
                    <a href={invoiceData.invoiceUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm">
                      <ExternalLink className="w-4 h-4" /> Open Invoice Page
                    </a>
                  )}
                  <button onClick={() => setInvoiceData(null)}
                    className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-secondary transition-colors">
                    Cancel
                  </button>
                </div>

                {polling && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Checking payment status automatically…
                  </div>
                )}
              </div>
            ) : unlockStatus?.pendingPayment ? (
              /* Has pending payment from before */
              <div className="bg-card rounded-2xl border border-yellow-500/30 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-yellow-400" />
                  <div>
                    <h2 className="font-bold">Payment Pending</h2>
                    <p className="text-sm text-muted-foreground">Your previous payment is being processed</p>
                  </div>
                </div>
                {unlockStatus.pendingPayment.invoiceUrl && (
                  <a href={unlockStatus.pendingPayment.invoiceUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary text-sm hover:underline">
                    <ExternalLink className="w-4 h-4" /> View Invoice
                  </a>
                )}
                <Button variant="outline" onClick={fetchData} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" /> Check Status
                </Button>
              </div>
            ) : (
              /* Unlock prompt */
              <div className="space-y-4">
                <div className="bg-card rounded-2xl border border-border p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg">Unlock Task Access</h2>
                      <p className="text-sm text-muted-foreground">One-time payment to access all tasks</p>
                    </div>
                  </div>

                  <div className="bg-secondary/50 rounded-xl p-4 mb-5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Unlock Fee</span>
                      <span className="font-bold text-xl text-primary">${unlockStatus?.unlockFeeUsd ?? "0.50"} USD</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Pay once, access all tasks permanently</p>
                  </div>

                  <div className="space-y-2 mb-5">
                    <p className="text-sm font-semibold text-muted-foreground">Select payment currency</p>
                    {CURRENCIES.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCurrency(c.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                          selectedCurrency === c.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        <span className={cn("text-2xl w-8 text-center", c.color)}>{c.icon}</span>
                        <div>
                          <p className="font-semibold text-sm">{c.label}</p>
                          <p className="text-xs text-muted-foreground">BSC Network (BEP20)</p>
                        </div>
                        {selectedCurrency === c.id && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
                      </button>
                    ))}
                  </div>

                  <Button onClick={handleUnlock} isLoading={paying} className="w-full">
                    Pay ${unlockStatus?.unlockFeeUsd ?? "0.50"} USD → Unlock Tasks
                  </Button>
                </div>

                <div className="bg-secondary/30 rounded-xl p-4 text-sm text-muted-foreground space-y-1.5">
                  <p className="font-semibold text-foreground text-sm">How it works</p>
                  <p>1. Pay the unlock fee in USDT (BEP20) or BNB</p>
                  <p>2. After confirmation, access all available tasks</p>
                  <p>3. Complete tasks and submit proof</p>
                  <p>4. Admin reviews and approves your submission</p>
                  <p>5. Reward is credited to your wallet</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── UNLOCKED STATE ── */
          <div className="space-y-4">
            {/* Earnings summary */}
            <div className="bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl border border-primary/20 p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Task Earnings</p>
                <p className="font-bold text-xl">
                  ${submissions.filter(s => s.status === "approved")
                    .reduce((sum: number, s: any) => sum + parseFloat(s.task?.rewardUsd || "0"), 0)
                    .toFixed(2)} USD
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground">Approved</p>
                <p className="font-bold text-green-400">{submissions.filter(s => s.status === "approved").length}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-secondary rounded-xl p-1">
              {(["tasks", "mine"] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all capitalize",
                    activeTab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  {t === "tasks" ? "Available Tasks" : "My Submissions"}
                </button>
              ))}
            </div>

            {activeTab === "tasks" ? (
              tasks.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-bold">No tasks available right now</p>
                  <p className="text-sm">Check back later for new tasks</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map(task => {
                    const mySubmission = task.mySubmission;
                    const canSubmit = !mySubmission && task.spotsLeft > 0;
                    return (
                      <div key={task.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base leading-tight">{task.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-primary text-lg">${parseFloat(task.rewardUsd).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">reward</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{task.completionsCount}/{task.maxCompletions} completed</span>
                          <span className={cn("font-semibold", task.spotsLeft > 0 ? "text-green-400" : "text-red-400")}>
                            {task.spotsLeft > 0 ? `${task.spotsLeft} spots left` : "Full"}
                          </span>
                        </div>

                        {mySubmission ? (
                          <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold", COMPLETION_STATUS[mySubmission.status]?.color)}>
                            {mySubmission.status === "approved" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                             mySubmission.status === "rejected" ? <XCircle className="w-3.5 h-3.5" /> :
                             <Clock className="w-3.5 h-3.5" />}
                            {COMPLETION_STATUS[mySubmission.status]?.label ?? mySubmission.status}
                            {mySubmission.rejectReason && <span className="ml-1 opacity-70">— {mySubmission.rejectReason}</span>}
                          </div>
                        ) : canSubmit ? (
                          <Button size="sm" className="w-full" onClick={() => { setSubmitTask(task); setProofText(""); setProofUrl(""); }}>
                            Submit Task <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        ) : (
                          <div className="text-center py-2 text-xs text-muted-foreground">No spots remaining</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* My Submissions */
              submissions.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-bold">No submissions yet</p>
                  <p className="text-sm">Complete tasks to earn rewards</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map(s => (
                    <div key={s.id} className="bg-card rounded-2xl border border-border p-4 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{s.task?.title || `Task #${s.taskId}`}</p>
                        <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</p>
                        {s.rejectReason && <p className="text-xs text-red-400 mt-1">Reason: {s.rejectReason}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm text-primary">${parseFloat(s.task?.rewardUsd || "0").toFixed(2)}</p>
                        <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-semibold border mt-1", COMPLETION_STATUS[s.status]?.color)}>
                          {COMPLETION_STATUS[s.status]?.label ?? s.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Submit Proof Modal */}
      {submitTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div>
              <h2 className="font-bold text-lg">{submitTask.title}</h2>
              <p className="text-sm text-primary font-semibold">Reward: ${parseFloat(submitTask.rewardUsd).toFixed(2)} USD</p>
            </div>

            <div className="bg-secondary/50 rounded-xl p-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Task Instructions
              </p>
              <p className="whitespace-pre-wrap">{submitTask.instructions}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold block mb-1.5">Proof / Description *</label>
                <textarea
                  value={proofText}
                  onChange={e => setProofText(e.target.value)}
                  placeholder="Describe how you completed this task…"
                  rows={3}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1.5">Proof URL (optional)</label>
                <input
                  type="url"
                  value={proofUrl}
                  onChange={e => setProofUrl(e.target.value)}
                  placeholder="https://screenshot.com/your-proof"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSubmitTask(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleSubmit} isLoading={submitting} className="flex-1">Submit</Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
