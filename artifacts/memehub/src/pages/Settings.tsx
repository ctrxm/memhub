import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button, Input, Avatar } from "@/components/ui/shared";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, User, Image as ImageIcon, Save, Lock, Loader2 } from "lucide-react";

export default function Settings() {
  const { user, isAuthenticated, login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<"profile" | "avatar" | "password">("profile");
  const [isSaving, setIsSaving] = useState(false);

  const [profileForm, setProfileForm] = useState({ username: "", bio: "" });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });

  useEffect(() => {
    if (user) {
      setProfileForm({ username: user.username || "", bio: user.bio || "" });
      setAvatarUrl(user.avatar || "");
    }
  }, [user]);

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-4">Login required</h2>
          <Button onClick={() => setLocation("/login")}>Log in</Button>
        </div>
      </Layout>
    );
  }

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${BASE}/api/users/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: profileForm.username, bio: profileForm.bio }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        toast({ title: "Profile updated!" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handleSaveAvatar = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${BASE}/api/users/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: avatarUrl }),
      });
      if (!res.ok) {
        toast({ title: "Error", description: "Failed to update avatar", variant: "destructive" });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        toast({ title: "Avatar updated!" });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (passwordForm.newPass.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    toast({ title: "Password change coming soon", description: "This feature is in development" });
  };

  return (
    <Layout hideSidebar>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl font-bold mb-8 flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-primary" /> Settings
        </h1>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-52 shrink-0 space-y-1">
            <SettingsTab active={tab === "profile"} icon={<User className="w-4 h-4" />} label="Profile" onClick={() => setTab("profile")} />
            <SettingsTab active={tab === "avatar"} icon={<ImageIcon className="w-4 h-4" />} label="Avatar" onClick={() => setTab("avatar")} />
            <SettingsTab active={tab === "password"} icon={<Lock className="w-4 h-4" />} label="Password" onClick={() => setTab("password")} />
          </div>

          <div className="flex-1 bg-card border border-border/50 rounded-2xl p-6">
            {tab === "profile" && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
                <div className="flex items-center gap-4 p-4 bg-secondary/20 rounded-xl border border-border/30">
                  <Avatar src={user?.avatar} fallback={user?.username || ""} className="w-14 h-14" />
                  <div>
                    <p className="font-bold text-lg">{user?.username}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold block mb-1.5">Username</label>
                  <Input
                    value={profileForm.username}
                    onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="memelord99"
                    maxLength={30}
                  />
                  <p className="text-xs text-muted-foreground mt-1">3–30 characters, letters/numbers/underscores only</p>
                </div>
                <div>
                  <label className="text-sm font-bold block mb-1.5">Bio</label>
                  <textarea
                    value={profileForm.bio}
                    onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="Tell everyone something about yourself..."
                    maxLength={200}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">{profileForm.bio.length}/200</p>
                </div>
                <Button onClick={handleSaveProfile} isLoading={isSaving} className="gap-2 rounded-full px-8">
                  <Save className="w-4 h-4" /> Save Changes
                </Button>
              </div>
            )}

            {tab === "avatar" && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold mb-4">Update Avatar</h2>
                <div className="flex flex-col items-center gap-6 py-4">
                  <Avatar src={avatarUrl || user?.avatar} fallback={user?.username || ""} className="w-28 h-28 text-3xl" />
                  <div className="w-full space-y-2">
                    <label className="text-sm font-bold block">Avatar Image URL</label>
                    <Input
                      value={avatarUrl}
                      onChange={e => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/your-avatar.jpg"
                    />
                    <p className="text-xs text-muted-foreground">Paste a URL to an image. Supports JPG, PNG, GIF, WebP.</p>
                  </div>
                </div>
                <Button onClick={handleSaveAvatar} isLoading={isSaving} className="gap-2 rounded-full px-8">
                  <Save className="w-4 h-4" /> Update Avatar
                </Button>
              </div>
            )}

            {tab === "password" && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold mb-4">Change Password</h2>
                <div>
                  <label className="text-sm font-bold block mb-1.5">Current Password</label>
                  <Input type="password" value={passwordForm.current} onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))} placeholder="••••••••" />
                </div>
                <div>
                  <label className="text-sm font-bold block mb-1.5">New Password</label>
                  <Input type="password" value={passwordForm.newPass} onChange={e => setPasswordForm(f => ({ ...f, newPass: e.target.value }))} placeholder="••••••••" minLength={6} />
                </div>
                <div>
                  <label className="text-sm font-bold block mb-1.5">Confirm New Password</label>
                  <Input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))} placeholder="••••••••" />
                </div>
                <Button onClick={handleChangePassword} isLoading={isSaving} className="gap-2 rounded-full px-8">
                  <Lock className="w-4 h-4" /> Change Password
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function SettingsTab({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
    >
      {icon} {label}
    </button>
  );
}
