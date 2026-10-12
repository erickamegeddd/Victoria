// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Card, Table, Typography, Select, Space, Tooltip, Spin } from "antd";
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
      if (!cancelled) { setResiduals(all); setLoading(false); }
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

  const columns = [
    { title: "ISO", dataIndex: "name", key: "name", fixed: "left", width: 190, render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
    ...MONTHS.map((label, m) => ({
      title: label, key: label, align: "right", width: 100,
      render: (_, r) => {
        let prev = null;
        for (let k = m - 1; k >= 0; k--) { if (r.months[k] != null) { prev = r.months[k]; break; } }
        return monthCell(r.months[m], prev);
      }
    })),
    { title: `${year} Total`, key: "total", align: "right", width: 120, fixed: "right", render: (_, r) => <span style={{ fontWeight: 700, color: r.total < 0 ? "#dc2626" : "inherit" }}>{money(r.total)}</span> },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>ISO Summary</Title>
          <Text style={{ color: "var(--muted-color)", fontSize: 13 }}>
            Monthly residuals (PayDiverse net) per ISO. Green / red = up / down vs the previous month with data.
          </Text>
        </div>
        <Space>
          <Text style={{ fontWeight: 600 }}>Year</Text>
          <Select value={year} onChange={setYear} options={yearOptions} style={{ width: 110 }} />
        </Space>
      </div>
      <Card>
        <Spin spinning={loading}>
          <Table
            dataSource={rows}
            columns={columns}
            pagination={false}
            size="middle"
            scroll={{ x: 1500, y: "calc(100vh - 330px)" }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} fixed="left" style={{ background: "#0f2040" }}><span style={{ color: "#fff", fontWeight: 700 }}>TOTAL</span></Table.Summary.Cell>
                  {monthTotals.map((v, i) => (
                    <Table.Summary.Cell key={i} index={i + 1} align="right" style={{ background: "#0f2040" }}>
                      <span style={{ color: v == null ? "#64748b" : v < 0 ? "#fca5a5" : "#fff", fontWeight: 600 }}>{v == null ? "--" : money(v)}</span>
                    </Table.Summary.Cell>
                  ))}
                  <Table.Summary.Cell index={13} align="right" fixed="right" style={{ background: "#0f2040" }}><span style={{ color: "#fff", fontWeight: 700 }}>{money(grandTotal)}</span></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        </Spin>
      </Card>
    </>
  );
};

export default ISOSummaryPage;
