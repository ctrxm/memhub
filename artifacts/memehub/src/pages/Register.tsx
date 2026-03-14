import { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button, Input } from "@/components/ui/shared";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { OvrHubLogoIcon } from "@/components/ui/OvrHubLogo";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiPost(path: string, body: object, token?: string) {
  const res = await fetch(`${BASE}/api${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok && res.status !== 202) {
    throw new Error(data.message || "Request failed");
  }
  return { status: res.status, data };
}

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<"form" | "otp">("form");
  const [pendingEmail, setPendingEmail] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { status, data } = await apiPost("/auth/register", { username, email, password });

      if (status === 202 && data.requireOtp) {
        setPendingEmail(data.email || email);
        setStep("otp");
        toast({ title: "Code sent!", description: `Check your inbox at ${data.email || email}` });
      } else {
        login(data.token, data.user);
        toast({ title: "Account created! Welcome to OVRHUB" });
        setLocation("/");
      }
    } catch (err: any) {
      toast({ title: "Registration Failed", description: err.message || "Invalid data", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...otp];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || "";
    setOtp(next);
    const lastFilled = Math.min(pasted.length, 5);
    otpRefs.current[lastFilled]?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      toast({ title: "Enter all 6 digits", variant: "destructive" });
      return;
    }
    setIsVerifying(true);
    try {
      const { data } = await apiPost("/auth/verify-otp", { email: pendingEmail, otp: code });
      login(data.token, data.user);
      toast({ title: "Email verified! Welcome to OVRHUB" });
      setLocation("/");
    } catch (err: any) {
      toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await apiPost("/auth/resend-otp", { email: pendingEmail });
      toast({ title: "New code sent!", description: "Check your inbox." });
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      toast({ title: "Failed to resend", description: err.message, variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-10 bg-background">
        <Link href="/" className="mb-10 flex items-center gap-2 hover:opacity-80 transition-opacity w-fit">
          <OvrHubLogoIcon size={36} />
          <span className="font-display text-3xl font-bold tracking-tight">OVR<span className="text-primary">HUB</span></span>
        </Link>

        <div className="max-w-sm w-full">
          {step === "form" ? (
            <>
              <h2 className="text-3xl font-bold mb-1 text-foreground">Join OVRHUB</h2>
              <p className="text-muted-foreground mb-8">Create an account to upvote, comment, and post memes.</p>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground">Username</label>
                  <Input
                    type="text"
                    required
                    minLength={3}
                    maxLength={30}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="memelord99"
                    className="h-12"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground">Email</label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="doge@example.com"
                    className="h-12"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground">Password</label>
                  <Input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12"
                  />
                  <p className="text-xs text-muted-foreground">At least 6 characters.</p>
                </div>

                <Button type="submit" size="lg" className="w-full h-12 text-base font-bold mt-2 group" isLoading={isSubmitting}>
                  Create Account <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>

              <p className="mt-8 text-center text-muted-foreground font-medium">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-bold">Log in</Link>
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>

              <h2 className="text-3xl font-bold mb-1 text-foreground">Check your email</h2>
              <p className="text-muted-foreground mb-2">
                We sent a 6-digit code to
              </p>
              <div className="flex items-center gap-2 mb-8">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <span className="font-bold text-foreground text-sm break-all">{pendingEmail}</span>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-foreground mb-3 block">Verification code</label>
                  <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-background text-foreground outline-none transition-colors focus:border-primary border-border/60 caret-transparent"
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">Code expires in 10 minutes.</p>
                </div>

                <Button type="submit" size="lg" className="w-full h-12 text-base font-bold group" isLoading={isVerifying}>
                  Verify & Continue <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>

              <div className="mt-6 flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground">Didn't receive the code?</p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="flex items-center gap-2 text-sm font-bold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isResending ? "animate-spin" : ""}`} />
                  {isResending ? "Sending..." : "Resend code"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to registration
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="hidden lg:flex flex-1 relative bg-zinc-950 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-primary/30 via-background to-background" />
        <div className="relative z-10 text-center max-w-lg px-8 select-none">
          {step === "otp" ? (
            <>
              <div className="font-meme text-8xl text-primary leading-none mb-4 drop-shadow-2xl">📨</div>
              <h1 className="font-display text-4xl font-bold text-white mb-4 drop-shadow-xl">Almost there!</h1>
              <p className="text-white/70 text-lg">Verify your email to complete registration and join the community.</p>
            </>
          ) : (
            <>
              <div className="font-meme text-8xl text-primary leading-none mb-4 drop-shadow-2xl">JOIN US</div>
              <h1 className="font-display text-4xl font-bold text-white mb-6 drop-shadow-xl">
                Stop lurking. Start laughing.
              </h1>
              <div className="flex gap-4 justify-center text-white/80">
                <div className="bg-black/40 backdrop-blur-md p-5 rounded-2xl border border-white/10">
                  <p className="text-3xl font-bold text-primary">10M+</p>
                  <p className="text-sm font-medium uppercase tracking-wider mt-1">Memes</p>
                </div>
                <div className="bg-black/40 backdrop-blur-md p-5 rounded-2xl border border-white/10">
                  <p className="text-3xl font-bold text-primary">1M+</p>
                  <p className="text-sm font-medium uppercase tracking-wider mt-1">Users</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
