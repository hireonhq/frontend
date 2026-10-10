import axios from "axios";
import { getSupabase, getAuthReady } from "@/lib/supabase";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

axiosInstance.interceptors.request.use(
  async (config) => {
    // Wait for the initial session load so requests fired on mount (e.g. after
    // the OAuth redirect to /dashboard) don't go out unauthenticated.
    await getAuthReady();

    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        config.headers = config.headers || {};
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const hadAuthHeader = Boolean(error.config?.headers?.Authorization);
    if (
      typeof window !== "undefined" &&
      hadAuthHeader &&
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      await getSupabase()?.auth.signOut();
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
