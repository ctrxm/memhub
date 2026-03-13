import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button, Input } from "@/components/ui/shared";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight } from "lucide-react";
import { OvrHubLogoIcon } from "@/components/ui/OvrHubLogo";

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const registerMutation = useRegister({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user as any);
        toast({ title: "Account created! Welcome to OVRHUB 🚀" });
        setLocation("/");
      },
      onError: (err) => {
        toast({ title: "Registration Failed", description: err?.message || "Invalid data", variant: "destructive" });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({ data: { username, email, password } });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Form side */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-10 bg-background">
        <Link href="/" className="mb-10 flex items-center gap-2 hover:opacity-80 transition-opacity w-fit">
          <OvrHubLogoIcon size={36} />
          <span className="font-display text-3xl font-bold tracking-tight">OVR<span className="text-primary">HUB</span></span>
        </Link>

        <div className="max-w-sm w-full">
          <h2 className="text-3xl font-bold mb-1 text-foreground">Join OVRHUB</h2>
          <p className="text-muted-foreground mb-8">Create an account to upvote, comment, and post memes.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <Button type="submit" size="lg" className="w-full h-12 text-base font-bold mt-2 group" isLoading={registerMutation.isPending}>
              Create Account <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>

          <p className="mt-8 text-center text-muted-foreground font-medium">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-bold">Log in</Link>
          </p>
        </div>
      </div>

      {/* Visual side */}
      <div className="hidden lg:flex flex-1 relative bg-zinc-950 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-primary/30 via-background to-background" />
        <div className="relative z-10 text-center max-w-lg px-8 select-none">
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
        </div>
      </div>
    </div>
  );
}
