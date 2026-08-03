import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Perfil = Tables<"perfis">;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  perfil: Perfil | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRequestRef = useRef(0);

  const fetchPerfil = useCallback(async (uid: string): Promise<Perfil | null> => {
    const { data, error } = await supabase
      .from("perfis")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar perfil:", error);
      return null;
    }
    return data;
  }, []);

  const applySession = useCallback(
    async (nextSession: Session | null) => {
      const requestId = ++sessionRequestRef.current;
      setSession(nextSession);
      if (!nextSession?.user) {
        setPerfil(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const nextPerfil = await fetchPerfil(nextSession.user.id);
      if (requestId !== sessionRequestRef.current) return;
      setPerfil(nextPerfil);
      setLoading(false);
    },
    [fetchPerfil],
  );

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) void applySession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      window.setTimeout(() => {
        if (mounted) void applySession(nextSession);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) return { error: error?.message ?? "Não foi possível entrar." };

      const nextPerfil = await fetchPerfil(data.session.user.id);
      if (!nextPerfil || nextPerfil.perfil !== "admin" || !nextPerfil.ativo) {
        await supabase.auth.signOut();
        setSession(null);
        setPerfil(null);
        return { error: "Este usuário não possui acesso administrativo ativo." };
      }

      sessionRequestRef.current += 1;
      setSession(data.session);
      setPerfil(nextPerfil);
      return { error: null };
    },
    [fetchPerfil],
  );

  const signOut = useCallback(async () => {
    sessionRequestRef.current += 1;
    await supabase.auth.signOut();
    setSession(null);
    setPerfil(null);
  }, []);

  const refreshPerfil = useCallback(async () => {
    if (!session?.user) return;
    setPerfil(await fetchPerfil(session.user.id));
  }, [fetchPerfil, session]);

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user: session?.user ?? null,
      perfil,
      isAdmin: perfil?.perfil === "admin" && perfil.ativo,
      loading,
      signIn,
      signOut,
      refreshPerfil,
    }),
    [loading, perfil, refreshPerfil, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}
