import axios from "axios";
import { supabase } from "./supabase";

// Separate axios instance for agent API endpoints served by Vercel functions.
// Uses an empty baseURL so paths like "/api/agents-payout" resolve to the same origin.
const agentClient = axios.create({
  baseURL: "",
  headers: { "Content-Type": "application/json" },
});

// Send the (auto-refreshed) Supabase login token so the API can tell who is asking
agentClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) config.headers = { ...(config.headers as any), Authorization: `Bearer ${token}` };
  return config;
});

export default agentClient;
