import { create } from "zustand";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";

import { getSupabase, getAuthReady } from "../lib/supabase";

interface AuthState {
  session: Session | null;
  user: SupabaseUser | null;
  loading: boolean;
  init: () => Promise<void>;
  sendMagicLink: (
    email: string,
    redirectTo?: string
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
}

let subscribing = false;

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,

  init: async () => {
    const supabase = getSupabase();
    if (!supabase) {
      set({ loading: false });
      return;
    }

    await getAuthReady();
    const { data } = await supabase.auth.getSession();
    set({
      session: data.session,
      user: data.session?.user ?? null,
      loading: false,
    });

    // Register the listener only once, no matter how many pages call init().
    if (!subscribing) {
      subscribing = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null, loading: false });
      });
    }
  },

  sendMagicLink: async (email, redirectTo) => {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        message:
          "Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Magic link doubles as signup: first-time emails create the account.
        shouldCreateUser: true,
        emailRedirectTo:
          redirectTo ||
          (typeof window !== "undefined"
            ? `${window.location.origin}/dashboard`
            : undefined),
      },
    });

    if (error) return { success: false, message: error.message };
    return {
      success: true,
      message: "Link masuk sudah dikirim. Cek email kamu.",
    };
  },

  logout: async () => {
    await getSupabase()?.auth.signOut();
    set({ session: null, user: null });
  },
}));
