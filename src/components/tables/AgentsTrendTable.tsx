// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Card, Table, Typography, Select, Space, Tooltip, Spin } from "antd";
import dayjs from "dayjs";
import agentClient from "../../utils/agentAxios";

const { Text } = Typography;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FIRST_YEAR = 2026;
const money = (n) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AgentsTrendTable = ({ hideTotal = false, mode = "calendar", endMonth }: { hideTotal?: boolean; mode?: "calendar" | "trailing"; endMonth?: string }) => {
  const trailing = mode === "trailing";
  const currentYear = dayjs().year();
  const [year, setYear] = useState(Math.max(currentYear, FIRST_YEAR));
  // the 12 month columns: Jan-Dec of the chosen year, or the 12 months ending at endMonth
  const end = dayjs(endMonth || dayjs().subtract(2, "month").startOf("month").format("YYYY-MM-01")).startOf("month");
  const monthDates = trailing
    ? MONTHS.map((_, i) => end.subtract(11 - i, "month").format("YYYY-MM-01"))
    : MONTHS.map((_, m) => `${year}-${String(m + 1).padStart(2, "0")}-01`);
  const monthLabels = trailing ? monthDates.map(d => dayjs(d).format("MMM YY")) : MONTHS;
  const [byMonth, setByMonth] = useState(MONTHS.map(() => []));
  const [loading, setLoading] = useState(false);

  const yearOptions = [];
  for (let y = FIRST_YEAR; y <= Math.max(currentYear, FIRST_YEAR) + 3; y++) yearOptions.push({ value: y, label: String(y) });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const res = await Promise.all(
        monthDates.map((d) =>
          agentClient
            .get("/api/agents-payout", { params: { date: d } })
            .then(r => (Array.isArray(r.data) ? r.data : []))
            .catch(() => [])
        )
      );
      if (!cancelled) { setByMonth(res); setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [year, trailing, monthDates[0], monthDates[11]]);

  const rows = useMemo(() => {
    const seen = {};
    byMonth.forEach(list => list.forEach(a => { seen[a.agent_name] = true; }));
    return Object.keys(seen).map(name => {
      const months = byMonth.map(list => {
        const a = list.find(x => x.agent_name === name);
        // no MIDs reporting and no payout = no data for that month
        return a && (a.mid_count > 0 || a.total_payout !== 0) ? Math.round(a.total_payout * 100) / 100 : null;
      });
      const total = Math.round(months.reduce((s, v) => s + (v || 0), 0) * 100) / 100;
      return { key: name, name, months, total };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [byMonth]);

  const monthTotals = MONTHS.map((_, m) => {
    const vals = rows.map(r => r.months[m]).filter(v => v != null);
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) * 100) / 100 : null;
  });
  const grandTotal = Math.round(rows.reduce((s, r) => s + r.total, 0) * 100) / 100;

  const monthCell = (v) => {
    if (v == null) return <span style={{ color: "#c0c4cc" }}>--</span>;
    return <span style={{ fontWeight: 500 }}>{money(v)}</span>;
  };

  const totalRow = { key: "__total", name: "TOTAL", months: monthTotals, total: grandTotal, isTotal: true };
  const dataRows = hideTotal ? rows : [...rows, totalRow];

  // TOTAL row always stays last regardless of sort direction
  const sortBy = (get) => (a, b, order) => {
    if (a.isTotal) return order === "ascend" ? 1 : -1;
    if (b.isTotal) return order === "ascend" ? -1 : 1;
    const x = get(a), y = get(b);
    if (typeof x === "string") return x.localeCompare(y);
    return (x == null ? -Infinity : x) - (y == null ? -Infinity : y);
  };

  const columns = [
    { title: "Agent", dataIndex: "name", key: "name", sorter: sortBy(r => r.name), sortDirections: ["ascend", "descend"], fixed: "left", width: 190, render: (v, r) => <span style={{ fontWeight: r.isTotal ? 700 : 600 }}>{v}</span> },
    ...monthLabels.map((label, m) => ({
      title: label, key: label, align: "right", width: 100, sorter: sortBy(r => r.months[m]), sortDirections: ["descend", "ascend"],
      render: (_, r) => {
        if (r.isTotal) return <span style={{ fontWeight: 700 }}>{r.months[m] == null ? "--" : money(r.months[m])}</span>;
        return monthCell(r.months[m]);
      }
    })),
    { title: trailing ? "12-Mo Total" : `${year} Total`, key: "total", align: "right", width: 120, sorter: sortBy(r => r.total), sortDirections: ["descend", "ascend"], fixed: "right", render: (_, r) => <span style={{ fontWeight: 700, color: "inherit" }}>{money(r.total)}</span> },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <Text style={{ color: "var(--muted-color)", fontSize: 13 }}>
          {hideTotal ? (trailing ? "Your monthly payout for the trailing 12 months. Months without data show --." : "Your monthly payout, January to December of the selected year (year-to-date).") : (trailing ? "Monthly agent payout per agent for the trailing 12 months. Click any column header to sort." : "Monthly agent payout per agent (same numbers as Revenue Per Agent). Click any column header to sort.")}
        </Text>
        {trailing ? (
          <Text style={{ fontWeight: 600 }}>{monthLabels[0]} - {monthLabels[11]}</Text>
        ) : (
          <Space>
            <Text style={{ fontWeight: 600 }}>Year</Text>
            <Select value={year} onChange={setYear} options={yearOptions} style={{ width: 110 }} />
          </Space>
        )}
      </div>
      <style>{`.iso-sum-table .ant-table-column-sorters { justify-content: center; gap: 6px; } .iso-sum-table .ant-table-column-sorter { color: #fff !important; font-size: 12px; } .iso-sum-table .ant-table-column-sorter-up.active, .iso-sum-table .ant-table-column-sorter-down.active { color: #fbbf24 !important; } .ant-table-wrapper .ant-table-tbody > tr.iso-total-row > td, .ant-table-wrapper .ant-table-tbody > tr.iso-total-row:hover > td { background: #0f2040 !important; color: #fff !important; font-weight: 700; }`}</style>
      <Card>
        <Spin spinning={loading}>
          <Table
            className="iso-sum-table"
            dataSource={dataRows}
            columns={columns}
            pagination={false}
            size="middle"
            sticky
            rowClassName={(r) => (r.isTotal ? "iso-total-row" : "")}
            scroll={{ x: 1500 }}
          />
        </Spin>
      </Card>
    </>
  );
};

// Both views stacked on one page: calendar year (year-to-date) and trailing 12 months
export const AgentsTrendRibbons = ({ hideTotal = false, endMonth }: { hideTotal?: boolean; endMonth?: string }) => (
  <>
    <div style={{ fontSize: 15, fontWeight: 700, margin: "4px 0 8px" }}>Calendar Year (Year-to-Date)</div>
    <AgentsTrendTable hideTotal={hideTotal} mode="calendar" />
    <div style={{ fontSize: 15, fontWeight: 700, margin: "24px 0 8px" }}>Trailing 12 Months</div>
    <AgentsTrendTable hideTotal={hideTotal} mode="trailing" endMonth={endMonth} />
  </>
);

export default AgentsTrendTable;
