import { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, User } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react/src/custom-fetch";

const TOKEN_KEY = "restorapro_token";

setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  const { data: me, isLoading } = useGetMe({
    query: {
      enabled: !!localStorage.getItem(TOKEN_KEY),
      retry: false
    }
  });

  useEffect(() => {
    if (me) setUser(me);
  }, [me]);

  const login = (token: string, newUser: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
