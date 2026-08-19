import { useEffect, useState } from "react";
import {
  Button,
  Col,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Switch,
  Table,
  TablePaginationConfig,
  Tabs,
  Tag,
} from "antd";
import client from "../../utils/axios";
import agentClient from "../../utils/agentAxios";
import { useQuery } from "react-query";
import {
  agentColumns,
  corporationColumns,
  isoColumns,
  operatingPartnerColumns,
} from "./ModalComponentColumns";
import { DownloadOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import { FilterValue, SorterResult } from "antd/es/table/interface";
import formatCurrency from "../../utils/formatCurrency";

interface ModalComponentProps {
  isOpen: boolean;
  title: string;
  apiNumber: number;
  date: string | string[];
  onCancel?: () => void;
  paydiverseResidual?: number;
  adjustmentPrice?: number;
}

const ADJUSTABLE_FIELDS = [
  { value: "paydiverse_residual", label: "PayDiverse Residual" },
  { value: "total_residual", label: "Total Residual" },
  { value: "agent_payout", label: "Agent Payout" },
];

const ADJ_HISTORY_COLUMNS: any[] = [
  { key: "mid", title: "MID", dataIndex: "mid", width: "150px", render: (v: string) => v || <Tag color="default">All</Tag> },
  { key: "field_name", title: "Field", dataIndex: "field_name", width: "180px",
    render: (v: string) => v === "new_row" ? <Tag color="green">New Row Added</Tag> : (ADJUSTABLE_FIELDS.find((f) => f.value === v)?.label ?? v) },
  { key: "original_value", title: "Original", dataIndex: "original_value", width: "130px", render: (v: any) => v != null ? formatCurrency(v) : "—" },
  { key: "adjusted_value", title: "Adjusted", dataIndex: "adjusted_value", width: "130px", render: formatCurrency },
  { key: "notes", title: "Notes", dataIndex: "notes", ellipsis: true },
  { key: "created_at", title: "Date Changed", dataIndex: "created_at", width: "180px",
    render: (v: string) => dayjs(v).format("MMM DD, YYYY HH:mm") },
];

const ModalComponent: React.FC<ModalComponentProps> = ({
  isOpen,
  title,
  onCancel,
  date,
  apiNumber,
  paydiverseResidual,
  adjustmentPrice,
}) => {
  const [currentTableData, setCurrentTableData] = useState<any[]>([]);
  const [excludeZeroResiduals, setExcludeZeroResiduals] = useState(false);

  // Agent-tab state (apiNumber === 3 only)
  const [agentActiveTab, setAgentActiveTab] = useState("data");
  const [editRow, setEditRow] = useState<any>(null);
  const [editField, setEditField] = useState("paydiverse_residual");
  const [editNewValue, setEditNewValue] = useState<number>(0);
  const [editNoteText, setEditNoteText] = useState("");
  const [savingAdj, setSavingAdj] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, Record<string, number>>>({});
  const [adjHistory, setAdjHistory] = useState<any[]>([]);
  const [adjLoading, setAdjLoading] = useState(false);
  const [addRowOpen, setAddRowOpen] = useState(false);
  const [addingRow, setAddingRow] = useState(false);
  const [customRows, setCustomRows] = useState<any[]>([]);
  const [newRowData, setNewRowData] = useState({
    iso: "", operating_partner: "", dba: "", corporation: "", mid: "",
    paydiverse_residual: 0, total_residual: 0, agent_percentage: "0", agent_payout: 0,
  });

  const fetchIsoData = async (date: string | string[], iso: string) => {
    const { data } = await client.get<IsoData[]>("/each-iso-data", { params: { date, iso } });
    setCurrentTableData(data);
    return data;
  };
  const { data: isoData, error: isoError, isLoading: isoLoading } = useQuery(["fetchIsoData", date, title], () => fetchIsoData(date, title), { enabled: !!date && apiNumber === 1 });
  const fetchCorpData = async (date: string | string[], corporation: string) => {
    const { data } = await client.get<CorporationData[]>("/each-corp-data", { params: { date, corporation } });
    setCurrentTableData(data);
    return data;
  };
  const { data: corpData, error: corpError, isLoading: corpLoading } = useQuery(["fetchCorpData", date, title], () => fetchCorpData(date, title), { enabled: !!date && apiNumber === 2 });
  const fetchAgentData = async (date: string | string[], agent_name: string) => {
    const { data } = await agentClient.get<AgentsData[]>("/api/each-agent-data", { params: { date, agent_name } });
    setCurrentTableData(data);
    return data;
  };
  const { data: agentData, error: agentError, isLoading: agentLoading } = useQuery(["fetchAgentData", date, title], () => fetchAgentData(date, title), { enabled: !!date && apiNumber === 3 });
  const fetchOperatingPartnerData = async (date: string | string[], operating_partner: string) => {
    const { data } = await client.get<OperatingPartnerData[]>("/each-partner-data", { params: { date, operating_partner } });
    setCurrentTableData(data);
    return data;
  };
  const { data: operatingPartnerData, error: operatingPartnerError, isLoading: operatingPartnerLoading } = useQuery(["fetchOperatingPartnerData", date, title], () => fetchOperatingPartnerData(date, title), { enabled: !!date && apiNumber === 4 });

  useEffect(() => {
    if (isoData && apiNumber === 1) setCurrentTableData(isoData);
    else if (corpData && apiNumber === 2) setCurrentTableData(corpData);
    else if (agentData && apiNumber === 3) setCurrentTableData(agentData);
    else if (operatingPartnerData && apiNumber === 4) setCurrentTableData(operatingPartnerData);
  }, [apiNumber]);

  // Apply local overrides + custom rows
  const agentDisplayData = agentData?.map((row: any) => {
    const rowOverrides = overrides[row.mid];
    return rowOverrides ? { ...row, ...rowOverrides } : row;
  });
  const combinedAgentData = [...(agentDisplayData || []), ...customRows];

  // Load custom rows added manually
  const loadCustomRows = async () => {
    try {
      const { data } = await agentClient.get("/api/agent-adjustments", { params: { agent_name: title, date: date as string } });
      const rows = (data || []).filter((r: any) => r.field_name === "new_row").map((r: any) => { try { return { ...JSON.parse(r.notes || "{}"), __custom: true, __adj_id: r.id }; } catch { return null; } }).filter(Boolean);
      setCustomRows(rows);
    } catch { setCustomRows([]); }
  };

  // Load adjustment history
  const loadAdjHistory = async () => {
    setAdjLoading(true);
    try {
      const { data } = await agentClient.get("/api/agent-adjustments", { params: { agent_name: title, date: date as string } });
      setAdjHistory(Array.isArray(data) ? data : []);
    } catch { setAdjHistory([]); } finally { setAdjLoading(false); }
  };

  // Save new custom row
  const handleSaveNewRow = async () => {
    setAddingRow(true);
    try {
      await agentClient.post("/api/agent-adjustments", {
        agent_name: title, report_month: date, mid: newRowData.mid || null,
        field_name: "new_row", original_value: null,
        adjusted_value: newRowData.paydiverse_residual,
        notes: JSON.stringify(newRowData),
      });
      setCustomRows((prev) => [...prev, { ...newRowData, __custom: true }]);
      message.success("Row added");
      setAddRowOpen(false);
      setNewRowData({ iso: "", operating_partner: "", dba: "", corporation: "", mid: "", paydiverse_residual: 0, total_residual: 0, agent_percentage: "0", agent_payout: 0 });
    } catch { message.error("Failed to add row"); }
    finally { setAddingRow(false); }
  };

  // Save an adjustment
  const handleSaveAdjustment = async () => {
    if (!editRow) return;
    setSavingAdj(true);
    try {
      await agentClient.post("/api/agent-adjustments", {
        agent_name: title, report_month: date, mid: editRow.mid,
        field_name: editField, original_value: editRow[editField] ?? 0,
        adjusted_value: editNewValue, notes: editNoteText || null,
      });
      setOverrides((prev) => ({ ...prev, [editRow.mid]: { ...(prev[editRow.mid] || {}), [editField]: editNewValue } }));
      message.success("Adjustment saved");
      setEditRow(null);
      if (agentActiveTab === "adjustments") loadAdjHistory();
    } catch { message.error("Failed to save adjustment"); }
    finally { setSavingAdj(true); }
  };

  const editActionColumn = {
    key: "edit_action", title: "", width: "50px",
    render: (_: any, record: any) => (
      record.__custom ? null : (
        <Button size="small" type="text" icon={<EditOutlined style={{ color: "#1890ff" }} />}
          onClick={() => { setEditRow(record); setEditField("paydiverse_residual"); setEditNewValue(record.paydiverse_residual ?? 0); setEditNoteText(""); }}
        />
      )
    ),
  };
  const agentTableColumns = [...agentColumns, editActionColumn];

  const handleDownload = () => {
    try {
      if (!currentTableData || currentTableData.length === 0) { message.warning("No data available to download"); return; }
      const datePart = dayjs(date as string).format("MM-YYYY");
      const maxTitleLength = 31 - (datePart.length + 3);
      const trimmedTitle = title.length > maxTitleLength ? title.slice(0, maxTitleLength) : title;
      const fileName = `${trimmedTitle} - ${datePart}.xlsx`;
      const sheetName = `${trimmedTitle} | ${datePart}`;
      const dataToDownload = currentTableData.filter((item: any) => excludeZeroResiduals ? item.paydiverse_residual !== 0 && item?.total_residual !== 0 : true)
        .map((item: any) => {
          if (apiNumber === 1) return { "Operating Partner": item?.operating_partner || "Not Provided", MID: item?.mid || "Not Provided", Corporation: item?.corporation || "Not Provided", DBA: item?.dba || "Not Provided", "Total Residual": item?.total_residual ? Number(item?.total_residual) : 0.0, "PayDiverse Residual": item?.paydiverse_residual ? Number(item?.paydiverse_residual) : 0.0, "Agent 1 Name": item?.agent1_name || "No Agent", "Agent 1 Payout": item?.agent1_payout ? Number(item.agent1_payout) : 0.0, "Agent 1 Percentage": item?.agent1_percentage ? `${item.agent1_percentage} %` : "0.00 %", "Agent 2 Name": item?.agent2_name || "No Agent", "Agent 2 Payout": item?.agent2_payout ? Number(item.agent2_payout) : 0.0, "Agent 2 Percentage": item?.agent2_percentage ? `${item.agent2_percentage} %` : "0.00 %" };
          else if (apiNumber === 2) return { MID: item?.mid || "Not Provided", ISO: item?.iso || "Not Provided", DBA: item?.dba || "Not Provided", Volume: item?.volume ? Number(item?.volume) : 0.0, "Total Residual": item?.total_residual ? Number(item?.total_residual) : 0.0, "PayDiverse Residual": item?.paydiverse_residual ? Number(item?.paydiverse_residual) : 0.0 };
          else if (apiNumber === 3) return { ISO: item?.iso||"Not Provided", Corporation: item?.corporation||"Not Provided", DBA: item?.dba||"Not Provided", MID: item?.mid||"Not Provided", "Total Residual": item?.total_residual?Number(item?.total_residual):0.0, "PayDiverse Residual": item?.paydiverse_residual?Number(item?.paydiverse_residual):0.0, "Agent Percentage": item?.agent_percentage?`${item.agent_percentage}%`:"0.00%", "Agent Payout": item?.agent_payout?item.agent_payout:0.0 };
          else if (apiNumber === 4) return { MID: item?.mid || "Not Provided", ISO: item?.iso || "Not Provided", DBA: item?.dba || "Not Provided", Corporation: item?.corporation || "Not Provided", Volume: item?.volume || "Not Provided", "Total Residual": item?.total_residual ? Number(item?.total_residual) : 0.0, "PayDiverse Residual": item?.paydiverse_residual ? Number(item?.paydiverse_residual) : 0.0 };
          return item;
        });
      if (apiNumber === 3) { const totalAgentPayout = currentTableData.reduce((sum, item) => sum + (item?.agent_payout || 0), 0); dataToDownload.push({ ISO: "", Corporation: "", DBA: "", MID: "", "Total Residual": "", "PayDiverse Residual": "", "Agent Percentage": "", "Agent Payout": `Total: ${formatCurrency(totalAgentPayout)}` }); }
      const worksheet = XLSX.utils.json_to_sheet(dataToDownload);
      worksheet["!cols"] = Array(11).fill({ wch: 30 });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, fileName);
      message.success("File downloaded successfully");
    } catch (error) { message.error("Failed to download file"); }
  };

  const isDownloadDisabled = () => {
    if (apiNumber === 1) return !isoData || isoData.length === 0;
    if (apiNumber === 2) return !corpData || corpData.length === 0;
    if (apiNumber === 3) return !agentData || agentData.length === 0;
    if (apiNumber === 4) return !operatingPartnerData || operatingPartnerData.length === 0;
    return true;
  };

  if (isoError || corpError || agentError || operatingPartnerError) message.error("Error fetching data");

  return (
    <>
      <Modal open={isOpen} width={"90%"} className="modal" title={title + " | " + dayjs(date as string).format("MMMM-YYYY")} onCancel={onCancel} footer={[<Button onClick={onCancel} type="primary">Cancel</Button>]}>

        {apiNumber === 3 ? (
          <>
            <span style={{backgroundColor:"rgb(231,230,230)",fontWeight:600,fontSize:22,padding:5,borderRadius:6,display:"inline-block",marginBottom:12}}>
              Agent Total Payout: {formatCurrency(paydiverseResidual as number)}
            </span>
            <Tabs activeKey={agentActiveTab} onChange={(key) => { setAgentActiveTab(key); if (key === "adjustments") loadAdjHistory(); }} style={{ marginTop: 8 }}
              items={[
                {
                  key: "data", label: "Agent Data",
                  children: (
                    <>
                      <Row justify="space-between" style={{marginBottom:8}}>
                        <Col span={8}>
                          <Switch checked={excludeZeroResiduals} onChange={(checked) => setExcludeZeroResiduals(checked)} checkedChildren="Yes" unCheckedChildren="No"/><span style={{marginLeft:"8px"}}>Exclude zero residuals</span>
                        </Col>
                        <Col span={8} style={{display:"flex",justifyContent:"flex-end",gap:8}}>
                          <Button icon={<PlusOutlined/>} onClick={() => { setAddRowOpen(true); loadCustomRows(); }}>Add Row</Button>
                          <Button className="download-btn" type="primary" onClick={handleDownload} disabled={isDownloadDisabled()}>Download as XLSX <DownloadOutlined/></Button>
                        </Col>
                      </Row>
                      <Table rowHoverable={false}
                        dataSource={((excludeZeroResiduals ? combinedAgentData?.filter((item: any) => item.paydiverse_residual !== 0 && item?.total_residual !== 0) : combinedAgentData) as any)}
                        className="modal-table" columns={agentTableColumns} scroll={{x: 768}}
                        onChange={(_pagination: TablePaginationConfig, _filters: Record<string, FilterValue | null>, _sorter: SorterResult<any> | SorterResult<any>[], extra: { currentDataSource?: any[] }) => { setCurrentTableData(extra.currentDataSource || []); }}
                        loading={agentLoading} pagination={{pageSize: 200}}
                        summary={(pageData) => {
                          let agentPayout = 0;
                          pageData.forEach(({ agent_payout }) => { agentPayout += agent_payout || 0; });
                          return ((agentData?.length || 0) > 0 && (
                            <Table.Summary.Row className="total-row">
                              <Table.Summary.Cell index={1} colSpan={2}><strong>Total Agent Payout</strong></Table.Summary.Cell>
                              <Table.Summary.Cell index={2}/><Table.Summary.Cell index={3}/><Table.Summary.Cell index={4}/><Table.Summary.Cell index={5}/><Table.Summary.Cell index={6}/><Table.Summary.Cell index={7}/>
                              <Table.Summary.Cell index={8}><strong>{formatCurrency(agentPayout)}</strong></Table.Summary.Cell>
                              <Table.Summary.Cell index={9}/>
                            </Table.Summary.Row>
                          ));
                        }}
                      />
                    </>
                  ),
                },
                { key: "adjustments", label: "Adjustments History",
                  children: (
                    <Table loading={adjLoading} dataSource={adjHistory} rowKey="id"
                      columns={ADJ_HISTORY_COLUMNS} pagination={{ pageSize: 50 }}
                      locale={{ emptyText: "No adjustments recorded for this agent/month." }} scroll={{ x: 900 }}
                    />
                  ),
                },
              ]}
            />
          </>
        ) : (
          <>
            <Row justify="space-between">
              <Col span={8}>
                {(apiNumber == 1) && (<><Switch checked={excludeZeroResiduals} onChange={(checked) => setExcludeZeroResiduals(checked)} checkedChildren="Yes" unCheckedChildren="No"/><span style={{marginLeft:"8px"}}>Exclude zero residuals</span></>)}
              </Col>
              <Col span={8} style={{display:"flex",justifyContent:"flex-end"}}>
                <Button className="download-btn" type="primary" onClick={handleDownload} disabled={isDownloadDisabled()}>Download as XLSX <DownloadOutlined/></Button>
              </Col>
            </Row>
            {apiNumber === 1 && <h2 style={{marginBottom:7}}>PayDiverse Residual:{" "}{formatCurrency((paydiverseResidual ?? 0) - (adjustmentPrice ?? 0))}</h2>}
            {apiNumber === 1 && adjustmentPrice != 0.0 && <h3>Adjustments: {formatCurrency(adjustmentPrice as number)}</h3>}
            <Table rowHoverable={false}
              dataSource={(apiNumber === 1 ? excludeZeroResiduals ? isoData?.filter((item) => item.paydiverse_residual !== 0) : isoData : apiNumber === 2 ? corpData : apiNumber === 4 ? operatingPartnerData : []) as any}
              className="modal-table"
              columns={apiNumber === 1 ? isoColumns : apiNumber === 2 ? corporationColumns : apiNumber === 4 ? operatingPartnerColumns : null}
              scroll={{x: apiNumber == 1 ? 768 : 0}}
              onChange={(_pagination: TablePaginationConfig, _filters: Record<string, FilterValue | null>, _sorter: SorterResult<any> | SorterResult<any>[], extra: { currentDataSource?: any[] }) => { setCurrentTableData(extra.currentDataSource || []); }}
              loading={isoLoading || corpLoading || operatingPartnerLoading}
              pagination={{pageSize: 200}}
            />
          </>
        )}
      </Modal>

      {apiNumber === 3 && (
        <Modal open={!!editRow} title={`Adjust — ${editRow?.dba || editRow?.mid || ""}`}
          onCancel={() => setEditRow(null)} onOk={handleSaveAdjustment} confirmLoading={savingAdj} okText="Save Adjustment" width={420}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div><div style={{ marginBottom: 6, fontWeight: 500 }}>Field to adjust</div>
              <Select value={editField} onChange={(v) => { setEditField(v); setEditNewValue((editRow?.[v] as number) ?? 0); }} options={ADJUSTABLE_FIELDS} style={{ width: "100%" }} size="large"/></div>
            <div><div style={{ marginBottom: 4, color: "#888" }}>Current value: {formatCurrency((editRow?.[editField] as number) ?? 0)}</div>
              <div style={{ marginBottom: 6, fontWeight: 500 }}>New value</div>
              <InputNumber value={editNewValue} onChange={(v) => setEditNewValue(v ?? 0)} style={{ width: "100%" }} precision={2} prefix="$" size="large"/></div>
            <div><div style={{ marginBottom: 6, fontWeight: 500 }}>Notes <span style={{ color: "#aaa", fontWeight: 400 }}>(optional)</span></div>
              <Input.TextArea value={editNoteText} onChange={(e) => setEditNoteText(e.target.value)} rows={2} placeholder="Reason for adjustment..."/></div>
          </div>
        </Modal>
      )}

      {apiNumber === 3 && (
        <Modal open={addRowOpen} title="Add Custom Row"
          onCancel={() => { setAddRowOpen(false); setNewRowData({ iso: "", operating_partner: "", dba: "", corporation: "", mid: "", paydiverse_residual: 0, total_residual: 0, agent_percentage: "0", agent_payout: 0 }); }}
          onOk={handleSaveNewRow} confirmLoading={addingRow} okText="Add Row" width={520}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Row gutter={12}>
              <Col span={12}><div style={{marginBottom:4,fontWeight:500}}>ISO</div><Input value={newRowData.iso} onChange={e => setNewRowData(p => ({...p, iso: e.target.value}))} placeholder="e.g. Maverick" size="large"/></Col>
              <Col span={12}><div style={{marginBottom:4,fontWeight:500}}>DBA</div><Input value={newRowData.dba} onChange={e => setNewRowData(p => ({...p, dba: e.target.value}))} placeholder="Business name" size="large"/></Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}><div style={{marginBottom:4,fontWeight:500}}>Corporation</div><Input value={newRowData.corporation} onChange={e => setNewRowData(p => ({...p, corporation: e.target.value}))} size="large"/></Col>
              <Col span={12}><div style={{marginBottom:4,fontWeight:500}}>MID</div><Input value={newRowData.mid} onChange={e => setNewRowData(p => ({...p, mid: e.target.value}))} placeholder="MID number" size="large"/></Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}><div style={{marginBottom:4,fontWeight:500}}>PayDiverse Residual</div>
                <InputNumber value={newRowData.paydiverse_residual} onChange={v => { const pdr = v ?? 0; const pct = parseFloat(newRowData.agent_percentage) || 0; setNewRowData(p => ({...p, paydiverse_residual: pdr, agent_payout: Math.round(pdr * pct / 100 * 100) / 100})); }} style={{ width: "100%" }} precision={2} prefix="$" size="large"/></Col>
              <Col span={12}><div style={{marginBottom:4,fontWeight:500}}>Total Residual</div>
                <InputNumber value={newRowData.total_residual} onChange={v => setNewRowData(p => ({...p, total_residual: v ?? 0}))} style={{ width: "100%" }} precision={2} prefix="$" size="large"/></Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}><div style={{marginBottom:4,fontWeight:500}}>Agent %</div>
                <InputNumber value={parseFloat(newRowData.agent_percentage) || 0} onChange={v => { const pct = v ?? 0; const pdr = newRowData.paydiverse_residual; setNewRowData(p => ({...p, agent_percentage: String(pct), agent_payout: Math.round(pdr * pct / 100 * 100) / 100})); }} style={{ width: "100%" }} suffix="%" min={0} max={100} precision={2} size="large"/></Col>
              <Col span={12}><div style={{marginBottom:4,fontWeight:500}}>Agent Payout</div>
                <InputNumber value={newRowData.agent_payout} onChange={v => setNewRowData(p => ({...p, agent_payout: v ?? 0}))} style={{ width: "100%" }} precision={2} prefix="$" size="large"/></Col>
            </Row>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ModalComponent;
