interface LoginFormValues {
  email: string;
  username?: string;
  password: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface LoginReturnValues {
  message: string;
  token: string;
  user: User;
}

interface IsoData {
  operating_partner: string | null;
  mid: string;
  corporation: string;
  dba: string;
  total_residual: number;
  paydiverse_residual: number;
  agent1_name: string;
  agent2_name: string;
  agent1_payout: number;
  agent2_payout: number;
  agent1_percentage?: number;
  agent2_percentage?: number;
}

interface CorporationData {
  dba: string;
  iso: string;
  mid: string;
  paydiverse_residual: number;
  total_residual: number;
  volume: number;
}

interface OperatingPartnerData {
  dba: string;
  iso: string;
  mid: string;
  corporation: string;
  volume: number;
  paydiverse_residual: number;
  total_residual: number;
}

interface AgentsData {
  iso: string;
  operating_partner: string | null;
  dba: string;
  corporation: string;
  mid: string;
  agent_percentage: string;
  agent_payout: number;
  paydiverse_residual: number;
  total_residual: number;
}

interface LogsTableColumns {
  date: string;
  iso: string;
  mid: string;
  dba: string;
  volume: number;
  total_residual: number;
  paydiverse_residual: number;
  agent1_name: string | null;
  agent1_percentage: number | null;
  agent1_payout: number | null;
  agent2_name: string | null;
  agent2_percentage: number | null;
  agent2_payout: number | null;
}

interface PaymentsColumns {
  id: number;
  iso: string;
  paydiverse_residual: number;
  bank_amount: number;
}

interface MIDsPerISO {
  mid: string;
  iso: string;
  dba: string;
  corporation: string;
  operating_partner: string | null;
  is_active: number;
  is_referred: number;
  iso_referral_type: string;
  approval_date: string;
  closed_date: string;
}

interface Columns {
  month: string;
  paydiverse_residual: number;
  total_residual: number;
}

interface MidsAdded {
  month: string;
  mid_count: number;
  merchants: {
    mid: string;
    dba: string;
    iso: string;
    corporation: string;
    approval_date: string;
    status: "Uploaded" | "Not uploaded";
  }[];
}
