// @ts-nocheck
import { useEffect, useState } from "react";
import { Table, Tag, Input, Typography } from "antd";
import dayjs from "dayjs";
import { supabase } from "../../utils/supabase";
import { AGENT_MAP } from "../../../api/_agentMap.js";
const { Text } = Typography;

const mon = (m) => dayjs(m).format("MMM YYYY");

// Plain-English version of the until / only / skip rules on a map entry.
const scopeNote = (e) => {
  const parts = [];
  if (e.only) parts.push("Only " + e.only.map(mon).join(", "));
  if (e.skip) parts.push("Not " + e.skip.map(mon).join(", "));
  if (e.until) parts.push("Through " + mon(e.until));
  return parts.join("; ") || "All months";
};

const AgentMidsSummaryTable = () => {
  const [merchants, setMerchants] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      let all = [], from = 0;
      while (true) {
        const { data } = await supabase.from("merchants").select("mid,business_name,status,merchant_type,isos!inner(name)").eq("isos.status","active").range(from, from + 999);
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < 1000) break;
        from += 1000;
      }
      const map = {};
      all.forEach(m => { if (m.mid) map[m.mid] = m; });
      setMerchants(map);
      setLoading(false);
    })();
  }, []);

  const rows = [];
  Object.keys(AGENT_MAP).forEach(agent => {
    AGENT_MAP[agent].forEach((e, i) => {
      const m = merchants[e.mid];
      rows.push({
        key: agent + "|" + e.mid + "|" + i,
        agent,
        mid: e.mid,
        pct: e.pct,
        dba: m?.business_name || "",
        iso: m?.isos?.name || "",
        type: m ? (m.merchant_type === "gateway" ? "Gateway" : "MID") : "",
        active: m ? m.status === "active" : null,
        scope: scopeNote(e),
        found: !!m,
      });
    });
  });

  const q = search.trim().toLowerCase();
  const shown = rows.filter(r => !q || [r.agent, r.mid, r.dba, r.iso].some(v => (v || "").toLowerCase().includes(q)));
  const agentNames = Object.keys(AGENT_MAP);
  const isoNames = Array.from(new Set(rows.map(r => r.iso).filter(Boolean))).sort();
  const dash = <Text style={{ color: "var(--muted-color)" }}>--</Text>;
  const by = (k) => (a, b) => (a[k] || "").localeCompare(b[k] || "");

  const columns = [
    { title: "Agent", dataIndex: "agent", width: 170, sorter: by("agent"), defaultSortOrder: "ascend",
      filters: agentNames.map(n => ({ text: n, value: n })), onFilter: (v, r) => r.agent === v,
      render: v => <Text strong>{v}</Text> },
    { title: "MID", dataIndex: "mid", width: 190, sorter: by("mid") },
    { title: "DBA", dataIndex: "dba", ellipsis: true, sorter: by("dba"), render: v => v || dash },
    { title: "ISO", dataIndex: "iso", width: 160, sorter: by("iso"),
      filters: isoNames.map(n => ({ text: n, value: n })), onFilter: (v, r) => r.iso === v, render: v => v || dash },
    { title: "Type", dataIndex: "type", width: 100,
      filters: [{ text: "MID", value: "MID" }, { text: "Gateway", value: "Gateway" }], onFilter: (v, r) => r.type === v,
      render: v => v ? <Tag color="blue" style={{ color: "var(--navy-color)" }}>{v}</Tag> : dash },
    { title: "Active", dataIndex: "active", width: 90,
      filters: [{ text: "Yes", value: true }, { text: "No", value: false }], onFilter: (v, r) => r.active === v,
      render: v => v === null ? dash : v ? <Tag color="green">Yes</Tag> : <Tag color="error">No</Tag> },
    { title: "Agent %", dataIndex: "pct", width: 100, sorter: (a, b) => a.pct - b.pct, render: v => v + "%" },
    { title: "Applies To", dataIndex: "scope", width: 260, ellipsis: true },
  ];

  const missing = rows.filter(r => !r.found).length;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "8px 0 16px", flexWrap: "wrap", gap: 8 }}>
        <Input.Search allowClear placeholder="Search agent, MID, DBA or ISO" style={{ width: 340 }} value={search} onChange={e => setSearch(e.target.value)} />
        <Text style={{ color: "var(--muted-color)" }}>
          {shown.length} of {rows.length} agent-MID assignments{missing ? ` (${missing} MIDs not found in Merchants)` : ""}
        </Text>
      </div>
      <Table loading={loading} dataSource={shown} columns={columns} rowKey="key" size="small"
        scroll={{ x: "max-content" }} pagination={{ pageSize: 50, showSizeChanger: true }} />
    </>
  );
};
export default AgentMidsSummaryTable;
