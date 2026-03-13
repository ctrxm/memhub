import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button, Input } from "@/components/ui/shared";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Users, Plus, Search, Lock, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/utils";

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  bannerColor: string;
  membersCount: number;
  postsCount: number;
  isPrivate: boolean;
  isMember: boolean;
}

export default function Communities() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", icon: "🌐", bannerColor: "#FF6600", isPrivate: false });
  const [creating, setCreating] = useState(false);

  const token = localStorage.getItem("ovrhub_token") || localStorage.getItem("memehub_token");

  const load = async (q = "") => {
    try {
      const res = await fetch(`${BASE}/api/communities${q ? `?q=${encodeURIComponent(q)}` : ""}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setCommunities(data.communities || []);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(search); };

  const createCommunity = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${BASE}/api/communities`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: `Community ${form.name} created!` });
        setShowCreate(false);
        setForm({ name: "", description: "", icon: "🌐", bannerColor: "#FF6600", isPrivate: false });
        setLocation(`/c/${data.community.slug}`);
      } else {
        toast({ title: data.error || "Error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
    setCreating(false);
  };

  const toggleJoin = async (community: Community) => {
    if (!isAuthenticated) { setLocation("/login"); return; }
    const method = community.isMember ? "DELETE" : "POST";
    const endpoint = community.isMember ? `${BASE}/api/communities/${community.slug}/leave` : `${BASE}/api/communities/${community.slug}/join`;
    try {
      const res = await fetch(endpoint, { method, headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setCommunities(prev => prev.map(c => c.id === community.id
          ? { ...c, isMember: !c.isMember, membersCount: c.isMember ? c.membersCount - 1 : c.membersCount + 1 }
          : c
        ));
      }
    } catch { }
  };

  const EMOJI_OPTIONS = ["🌐", "🔥", "😂", "🎮", "🎵", "🎨", "🐾", "🌿", "🚀", "🏆", "💡", "📸", "🍕", "⚡", "🌊", "🎭"];

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {/* Header */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden mb-4 shadow-sm">
          <div className="h-24 relative" style={{ background: "linear-gradient(135deg, #1a0a00 0%, #FF6600 60%, #ff9900 100%)" }}>
            <div className="absolute inset-0 flex items-center px-6">
              <Globe className="w-8 h-8 text-white/80 mr-3" />
              <h1 className="font-display text-3xl font-bold text-white">Communities</h1>
            </div>
          </div>
          <div className="p-4 flex flex-wrap gap-3 items-center justify-between">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search communities..."
                className="flex-1"
              />
              <Button type="submit" variant="outline" size="icon"><Search className="w-4 h-4" /></Button>
            </form>
            {isAuthenticated && (
              <Button onClick={() => setShowCreate(v => !v)} className="rounded-full gap-2">
                <Plus className="w-4 h-4" /> {showCreate ? "Cancel" : "Create"}
              </Button>
            )}
          </div>
        </div>

        {/* Create form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-card border border-border/50 rounded-2xl p-5 mb-4 shadow-sm overflow-hidden"
            >
              <h3 className="font-bold text-lg mb-4">Create a Community</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold mb-1 block text-muted-foreground">Community Name *</label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dank Memes" />
                  </div>
                  <div>
                    <label className="text-xs font-bold mb-1 block text-muted-foreground">Banner Color</label>
                    <input type="color" value={form.bannerColor} onChange={e => setForm(f => ({ ...f, bannerColor: e.target.value }))} className="w-full h-10 rounded-xl border border-border cursor-pointer" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block text-muted-foreground">Description</label>
                  <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this community about?" />
                </div>
                <div>
                  <label className="text-xs font-bold mb-2 block text-muted-foreground">Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map(emoji => (
                      <button key={emoji} onClick={() => setForm(f => ({ ...f, icon: emoji }))}
                        className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${form.icon === emoji ? "bg-primary shadow-lg scale-110" : "bg-secondary hover:bg-secondary/80"}`}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Preview */}
                <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-border/30">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm" style={{ background: form.bannerColor }}>
                    {form.icon}
                  </div>
                  <div>
                    <p className="font-bold">{form.name || "Community Name"}</p>
                    <p className="text-xs text-muted-foreground">{form.description || "Community description"}</p>
                  </div>
                </div>
                <Button onClick={createCommunity} className="w-full" isLoading={creating}>Create Community</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Communities grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-card rounded-2xl animate-pulse" />)}
          </div>
        ) : communities.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
            <Globe className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <h2 className="text-xl font-bold mb-2">No communities yet</h2>
            <p className="text-muted-foreground text-sm mb-4">Be the first to create one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {communities.map((community, i) => (
              <motion.div
                key={community.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all group">
                  {/* Banner */}
                  <div className="h-16 relative flex items-center px-4 gap-3"
                    style={{ background: `linear-gradient(135deg, ${community.bannerColor}33, ${community.bannerColor})` }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg border-2 border-white/20 bg-black/20">
                      {community.icon}
                    </div>
                    {community.isPrivate && <Lock className="w-3.5 h-3.5 text-white/70 absolute top-2 right-2" />}
                  </div>
                  <div className="p-4">
                    <Link href={`/c/${community.slug}`}>
                      <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{community.name}</h3>
                    </Link>
                    {community.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{community.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {formatNumber(community.membersCount)} members</span>
                      <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {formatNumber(community.postsCount)} posts</span>
                    </div>
                    <Button
                      variant={community.isMember ? "outline" : "default"}
                      size="sm"
                      className="w-full mt-3 rounded-full"
                      onClick={() => toggleJoin(community)}
                    >
                      {community.isMember ? "Joined ✓" : "Join"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </Layout>
  );
}
