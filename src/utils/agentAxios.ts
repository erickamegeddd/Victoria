import axios from "axios";

// Separate axios instance for agent API endpoints served by Vercel functions.
// Uses an empty baseURL so paths like "/api/agents-payout" resolve to the same origin.
const agentClient = axios.create({
  baseURL: "",
  headers: { "Content-Type": "application/json" },
});

export default agentClient;
