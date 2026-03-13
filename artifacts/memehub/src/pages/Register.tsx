import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button, Input } from "@/components/ui/shared";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight } from "lucide-react";

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
        login(data.token);
        toast({ title: "Account created! Welcome to MemeHub." });
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
    <div className="min-h-screen flex">
      {/* Form side */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-background">
        <Link href="/" className="mb-12 flex items-center gap-2 hover:opacity-80 transition-opacity w-fit">
          <img src={`${import.meta.env.BASE_URL}images/logo-icon.png`} alt="MemeHub" className="w-10 h-10 rounded-xl" />
          <span className="font-display text-3xl font-bold tracking-tight">MEME<span className="text-primary">HUB</span></span>
        </Link>

        <div className="max-w-md w-full">
          <h2 className="text-3xl font-bold mb-2 text-foreground">Join the community</h2>
          <p className="text-muted-foreground mb-8">Create an account to upvote, comment, and post memes.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-bold text-foreground">Username</label>
              <Input 
                type="text" 
                required 
                minLength={3}
                maxLength={30}
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                placeholder="memelord99"
                className="h-14"
              />
            </div>

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
              <label className="text-sm font-bold text-foreground">Password</label>
              <Input 
                type="password" 
                required 
                minLength={6}
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
                className="h-14"
              />
              <p className="text-xs text-muted-foreground mt-1">Must be at least 6 characters long.</p>
            </div>

            <Button type="submit" size="lg" className="w-full h-14 text-lg font-bold mt-4 group" isLoading={registerMutation.isPending}>
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
        <img src={`${import.meta.env.BASE_URL}images/auth-bg.png`} alt="Abstract background" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="relative z-10 text-center max-w-lg px-8">
          <h1 className="font-display text-5xl font-bold text-white mb-6 drop-shadow-2xl">Stop lurking. Start laughing.</h1>
          <div className="flex gap-4 justify-center mt-8 text-white/80">
            <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <p className="text-3xl font-bold text-primary">10M+</p>
              <p className="text-sm font-medium uppercase tracking-wider">Memes</p>
            </div>
            <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <p className="text-3xl font-bold text-primary">1M+</p>
              <p className="text-sm font-medium uppercase tracking-wider">Users</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
