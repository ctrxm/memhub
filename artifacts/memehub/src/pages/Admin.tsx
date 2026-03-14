import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useGetAdminStats, useGetAdminPosts, useUpdatePostStatus, useGetAdminSettings, useUpdateAdminSettings } from "@workspace/api-client-react";
import { Button, Input, Badge, Textarea } from "@/components/ui/shared";
import { ShieldAlert, Users, Image as ImageIcon, MessageSquare, Activity, Settings, Check, X, Award, Plus, Trash2, UserCheck, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/utils";
import { UserBadge } from "@/components/ui/UserBadge";

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"dashboard" | "posts" | "users" | "badges" | "tags" | "settings">("dashboard");

  if (user?.role !== 'admin') {
    return (
      <Layout>
        <div className="text-center py-20 bg-card rounded-2xl border-destructive/50 border">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
          <Button className="mt-6" onClick={() => setLocation('/')}>Go Home</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideSidebar>
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Admin Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-2">
          <h2 className="font-display text-2xl font-bold mb-6 px-4">Admin Panel</h2>
          <AdminTab active={tab === "dashboard"} icon={<Activity />} label="Dashboard" onClick={() => setTab("dashboard")} />
          <AdminTab active={tab === "posts"} icon={<ImageIcon />} label="Pending Posts" onClick={() => setTab("posts")} />
          <AdminTab active={tab === "users"} icon={<Users />} label="Users" onClick={() => setTab("users")} />
          <AdminTab active={tab === "badges"} icon={<Award />} label="Badges" onClick={() => setTab("badges")} />
          <AdminTab active={tab === "tags"} icon={<Hash />} label="Tags" onClick={() => setTab("tags")} />
          <AdminTab active={tab === "settings"} icon={<Settings />} label="Site Settings" onClick={() => setTab("settings")} />
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-card border border-border/50 rounded-2xl p-6 shadow-sm min-h-[600px]">
          {tab === "dashboard" && <AdminDashboard />}
          {tab === "posts" && <AdminPosts />}
          {tab === "users" && <AdminUsers />}
          {tab === "badges" && <AdminBadges />}
          {tab === "tags" && <AdminTags />}
          {tab === "settings" && <AdminSettings />}
        </div>
      </div>
    </Layout>
  );
}

function AdminTab({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${active ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
    >
      {icon} {label}
    </button>
  );
}

function AdminDashboard() {
  const { data: stats } = useGetAdminStats();
  
  if (!stats) return <div>Loading stats...</div>;

  return (
    <div>
      <h3 className="text-xl font-bold mb-6">Overview</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats.totalUsers} icon={<Users className="w-5 h-5" />} trend={`+${stats.newUsersToday} today`} />
        <StatCard title="Total Posts" value={stats.totalPosts} icon={<ImageIcon className="w-5 h-5" />} trend={`+${stats.newPostsToday} today`} />
        <StatCard title="Pending Approvals" value={stats.pendingPosts} icon={<ShieldAlert className="w-5 h-5 text-yellow-500" />} trend="Needs review" />
        <StatCard title="Total Comments" value={stats.totalComments} icon={<MessageSquare className="w-5 h-5" />} />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: number, icon: React.ReactNode, trend?: string }) {
  return (
    <div className="bg-background border border-border/50 rounded-xl p-5">
      <div className="flex items-center justify-between text-muted-foreground mb-4">
        <span className="font-semibold text-sm">{title}</span>
        {icon}
      </div>
      <p className="text-3xl font-bold text-foreground">{formatNumber(value)}</p>
      {trend && <p className="text-xs text-primary font-medium mt-2">{trend}</p>}
    </div>
  );
}

function AdminPosts() {
  const { data, refetch } = useGetAdminPosts({ status: 'pending' });
  const updateMutation = useUpdatePostStatus({ onSuccess: () => refetch() });

  return (
    <div>
      <h3 className="text-xl font-bold mb-6">Pending Posts</h3>
      <div className="space-y-4">
        {data?.posts?.map(post => (
          <div key={post.id} className="flex gap-4 p-4 bg-background border border-border/50 rounded-xl items-start">
            <img src={post.imageUrl} alt="thumb" className="w-24 h-24 object-cover rounded-lg bg-muted" />
            <div className="flex-1">
              <h4 className="font-bold text-lg leading-tight">{post.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">By {post.author.username}</p>
              <div className="flex gap-2 mt-4">
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateMutation.mutate({ id: post.id, data: { status: 'approved' }})}>
                  <Check className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => updateMutation.mutate({ id: post.id, data: { status: 'removed' }})}>
                  <X className="w-4 h-4 mr-1" /> Reject
                </Button>
              </div>
            </div>
          </div>
        ))}
        {data?.posts?.length === 0 && <p className="text-muted-foreground">No pending posts to review.</p>}
      </div>
    </div>
  );
}

