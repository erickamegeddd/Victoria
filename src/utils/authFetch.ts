// @ts-nocheck
import { supabase } from "./supabase";

// Attach the Supabase login token to same-origin /api/ fetch calls (plain fetch users: Insights, Adjustments, Users)
const origFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  try {
    const url = typeof input === "string" ? input : input?.url || "";
    if (url.startsWith("/api/")) {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) {
        const headers = new Headers(init?.headers || (typeof input !== "string" ? input.headers : undefined));
        if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
        return origFetch(input, { ...(init || {}), headers });
      }
    }
  } catch { /* fall through to a plain fetch */ }
  return origFetch(input, init);
};
