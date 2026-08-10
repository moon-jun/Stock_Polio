import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  userId: string | null;
  name: string | null;
  login: (id: string, name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedId = localStorage.getItem('selectedUserId');
    const storedName = localStorage.getItem('selectedUserName');
    if (storedId && storedName) {
      setUserId(storedId);
      setName(storedName);
    }
    setLoading(false);
  }, []);

  const login = (id: string, n: string) => {
    localStorage.setItem('selectedUserId', id);
    localStorage.setItem('selectedUserName', n);
    setUserId(id);
    setName(n);
  };

  const logout = () => {
    localStorage.removeItem('selectedUserId');
    localStorage.removeItem('selectedUserName');
    setUserId(null);
    setName(null);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ userId, name, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
