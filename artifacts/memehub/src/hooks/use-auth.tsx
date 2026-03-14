import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { useGetMe, UserProfile } from "@workspace/api-client-react";

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user?: UserProfile) => void;
  logout: () => void;
}

const STORAGE_TOKEN_KEY = "ovrhub_token";
const STORAGE_USER_KEY = "ovrhub_user";

function getCachedUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_TOKEN_KEY) ?? localStorage.getItem("memehub_token")
  );
  const [cachedUser, setCachedUser] = useState<UserProfile | null>(() => getCachedUser());

  const { data: freshUser, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: (failureCount, err) => {
        const status = (err as any)?.status ?? (err as any)?.response?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
      retryDelay: 1500,
      staleTime: 5 * 60 * 1000,
    }
  });

  useEffect(() => {
    if (freshUser) {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(freshUser));
      setCachedUser(freshUser);
    }
  }, [freshUser]);

  useEffect(() => {
    if (error && token) {
      const status = (error as any)?.status ?? (error as any)?.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        localStorage.removeItem("memehub_token");
        localStorage.removeItem(STORAGE_USER_KEY);
        setToken(null);
        setCachedUser(null);
      }
    }
  }, [error, token]);

  const handleLogin = (newToken: string, user?: UserProfile) => {
    localStorage.setItem(STORAGE_TOKEN_KEY, newToken);
    setToken(newToken);
    if (user) {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
      setCachedUser(user);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem("memehub_token");
    localStorage.removeItem(STORAGE_USER_KEY);
    setToken(null);
    setCachedUser(null);
    setLocation("/login");
  };

  const activeUser = freshUser || cachedUser;

  return (
    <AuthContext.Provider
      value={{
        user: activeUser || null,
        token,
        isLoading: !!token && isLoading && !cachedUser,
        isAuthenticated: !!activeUser,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
