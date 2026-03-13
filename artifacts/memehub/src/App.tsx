import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
