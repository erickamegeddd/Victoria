// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Card, Table, Typography, Select, Space, Tooltip, Spin, Tabs } from "antd";
import dayjs from "dayjs";
import { supabase } from "../utils/supabase";

const { Title, Text } = Typography;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FIRST_YEAR = 2026;
const money = (n) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ISOSummaryPage = () => {
  const currentYear = dayjs().year();
  const [year, setYear] = useState(Math.max(currentYear, FIRST_YEAR));
  const [isos, setIsos] = useState([]);
  const [residuals, setResiduals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [tab, setTab] = useState("residual");

  const yearOptions = [];
  for (let y = FIRST_YEAR; y <= Math.max(currentYear, FIRST_YEAR) + 3; y++) yearOptions.push({ value: y, label: String(y) });

  useEffect(() => {
    supabase.from("isos").select("id,name").order("name").then(({ data }) => { if (data) setIsos(data); });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      let all = [], from = 0;
      while (true) {
        const { data: batch, error } = await supabase
          .from("residuals")
          .select("iso_id,report_month,paydiversenet")
          .gte("report_month", `${year}-01-01`)
          .lte("report_month", `${year}-12-31`)
          .range(from, from + 999);
        if (error || !batch || batch.length === 0) break;
        all = all.concat(batch);
        if (batch.length < 1000) break;
        from += 1000;
      }
      const { data: pay } = await supabase.from("iso_payments").select("iso_id,report_month,expected_amount,received_amount").gte("report_month", `${year}-01-01`).lte("report_month", `${year}-12-31`);
      if (!cancelled) { setResiduals(all); setPayments(pay || []); setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [year]);

  const rows = useMemo(() => {
    const byIso = {};
    residuals.forEach(r => {
      const m = parseInt(String(r.report_month).slice(5, 7), 10) - 1;
      if (!byIso[r.iso_id]) byIso[r.iso_id] = Array(12).fill(null);
      byIso[r.iso_id][m] = (byIso[r.iso_id][m] || 0) + (Number(r.paydiversenet) || 0);
    });
    return isos
      .map(i => {
        const months = (byIso[i.id] || Array(12).fill(null)).map(v => (v == null ? null : Math.round(v * 100) / 100));
        const have = months.filter(v => v != null);
        const total = Math.round(have.reduce((s, v) => s + v, 0) * 100) / 100;
        return { key: i.id, name: i.name, months, total };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [isos, residuals]);

  const monthTotals = MONTHS.map((_, m) => {
    const vals = rows.map(r => r.months[m]).filter(v => v != null);
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) * 100) / 100 : null;
  });
  const grandTotal = Math.round(rows.reduce((s, r) => s + r.total, 0) * 100) / 100;

  const monthCell = (v, prev) => {
    if (v == null) return <span style={{ color: "#c0c4cc" }}>--</span>;
    let color = v < 0 ? "#dc2626" : "inherit";
    let title = null;
    if (prev != null && prev !== 0) {
      const pct = ((v - prev) / Math.abs(prev)) * 100;
      title = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% vs previous month`;
      if (v > prev) color = "#059669"; else if (v < prev) color = "#dc2626";
    }
    const el = <span style={{ color, fontWeight: 500 }}>{money(v)}</span>;
    return title ? <Tooltip title={title}>{el}</Tooltip> : el;
  };

  const totalRow = { key: "__total", name: "TOTAL", months: monthTotals, total: grandTotal, isTotal: true };
  const dataRows = [totalRow, ...rows];

  // TOTAL row always stays last regardless of sort direction
  const sortBy = (get) => (a, b, order) => {
    // Total rows stay pinned at the top (in their own order) whichever way the column is sorted
    if (a.isTotal && b.isTotal) { const x = a.key < b.key ? -1 : 1; return order === "ascend" ? x : -x; }
    if (a.isTotal) return order === "ascend" ? -1 : 1;
    if (b.isTotal) return order === "ascend" ? 1 : -1;
    const x = get(a), y = get(b);
    if (typeof x === "string") return x.localeCompare(y);
    return (x == null ? -Infinity : x) - (y == null ? -Infinity : y);
  };

  const columns = [
    { title: "ISO", dataIndex: "name", key: "name", sorter: sortBy(r => r.name), sortDirections: ["ascend", "descend"], fixed: "left", width: 190, render: (v, r) => <span style={{ fontWeight: r.isTotal ? 700 : 600 }}>{v}</span> },
    ...MONTHS.map((label, m) => ({
      title: label, key: label, align: "right", width: 100, sorter: sortBy(r => r.months[m]), sortDirections: ["descend", "ascend"],
      render: (_, r) => {
        if (r.isTotal) return <span style={{ fontWeight: 700 }}>{r.months[m] == null ? "--" : money(r.months[m])}</span>;
        let prev = null;
        for (let k = m - 1; k >= 0; k--) { if (r.months[k] != null) { prev = r.months[k]; break; } }
        return monthCell(r.months[m], prev);
      }
    })),
    { title: `${year} Total`, key: "total", align: "right", width: 120, sorter: sortBy(r => r.total), sortDirections: ["descend", "ascend"], fixed: "right", render: (_, r) => <span style={{ fontWeight: 700, color: r.isTotal ? "inherit" : r.total < 0 ? "#dc2626" : "inherit" }}>{money(r.total)}</span> },
  ];

  // Payments tab: received per month vs expected (expected = residual total for that month, like the Payments page)
  const payRows = useMemo(() => {
    const payBy = {};
    payments.forEach(p => { const m = parseInt(String(p.report_month).slice(5, 7), 10) - 1; (payBy[p.iso_id] = payBy[p.iso_id] || {})[m] = p; });
    return rows.map(r => {
      const cells = MONTHS.map((_, m) => {
        const p = (payBy[r.key] || {})[m];
        const expected = r.months[m] != null ? r.months[m] : (p && p.expected_amount != null ? Number(p.expected_amount) : null);
        const received = p && p.received_amount != null ? Math.round(Number(p.received_amount) * 100) / 100 : null;
        const pending = received == null && expected != null && expected > 0.005 ? expected : 0;
        return { expected, received, pending };
      });
      const total = Math.round(cells.reduce((s, c) => s + (c.received || 0), 0) * 100) / 100;
      const pendingTotal = Math.round(cells.reduce((s, c) => s + c.pending, 0) * 100) / 100;
      return { key: r.key, name: r.name, cells, total, pendingTotal };
    }).filter(r => r.cells.some(c => c.received != null || c.pending > 0));
  }, [rows, payments]);
  const payMonthTotals = MONTHS.map((_, m) => {
    const vals = payRows.map(r => r.cells[m].received).filter(v => v != null);
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) * 100) / 100 : null;
  });
  const payMonthPending = MONTHS.map((_, m) => Math.round(payRows.reduce((s, r) => s + r.cells[m].pending, 0) * 100) / 100);
  const payGrand = Math.round(payRows.reduce((s, r) => s + r.total, 0) * 100) / 100;
  const payPendingGrand = Math.round(payRows.reduce((s, r) => s + r.pendingTotal, 0) * 100) / 100;
  const payDataRows = [{ key: "__a_total", name: "TOTAL RECEIVED", isTotal: true, cells: payMonthTotals.map(v => ({ received: v })), total: payGrand }, { key: "__b_pending", name: "STILL PENDING", isTotal: true, cells: payMonthPending.map(v => ({ pending: v })), total: payPendingGrand }, ...payRows];
  const payCell = (c) => {
    if (c.received != null) {
      const diff = c.expected != null ? c.received - c.expected : 0;
      const color = diff < -0.01 ? "#dc2626" : diff > 0.01 ? "#2563eb" : "#059669";
      const tip = c.expected != null ? `Expected ${money(c.expected)} - Received ${money(c.received)}` : `Received ${money(c.received)}`;
      return <Tooltip title={tip}><span style={{ color, fontWeight: 500 }}>{money(c.received)}</span></Tooltip>;
    }
    if (c.pending > 0) return <Tooltip title={`Expected ${money(c.expected)} - not received yet`}><span style={{ color: "#d97706", fontWeight: 500 }}>Pending</span></Tooltip>;
    return <span style={{ color: "#c0c4cc" }}>--</span>;
  };
  const payColumns = [
    { title: "ISO", dataIndex: "name", key: "name", sorter: sortBy(r => r.name), sortDirections: ["ascend", "descend"], fixed: "left", width: 190, render: (v, r) => <span style={{ fontWeight: r.isTotal ? 700 : 600 }}>{v}</span> },
    ...MONTHS.map((label, m) => ({
      title: label, key: label, align: "right", width: 100,
      render: (_, r) => {
        if (r.key === "__a_total") return <span style={{ fontWeight: 700 }}>{r.cells[m].received == null ? "--" : money(r.cells[m].received)}</span>;
        if (r.key === "__b_pending") return <span style={{ fontWeight: 700, color: r.cells[m].pending > 0 ? "#d97706" : "#c0c4cc" }}>{r.cells[m].pending > 0 ? money(r.cells[m].pending) : "--"}</span>;
        return payCell(r.cells[m]);
      }
    })),
    { title: `${year} Received`, key: "total", align: "right", width: 130, fixed: "right", sorter: sortBy(r => r.total), sortDirections: ["descend", "ascend"],
      render: (_, r) => r.key === "__b_pending" ? <span style={{ fontWeight: 700, color: "#d97706" }}>{money(r.total)}</span> : <span style={{ fontWeight: 700 }}>{money(r.total)}</span> },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>ISO Residual Summary</Title>
          <Text style={{ color: "var(--muted-color)", fontSize: 13 }}>
            {tab === "residual"
              ? "Monthly residuals (PayDiverse net) per ISO. Green / red = up / down vs the previous month with data. Click any column header to sort."
              : "Payments received per ISO by residual month. Green = paid in full, red = short paid, blue = overpaid, amber = pending. Hover a cell for expected vs received."}
          </Text>
        </div>
        <Space>
          <Text style={{ fontWeight: 600 }}>Year</Text>
          <Select value={year} onChange={setYear} options={yearOptions} style={{ width: 110 }} />
        </Space>
      </div>
      <style>{`.iso-sum-table .ant-table-column-sorters { justify-content: center; gap: 6px; } .iso-sum-table .ant-table-column-sorter { color: #fff !important; font-size: 12px; } .iso-sum-table .ant-table-column-sorter-up.active, .iso-sum-table .ant-table-column-sorter-down.active { color: #fbbf24 !important; } .ant-table-wrapper .ant-table-tbody > tr.iso-total-row > td, .ant-table-wrapper .ant-table-tbody > tr.iso-total-row:hover > td { background: #0f2040 !important; color: #fff !important; font-weight: 700; }`}</style>
      <Tabs activeKey={tab} onChange={setTab} items={[{ key: "residual", label: "Residuals" }, { key: "payments", label: "Payments" }]} />
      <Card>
        {tab === "residual" ? (
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
        ) : (
        <Spin spinning={loading}>
          <Table
            className="iso-sum-table"
            dataSource={payDataRows}
            columns={payColumns}
            pagination={false}
            size="middle"
            sticky
            rowClassName={(r) => (r.isTotal ? "iso-total-row" : "")}
            scroll={{ x: 1500 }}
          />
        </Spin>
        )}
      </Card>
    </>
  );
};

export default ISOSummaryPage;
