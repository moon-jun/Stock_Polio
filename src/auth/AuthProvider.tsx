import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../shared/firebase';

interface AuthContextType {
  userId: string | null;
  name: string | null;
  login: (id: string, name: string) => Promise<void>;
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

  const login = async (id: string, n: string) => {
    const userRef = doc(db, 'users', id);
    if (!(await getDoc(userRef)).exists()) {
      await setDoc(userRef, { name: n, activeStockIds: [], createdAt: serverTimestamp() });
    }
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
