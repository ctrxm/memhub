import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import "@/lib/fetch-override";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Profile from "@/pages/Profile";
import PostDetail from "@/pages/PostDetail";
import Upload from "@/pages/Upload";
import Search from "@/pages/Search";
import Admin from "@/pages/Admin";
import TagPage from "@/pages/TagPage";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";
import Communities from "@/pages/Communities";
import CommunityPage from "@/pages/CommunityPage";
import NotFound from "@/pages/not-found";
import Maintenance from "@/pages/Maintenance";
import { useEffect, useState } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/post/:id" component={PostDetail} />
      <Route path="/u/:username" component={Profile} />
      <Route path="/upload" component={Upload} />
      <Route path="/search" component={Search} />
      <Route path="/admin" component={Admin} />
      <Route path="/tag/:slug" component={TagPage} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/settings" component={Settings} />
      <Route path="/communities" component={Communities} />
      <Route path="/c/:slug" component={CommunityPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, isLoading: authLoading } = useAuth();
  const [maintenance, setMaintenance] = useState(false);
  const [statusChecked, setStatusChecked] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/status`)
      .then(r => r.json())
      .then(data => {
        setMaintenance(data.maintenanceMode === true);
      })
      .catch(() => {})
      .finally(() => setStatusChecked(true));
  }, []);

  // Re-check status every 30 seconds so maintenance can be lifted without refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${BASE}/api/status`)
        .then(r => r.json())
        .then(data => setMaintenance(data.maintenanceMode === true))
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Wait until both auth and status are resolved
  if (!statusChecked || authLoading) return null;

  // Show maintenance page for non-admins
  if (maintenance && user?.role !== "admin") return <Maintenance />;

  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <TooltipProvider>
            <AppContent />
          </TooltipProvider>
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
