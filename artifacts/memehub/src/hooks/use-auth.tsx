import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { useGetMe, UserProfile } from "@workspace/api-client-react";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(localStorage.getItem('memehub_token'));

  // Use the generated hook to fetch current user
  const { data: user, isLoading, error, refetch } = useGetMe({
    query: {
      enabled: !!token,
      retry: 2,
      retryDelay: 1000,
    }
  });

  // Handle token changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('memehub_token', token);
      refetch();
    } else {
      localStorage.removeItem('memehub_token');
    }
  }, [token, refetch]);

  // Only clear token on 401 (invalid/expired token), not on server errors
  useEffect(() => {
    if (error && token) {
      const status = (error as any)?.status ?? (error as any)?.response?.status;
      if (status === 401) {
        setToken(null);
      }
    }
  }, [error, token]);

  const handleLogin = (newToken: string) => {
    localStorage.setItem('memehub_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('memehub_token');
    setToken(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading: !!token && isLoading,
        isAuthenticated: !!user,
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
