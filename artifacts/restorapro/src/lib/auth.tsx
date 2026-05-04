import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey, useGetMe, User } from "@workspace/api-client-react";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react/src/custom-fetch";

const TOKEN_KEY = "restorapro_token";

setBaseUrl(import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:8080" : null));
setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));

export function getHomePathForRole(role?: User["role"] | null) {
  switch (role) {
    case "kitchen":
      return "/kitchen";
    case "bar":
      return "/bar";
    case "waiter":
      return "/waiter";
    case "cashier":
      return "/cashier";
    case "receptionist":
      return "/reservations";
    case "inventory_manager":
      return "/inventory";
    case "admin":
    case "manager":
    default:
      return "/dashboard";
  }
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  const { data: me, isLoading } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
    },
  });

  useEffect(() => {
    if (me) {
      setUser(me);
      return;
    }

    if (!token) {
      setUser(null);
    }
  }, [me, token]);

  const login = (token: string, newUser: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    setToken(token);
    setUser(newUser);
    queryClient.setQueryData(getGetMeQueryKey(), newUser);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading: !!token && isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
