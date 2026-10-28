// Shared auth for agent endpoints: verifies the caller's Supabase login token.
// Role comes from app_metadata (users cannot edit it themselves); user_metadata may only downgrade to "agent".
const SUPABASE_URL = "https://vuqflofuzhybutkkzroa.supabase.co";

export async function getCaller(req) {
  const h = req.headers.authorization || req.headers.Authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const u = await r.json();
    if (!u || !u.id) return null;
    const app = u.app_metadata || {};
    const meta = u.user_metadata || {};
    let role = app.role || (meta.role === "agent" ? "agent" : null);
    if (role === "super_admin") role = "admin";
    return { id: u.id, email: u.email, role, name: meta.name || u.email };
  } catch {
    return null;
  }
}

// opts.agentScoped: agents may call this endpoint, but only for their own agent_name (forced onto req.query).
// Without it the endpoint is admin-only. Returns the caller, or null after sending 401/403.
export async function requireCaller(req, res, opts = {}) {
  const c = await getCaller(req);
  if (!c) { res.status(401).json({ error: "Login required" }); return null; }
  if (c.role === "admin") return c;
  if (c.role === "agent" && opts.agentScoped) { req.query.agent_name = c.name; return c; }
  res.status(403).json({ error: "Not allowed" });
  return null;
}
