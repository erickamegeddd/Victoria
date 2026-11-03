import { Tag } from "antd";
import formatCurrency from "../../utils/formatCurrency";

export const isoColumns: any = [
  {
    key: 1,
    title: "Operating Partner",
    dataIndex: "operating_partner",
    width: "400px",
    sorter: (a: IsoData, b: IsoData) => {
      if (a.operating_partner && b.operating_partner) {
        return a?.operating_partner.localeCompare(b?.operating_partner);
      }
      return a.operating_partner ? -1 : 1;
    },
    render: (operating_partner: string) => {
      if (!operating_partner) return <Tag color="error">Not Provided</Tag>;
      return operating_partner;
    },
  },
  { key: 2, title: "MID", dataIndex: "mid", width: "400px", sorter: (a: IsoData, b: IsoData) => { if (!a.mid || !b.mid) return a.mid ? -1 : 1; return a.mid.localeCompare(b.mid); }, render: (mid: string) => mid || <Tag color="error">Not Provided</Tag> },
  { key: 3, title: "Corporation", dataIndex: "corporation", width: "400px", sorter: (a: IsoData, b: IsoData) => { if (!a.corporation || !b.corporation) return a.corporation ? -1 : 1; return a.corporation.localeCompare(b.corporation); }, render: (corporation: string) => corporation || <Tag color="error">Not Provided</Tag> },
  { key: 4, title: "DBA", dataIndex: "dba", width: "400px", sorter: (a: IsoData, b: IsoData) => { if (!a.dba || !b.dba) return a.dba ? -1 : 1; return a.dba.localeCompare(b.dba); }, render: (dba: string) => dba || <Tag color="error">Not Provided</Tag> },
  { key: 5, title: "Total Residual", dataIndex: "total_residual", width: "400px", sorter: (a: IsoData, b: IsoData) => a.total_residual - b.total_residual, render: (v: any) => formatCurrency(v) },
  { key: 6, title: "PayDiverse Residual", dataIndex: "paydiverse_residual", width: "400px", sorter: (a: IsoData, b: IsoData) => a.paydiverse_residual - b.paydiverse_residual, render: (v: any) => formatCurrency(v) },
  { key: 7, title: "Agent 1 Name", dataIndex: "agent1_name", width: "400px", sorter: (a: IsoData, b: IsoData) => { if (!a.agent1_name || !b.agent1_name) return a.agent1_name ? -1 : 1; return a.mid.localeCompare(b.agent1_name); }, render: (v: string) => v || <Tag color="error">Not Provided</Tag> },
  { key: 8, title: "Agent 1 Percentage", dataIndex: "agent1_percentage", width: "150px", sorter: (a: IsoData, b: IsoData) => (a?.agent1_percentage || 0) - (b?.agent1_percentage || 0), render: (v: any) => v ? v + " %" : <Tag color="error">Not Provided</Tag> },
  { key: 9, title: "Agent 1 Payout", dataIndex: "agent1_payout", width: "150px", sorter: (a: IsoData, b: IsoData) => a.agent1_payout - b.agent1_payout, render: (v: any) => v ? formatCurrency(v) : <Tag color="error">Not Provided</Tag> },
  { key: 10, title: "Agent 2 Name", dataIndex: "agent2_name", width: "400px", sorter: (a: IsoData, b: IsoData) => { if (!a.agent2_name || !b.agent2_name) return a.agent2_name ? -1 : 1; return a.mid.localeCompare(b.agent2_name); }, render: (v: string) => v || <Tag color="error">Not Provided</Tag> },
  { key: 11, title: "Agent 2 Percentage", dataIndex: "agent2_percentage", width: "150px", sorter: (a: IsoData, b: IsoData) => (a?.agent2_percentage || 0) - (b?.agent2_percentage || 0), render: (v: any) => v ? v + " %" : <Tag color="error">Not Provided</Tag> },
  { key: 12, title: "Agent 2 Payout", dataIndex: "agent2_payout", width: "150px", sorter: (a: IsoData, b: IsoData) => a.agent2_payout - b.agent2_payout, render: (v: any) => v ? formatCurrency(v) : <Tag color="error">Not Provided</Tag> },
];

export const corporationColumns: any = [
  { key: 1, title: "MID", dataIndex: "mid", width: "400px", sorter: (a: any, b: any) => { if (!a.mid || !b.mid) return a.mid ? -1 : 1; return a.mid.localeCompare(b.mid); }, render: (mid: string) => mid || <Tag color="error">Not Provided</Tag> },
  { key: 2, title: "ISO", dataIndex: "iso", width: "400px", sorter: (a: any, b: any) => { if (!a.iso || !b.iso) return a.iso ? -1 : 1; return a.iso.localeCompare(b.iso); }, render: (iso: string) => iso || <Tag color="error">Not Provided</Tag> },
  { key: 3, title: "DBA", dataIndex: "dba", width: "400px", sorter: (a: any, b: any) => { if (!a.dba || !b.dba) return a.dba ? -1 : 1; return a.dba.localeCompare(b.dba); }, render: (dba: string) => dba || <Tag color="error">Not Provided</Tag> },
  { key: 4, title: "Volume", dataIndex: "volume", width: "400px", sorter: (a: any, b: any) => a.volume - b.volume, render: (v: any) => formatCurrency(v || 0) },
  { key: 5, title: "Total Residual", dataIndex: "total_residual", width: "400px", sorter: (a: any, b: any) => a.total_residual - b.total_residual, render: (v: any) => formatCurrency(v) },
  { key: 6, title: "PayDiverse Residual", dataIndex: "paydiverse_residual", width: "400px", sorter: (a: any, b: any) => a.paydiverse_residual - b.paydiverse_residual, render: (v: any) => formatCurrency(v) },
];

