import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button, Input } from "@/components/ui/shared";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight } from "lucide-react";
import { OvrHubLogoIcon } from "@/components/ui/OvrHubLogo";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user as any);
        toast({ title: "Welcome back! 🔥" });
        setLocation("/");
      },
      onError: (err) => {
        toast({ title: "Login Failed", description: err?.message || "Invalid credentials", variant: "destructive" });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Visual side — hidden on mobile, shown on lg */}
      <div className="hidden lg:flex flex-1 relative bg-zinc-950 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background to-background" />
        <div className="relative z-10 text-center max-w-lg px-8 select-none">
          <div className="font-meme text-8xl text-primary leading-none mb-4 drop-shadow-2xl">OVRHUB</div>
          <h1 className="font-display text-4xl font-bold text-white mb-4 drop-shadow-xl">
            The Front Page of the Internet.
          </h1>
          <p className="text-xl text-zinc-300 font-medium drop-shadow-md">
            Log in to vote, comment, and save your favorite memes.
          </p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-10 bg-background">
        <Link href="/" className="mb-10 flex items-center gap-2 hover:opacity-80 transition-opacity w-fit">
          <OvrHubLogoIcon size={36} />
          <span className="font-display text-3xl font-bold tracking-tight">OVR<span className="text-primary">HUB</span></span>
        </Link>

        <div className="max-w-sm w-full">
          <h2 className="text-3xl font-bold mb-1 text-foreground">Welcome back</h2>
          <p className="text-muted-foreground mb-8">Enter your details to get back to the laughs.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12"
              />
            </div>

            <Button type="submit" size="lg" className="w-full h-12 text-base font-bold mt-2 group" isLoading={loginMutation.isPending}>
              Log in <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>

          <p className="mt-8 text-center text-muted-foreground font-medium">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-bold">Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
