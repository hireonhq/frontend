import axios from "axios";
import { getSupabase, getAuthReady } from "@/lib/supabase";

// Same-origin by default. The browser calls this Next.js app, which proxies
// /api/* to the backend over the private Docker network (see app/api/[...path]).
// No absolute backend URL is needed, so nothing about the internal topology is
// inlined into the client bundle. NEXT_PUBLIC_API_URL remains an escape hatch for
// a deployment that does expose the API directly.
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
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
