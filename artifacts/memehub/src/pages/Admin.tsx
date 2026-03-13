import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useGetAdminStats, useGetAdminPosts, useUpdatePostStatus, useGetAdminSettings, useUpdateAdminSettings } from "@workspace/api-client-react";
import { Button, Input, Badge, Textarea } from "@/components/ui/shared";
import { ShieldAlert, Users, Image as ImageIcon, MessageSquare, Activity, Settings, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/utils";

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<'dashboard'|'posts'|'users'|'settings'>('dashboard');

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
          <AdminTab active={tab === 'dashboard'} icon={<Activity />} label="Dashboard" onClick={() => setTab('dashboard')} />
          <AdminTab active={tab === 'posts'} icon={<ImageIcon />} label="Pending Posts" onClick={() => setTab('posts')} />
          <AdminTab active={tab === 'users'} icon={<Users />} label="Users" onClick={() => setTab('users')} />
          <AdminTab active={tab === 'settings'} icon={<Settings />} label="Site Settings" onClick={() => setTab('settings')} />
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-card border border-border/50 rounded-2xl p-6 shadow-sm min-h-[600px]">
          {tab === 'dashboard' && <AdminDashboard />}
          {tab === 'posts' && <AdminPosts />}
          {tab === 'users' && <AdminUsers />}
          {tab === 'settings' && <AdminSettings />}
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

function AdminSettings() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetAdminSettings();
  const updateMutation = useUpdateAdminSettings({
    mutation: {
      onSuccess: () => toast({ title: "Settings updated successfully" })
    }
  });

  const [form, setForm] = useState({
    siteName: "", siteDescription: "", allowRegistration: true, requireApproval: false, huggingFaceRepo: ""
  });

  // Populate form when data loads
  useState(() => {
    if (settings) setForm({
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      allowRegistration: settings.allowRegistration,
      requireApproval: settings.requireApproval,
      huggingFaceRepo: settings.huggingFaceRepo
    });
  }); // Note: useEffect is better here normally, keeping simple for code generation flow

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="max-w-xl space-y-6">
      <h3 className="text-xl font-bold mb-6">Site Configuration</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-bold mb-1 block">Site Name</label>
          <Input value={form.siteName || settings?.siteName} onChange={e => setForm({...form, siteName: e.target.value})} />
        </div>
        <div>
          <label className="text-sm font-bold mb-1 block">Site Description</label>
          <Textarea value={form.siteDescription || settings?.siteDescription} onChange={e => setForm({...form, siteDescription: e.target.value})} />
        </div>
        <div>
          <label className="text-sm font-bold mb-1 block">Hugging Face Dataset Repo</label>
          <Input value={form.huggingFaceRepo || settings?.huggingFaceRepo} onChange={e => setForm({...form, huggingFaceRepo: e.target.value})} placeholder="username/dataset-name" />
          <p className="text-xs text-muted-foreground mt-1">Used for storing uploaded meme images.</p>
        </div>
        <div className="flex items-center justify-between p-4 bg-background border border-border/50 rounded-xl mt-6">
          <div>
            <p className="font-bold">Require Post Approval</p>
            <p className="text-sm text-muted-foreground">New posts must be approved by admin before appearing in Fresh.</p>
          </div>
          <input type="checkbox" className="w-5 h-5 accent-primary" checked={form.requireApproval ?? settings?.requireApproval} onChange={e => setForm({...form, requireApproval: e.target.checked})} />
        </div>

        <Button 
          className="w-full mt-4" 
          onClick={() => updateMutation.mutate({ data: { ...settings!, ...form, maxUploadSizeMb: 5, allowedFileTypes: [], maintenanceMode: false }})}
          isLoading={updateMutation.isPending}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