function AdminUsers() {
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/admin/users`);
        const data = await res.json();
        setUsers(data.users || []);
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const filtered = users.filter(u => u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  const toggleAdmin = async (userId: number, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      const res = await fetch(`${BASE}/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        toast({ title: `User ${newRole === "admin" ? "promoted to admin" : "demoted to user"}` });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold mb-6">Users Management</h3>
      <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by username or email..." className="mb-4" />
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => (
            <div key={u.id} className="flex items-center gap-3 p-3 bg-background border border-border/50 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {u.username?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{u.username}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs shrink-0">
                {u.role}
              </Badge>
              <Button
                size="sm"
                variant={u.role === "admin" ? "destructive" : "secondary"}
                className="text-xs shrink-0"
                onClick={() => toggleAdmin(u.id, u.role)}
              >
                {u.role === "admin" ? "Demote" : "Promote"}
              </Button>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-muted-foreground text-center py-8">No users found.</p>}
        </div>
      )}
    </div>
  );
}

function AdminBadges() {
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const { toast } = useToast();
  const [badges, setBadges] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [awardMode, setAwardMode] = useState<string | null>(null);
  const [awardSearch, setAwardSearch] = useState("");
  const [form, setForm] = useState({ name: "", description: "", icon: "⭐", color: "#f59e0b", bgColor: "#fef3c7", isVerified: false });

  const token = localStorage.getItem("ovrhub_token") || localStorage.getItem("memehub_token");
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const loadBadges = async () => {
    try {
      const res = await fetch(`${BASE}/api/badges`, { headers: authHeaders });
      const data = await res.json();
      setBadges(data.badges || []);
    } catch { }
    setLoading(false);
  };

  const loadUsers = async () => {
    try {
      const res = await fetch(`${BASE}/api/admin/users`, { headers: authHeaders });
      const data = await res.json();
      setUsers(data.users || []);
    } catch { }
  };

  useEffect(() => { loadBadges(); loadUsers(); }, []);

  const createBadge = async () => {
    if (!form.name.trim()) return;
    try {
      const res = await fetch(`${BASE}/api/badges`, { method: "POST", headers: authHeaders, body: JSON.stringify(form) });
      if (res.ok) {
        toast({ title: "Badge created!" });
        setCreating(false);
        setForm({ name: "", description: "", icon: "⭐", color: "#f59e0b", bgColor: "#fef3c7", isVerified: false });
        loadBadges();
      } else toast({ title: "Error creating badge", variant: "destructive" });
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const deleteBadge = async (id: string) => {
    if (!confirm("Delete this badge? It will be removed from all users.")) return;
    try {
      const res = await fetch(`${BASE}/api/badges/${id}`, { method: "DELETE", headers: authHeaders });
      if (res.ok) { toast({ title: "Badge deleted" }); loadBadges(); }
    } catch { }
  };

  const awardBadge = async (badgeId: string, username: string) => {
    try {
      const res = await fetch(`${BASE}/api/badges/${badgeId}/award`, {
        method: "POST", headers: authHeaders, body: JSON.stringify({ username })
      });
      if (res.ok) { toast({ title: `Badge awarded to ${username}!` }); setAwardMode(null); setAwardSearch(""); }
      else { const d = await res.json(); toast({ title: d.error || "Error", variant: "destructive" }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const filteredUsers = users.filter(u => u.username?.toLowerCase().includes(awardSearch.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Badge Management</h3>
        <Button onClick={() => setCreating(v => !v)} className="rounded-full gap-2">
          <Plus className="w-4 h-4" /> {creating ? "Cancel" : "Create Badge"}
        </Button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="bg-background border border-border/50 rounded-xl p-5 mb-6 space-y-4">
          <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">New Badge</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold mb-1 block">Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Verified Creator" />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block">Icon (emoji or text)</label>
              <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="⭐ / 🔥 / VIP" />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block">Description</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold mb-1 block">Text Color</label>
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-full h-9 rounded-lg border border-border cursor-pointer" />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block">BG Color</label>
                <input type="color" value={form.bgColor} onChange={e => setForm(f => ({ ...f, bgColor: e.target.value }))} className="w-full h-9 rounded-lg border border-border cursor-pointer" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="verified-chk" checked={form.isVerified} onChange={e => setForm(f => ({ ...f, isVerified: e.target.checked }))} className="w-4 h-4 accent-primary" />
            <label htmlFor="verified-chk" className="text-sm font-medium">Verified badge (shows checkmark icon)</label>
          </div>
          {/* Preview */}
          <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
            <span className="text-xs font-bold text-muted-foreground">Preview:</span>
            <UserBadge badge={{ id: "preview", ...form, isVerified: form.isVerified } as any} size="md" showTooltip={false} />
            <span className="text-sm font-bold" style={{ color: form.color }}>{form.name || "Badge Name"}</span>
          </div>
          <Button onClick={createBadge} className="w-full">Create Badge</Button>
        </div>
      )}

      {/* Award modal overlay */}
      {awardMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setAwardMode(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold text-lg mb-4">Award Badge to User</h4>
            <Input value={awardSearch} onChange={e => setAwardSearch(e.target.value)} placeholder="Search username..." className="mb-3" autoFocus />
            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredUsers.slice(0, 20).map(u => (
                <button key={u.id} onClick={() => awardBadge(awardMode, u.username)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors text-left">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {u.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{u.username}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </button>
              ))}
              {filteredUsers.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No users found</p>}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => setAwardMode(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Badges list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : badges.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-bold">No badges yet</p>
          <p className="text-sm mt-1">Create your first badge above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {badges.map(badge => (
            <div key={badge.id} className="flex items-center gap-3 p-4 bg-background border border-border/50 rounded-xl">
              <UserBadge badge={badge} size="md" showTooltip={false} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm" style={{ color: badge.color }}>{badge.name}</p>
                {badge.description && <p className="text-xs text-muted-foreground truncate">{badge.description}</p>}
              </div>
              {badge.isVerified && <Badge variant="secondary" className="text-xs">Verified</Badge>}
              <Button size="sm" variant="outline" className="text-xs gap-1 shrink-0" onClick={() => setAwardMode(badge.id)}>
                <UserCheck className="w-3.5 h-3.5" /> Award
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => deleteBadge(badge.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminTags() {
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const { toast } = useToast();
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", color: "#FF6600" });
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("ovrhub_token") || localStorage.getItem("memehub_token");
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const loadTags = async () => {
    try {
      const res = await fetch(`${BASE}/api/tags`);
      const data = await res.json();
      setTags(data.tags || []);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { loadTags(); }, []);

  const createTag = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    try {
      const res = await fetch(`${BASE}/api/admin/tags`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name: form.name.trim(), slug, color: form.color }),
      });
      if (res.ok) {
        toast({ title: `Tag "${form.name}" created!` });
        setForm({ name: "", color: "#FF6600" });
        loadTags();
      } else {
        const d = await res.json();
        toast({ title: d.error || "Error creating tag", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
    setSaving(false);
  };

  const deleteTag = async (id: string, name: string) => {
    if (!confirm(`Delete tag "${name}"? Posts will lose this tag.`)) return;
    try {
      const res = await fetch(`${BASE}/api/admin/tags/${id}`, { method: "DELETE", headers: authHeaders });
      if (res.ok) { toast({ title: `Tag "${name}" deleted` }); loadTags(); }
    } catch { }
  };

  return (
    <div>
      <h3 className="text-xl font-bold mb-6">Tags Management</h3>

      {/* Create form */}
      <div className="bg-background border border-border/50 rounded-xl p-5 mb-6">
        <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">New Tag</h4>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-40">
            <label className="text-xs font-bold mb-1 block">Tag Name *</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dank Memes" onKeyDown={e => e.key === "Enter" && createTag()} />
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block">Color</label>
            <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-12 h-10 rounded-lg border border-border cursor-pointer" />
          </div>
          {form.name && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">Slug:</span>
              <code className="text-xs bg-secondary rounded px-2 py-1">
                {form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}
              </code>
            </div>
          )}
          <Button onClick={createTag} isLoading={saving} className="gap-2">
            <Plus className="w-4 h-4" /> Create Tag
          </Button>
        </div>
      </div>

      {/* Tags list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : tags.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Hash className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="font-bold">No tags yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tags.map(tag => (
            <div key={tag.id} className="flex items-center gap-3 p-3 bg-background border border-border/50 rounded-xl">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color || "#FF6600" }} />
              <div className="flex-1 min-w-0">
                <span className="font-bold">{tag.name}</span>
                <span className="text-xs text-muted-foreground ml-2">#{tag.slug}</span>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">{formatNumber(tag.postsCount || 0)} posts</Badge>
              <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => deleteTag(tag.id, tag.name)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminSettings() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetAdminSettings();
  const updateMutation = useUpdateAdminSettings({
    mutation: {
      onSuccess: () => toast({ title: "Settings updated successfully" })
    }
  });

  const [form, setForm] = useState({
    siteName: "", siteDescription: "", allowRegistration: true, requireApproval: false, huggingFaceRepo: "", maintenanceMode: false, smtpEnabled: false,
  });

  useEffect(() => {
    if (settings) setForm({
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      allowRegistration: settings.allowRegistration,
      requireApproval: settings.requireApproval,
      huggingFaceRepo: settings.huggingFaceRepo,
      maintenanceMode: settings.maintenanceMode,
      smtpEnabled: (settings as any).smtpEnabled ?? false,
    });
  }, [settings]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="max-w-xl space-y-6">
      <h3 className="text-xl font-bold mb-6">Site Configuration</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-bold mb-1 block">Site Name</label>
          <Input value={form.siteName} onChange={e => setForm({...form, siteName: e.target.value})} />
        </div>
        <div>
          <label className="text-sm font-bold mb-1 block">Site Description</label>
          <Textarea value={form.siteDescription} onChange={e => setForm({...form, siteDescription: e.target.value})} />
        </div>
        <div>
          <label className="text-sm font-bold mb-1 block">Hugging Face Dataset Repo</label>
          <Input value={form.huggingFaceRepo} onChange={e => setForm({...form, huggingFaceRepo: e.target.value})} placeholder="username/dataset-name" />
          <p className="text-xs text-muted-foreground mt-1">Used for storing uploaded meme images.</p>
        </div>

        <div className="flex items-center justify-between p-4 bg-background border border-border/50 rounded-xl">
          <div>
            <p className="font-bold">Require Post Approval</p>
            <p className="text-sm text-muted-foreground">New posts must be approved by admin before appearing in Fresh.</p>
          </div>
          <input type="checkbox" className="w-5 h-5 accent-primary" checked={form.requireApproval} onChange={e => setForm({...form, requireApproval: e.target.checked})} />
        </div>

        <div className={`flex items-center justify-between p-4 border rounded-xl transition-colors ${form.maintenanceMode ? "bg-destructive/10 border-destructive/40" : "bg-background border-border/50"}`}>
          <div>
            <p className="font-bold flex items-center gap-2">
              Maintenance Mode
              {form.maintenanceMode && <span className="text-xs text-destructive font-semibold uppercase tracking-wide">Active</span>}
            </p>
            <p className="text-sm text-muted-foreground">Only admins can access the site. All other users see a maintenance page.</p>
          </div>
          <input type="checkbox" className="w-5 h-5 accent-destructive" checked={form.maintenanceMode} onChange={e => setForm({...form, maintenanceMode: e.target.checked})} />
        </div>

        <div className={`flex items-center justify-between p-4 border rounded-xl transition-colors ${form.smtpEnabled ? "bg-primary/10 border-primary/40" : "bg-background border-border/50"}`}>
          <div>
            <p className="font-bold flex items-center gap-2">
              Email OTP Verification
              {form.smtpEnabled ? (
                <span className="text-xs text-primary font-semibold uppercase tracking-wide">On</span>
              ) : (
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Off</span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">When enabled, new users must verify their email with a one-time code before they can log in.</p>
          </div>
          <input type="checkbox" className="w-5 h-5 accent-primary" checked={form.smtpEnabled} onChange={e => setForm({...form, smtpEnabled: e.target.checked})} />
        </div>

        <Button 
          className="w-full mt-4" 
          onClick={() => updateMutation.mutate({ data: { ...settings!, ...form, maxUploadSizeMb: settings?.maxUploadSizeMb ?? 10, allowedFileTypes: settings?.allowedFileTypes ?? [], smtpEnabled: form.smtpEnabled } as any})}
          isLoading={updateMutation.isPending}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
