import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button, Input } from "@/components/ui/shared";
import { useToast } from "@/hooks/use-toast";
import { LogIn, ArrowRight } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token);
        toast({ title: "Welcome back!" });
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
    <div className="min-h-screen flex">
      {/* Visual side */}
      <div className="hidden lg:flex flex-1 relative bg-zinc-950 items-center justify-center overflow-hidden">
        <img src={`${import.meta.env.BASE_URL}images/auth-bg.png`} alt="Abstract background" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="relative z-10 text-center max-w-lg px-8">
          <h1 className="font-display text-5xl font-bold text-white mb-6 drop-shadow-2xl">The Front Page of the Internet.</h1>
          <p className="text-xl text-zinc-300 font-medium drop-shadow-md">Log in to vote, comment, and save your favorite memes.</p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-background">
        <Link href="/" className="mb-12 flex items-center gap-2 hover:opacity-80 transition-opacity w-fit">
          <img src={`${import.meta.env.BASE_URL}images/logo-icon.png`} alt="MemeHub" className="w-10 h-10 rounded-xl" />
          <span className="font-display text-3xl font-bold tracking-tight">MEME<span className="text-primary">HUB</span></span>
        </Link>

        <div className="max-w-md w-full">
          <h2 className="text-3xl font-bold mb-2 text-foreground">Welcome back</h2>
          <p className="text-muted-foreground mb-8">Enter your details to get back to the laughs.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-bold text-foreground">Email</label>
              <Input 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="doge@example.com"
                className="h-14"
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-foreground">Password</label>
                <a href="#" className="text-sm font-semibold text-primary hover:underline">Forgot password?</a>
              </div>
              <Input 
                type="password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
                className="h-14"
              />
            </div>

            <Button type="submit" size="lg" className="w-full h-14 text-lg font-bold mt-4 group" isLoading={loginMutation.isPending}>
              Log in <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>

          <p className="mt-8 text-center text-muted-foreground font-medium">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-bold">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