export const operatingPartnerColumns: any = [
  { key: 1, title: "MID", dataIndex: "mid", width: "400px", sorter: (a: any, b: any) => { if (!a.mid || !b.mid) return a.mid ? -1 : 1; return a.mid.localeCompare(b.mid); }, render: (mid: string) => mid || <Tag color="error">Not Provided</Tag> },
  { key: 2, title: "ISO", dataIndex: "iso", width: "400px", sorter: (a: any, b: any) => { if (!a.iso || !b.iso) return a.iso ? -1 : 1; return a.iso.localeCompare(b.iso); }, render: (iso: string) => iso || <Tag color="error">Not Provided</Tag> },
  { key: 3, title: "DBA", dataIndex: "dba", width: "400px", sorter: (a: any, b: any) => { if (!a.dba || !b.dba) return a.dba ? -1 : 1; return a.dba.localeCompare(b.dba); }, render: (dba: string) => dba || <Tag color="error">Not Provided</Tag> },
  { key: 4, title: "Corporation", dataIndex: "corporation", width: "150px", sorter: (a: any, b: any) => { if (!a.corporation || !b.corporation) return a.corporation ? -1 : 1; return a.corporation?.localeCompare(b.corporation); }, render: (corporation: string) => corporation || <Tag color="error">Not Provided</Tag> },
  { key: "volume", title: "Volume", dataIndex: "volume", width: "400px", sorter: (a: any, b: any) => a.volume - b.volume, render: (v: any) => v ? formatCurrency(v) : formatCurrency(0) },
  { key: 5, title: "Total Residual", dataIndex: "total_residual", width: "400px", sorter: (a: any, b: any) => a.total_residual - b.total_residual, render: (v: any) => formatCurrency(v) },
  { key: 6, title: "PayDiverse Residual", dataIndex: "paydiverse_residual", width: "400px", sorter: (a: any, b: any) => a.paydiverse_residual - b.paydiverse_residual, render: (v: any) => formatCurrency(v) },
];

export const agentColumns: any = [
  { key: 1, title: "ISO", dataIndex: "iso", width: "150px", sorter: (a: any, b: any) => { if (!a.iso || !b.iso) return a.iso ? -1 : 1; return a.iso?.localeCompare(b.iso); }, render: (iso: string) => iso || <Tag color="error">Not Provided</Tag> },
  { key: 2, title: "Operating Partner", dataIndex: "operating_partner", width: "250px", sorter: (a: any, b: any) => { if (!a.operating_partner || !b.operating_partner) return a.operating_partner ? -1 : 1; return a.operating_partner?.localeCompare(b.operating_partner); }, render: (v: string) => v || <Tag color="error">Not Provided</Tag> },
  { key: 3, title: "Corporation", dataIndex: "corporation", width: "150px", sorter: (a: any, b: any) => { if (!a.corporation || !b.corporation) return a.corporation ? -1 : 1; return a.corporation?.localeCompare(b.corporation); }, render: (v: string) => v || <Tag color="error">Not Provided</Tag> },
  { key: 4, title: "DBA", dataIndex: "dba", width: "150px", sorter: (a: any, b: any) => { if (!a.dba || !b.dba) return a.dba ? -1 : 1; return a.dba?.localeCompare(b.dba); }, render: (v: string) => v || <Tag color="error">Not Provided</Tag> },
  { key: 5, title: "MID", dataIndex: "mid", width: "150px", sorter: (a: any, b: any) => a.mid?.localeCompare(b.mid), render: (mid: string) => mid || <Tag color="error">Not Provided</Tag> },
  { key: 6, title: "Total Residual", dataIndex: "total_residual", width: "150px", sorter: (a: any, b: any) => (a?.total_residual || 0) - (b?.total_residual || 0), render: (v: number) => formatCurrency(v) },
  { key: 7, title: "PayDiverse Residual", dataIndex: "paydiverse_residual", width: "150px", sorter: (a: any, b: any) => (a?.paydiverse_residual || 0) - (b?.paydiverse_residual || 0), render: (v: number) => formatCurrency(v) },
  { key: 8, title: "Agent Percentage", dataIndex: "agent_percentage", width: "150px", sorter: (a: any, b: any) => (a?.agent_percentage || "").localeCompare(b?.agent_percentage || ""), render: (v: string) => v ? `${v}%` : <Tag color="error">Not Provided</Tag> },
  { key: 9, title: "Agent Payout", dataIndex: "agent_payout", width: "150px", className: "custom-column", onHeaderCell: () => ({className: "custom-header"}), sorter: (a: any, b: any) => (a?.agent_payout ?? 0) - (b?.agent_payout ?? 0), render: formatCurrency },
];
