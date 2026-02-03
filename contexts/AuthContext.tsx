import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  signOut: async () => { },
  authError: null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) setLoading(false);
    }).catch((err) => {
      console.error("Auth session check failed", err);
      setUser(null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const checkAccessAndRole = async () => {
      if (user) {
        setLoading(true);
        setAuthError(null);
        try {
          // 1. Check if email is whitelisted
          const { data: allowedData, error: allowedError } = await supabase
            .from('allowed_emails')
            .select('role')
            .eq('email', user.email)
            .maybeSingle();

          if (allowedError) {
            console.error("Error checking whitelist:", allowedError);
          }

          if (!allowedData) {
            // Not in whitelist - Forbidden
            setAuthError("등록되지 않은 사용자입니다. 관리자에게 문의하세요.");
            await supabase.auth.signOut();
            setUser(null);
            setRole(null);
            setLoading(false);
            return;
          }

          // 2. Fetch or sync profile role
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profileData) {
            setRole(profileData.role);
          } else if (profileError) {
            console.error("Error fetching user role:", profileError);
          }
        } catch (err) {
          console.error("Auth context access check failed", err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    checkAccessAndRole();
  }, [user]);

  useEffect(() => {
    // Clean up URL hash after successful OAuth redirect
    if (user && window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut, authError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
