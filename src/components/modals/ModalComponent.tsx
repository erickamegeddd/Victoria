import { useEffect } from "react";
import {
  Button,
  Col,
  message,
  Modal,
  Row,
  Switch,
  Table,
  TablePaginationConfig,
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
import { DownloadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import { useState } from "react";
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
  const fetchIsoData = async (date: string | string[], iso: string) => {
    const { data } = await client.get<IsoData[]>("/each-iso-data", {
      params: { date, iso },
    });
    setCurrentTableData(data);
    return data;
  };

  const {
    data: isoData,
    error: isoError,
    isLoading: isoLoading,
  } = useQuery(["fetchIsoData", date, title], () => fetchIsoData(date, title), {
    enabled: !!date && apiNumber === 1,
  });

  const fetchCorpData = async (date: string | string[], corporation: string) => {
    const { data } = await client.get<CorporationData[]>("/each-corp-data", {
      params: { date, corporation },
    });
    setCurrentTableData(data);
    return data;
  };

  const { data: corpData, error: corpError, isLoading: corpLoading } = useQuery(
    ["fetchCorpData", date, title],
    () => fetchCorpData(date, title),
    { enabled: !!date && apiNumber === 2 }
  );

  // Agent data fetched from our Vercel API (not Heroku) so totals match the overview.
  const fetchAgentData = async (date: string | string[], agent_name: string) => {
    const { data } = await agentClient.get<AgentsData[]>("/api/each-agent-data", {
      params: { date, agent_name },
    });
    setCurrentTableData(data);
    return data;
  };

  const { data: agentData, error: agentError, isLoading: agentLoading } = useQuery(
    ["fetchAgentData", date, title],
    () => fetchAgentData(date, title),
    { enabled: !!date && apiNumber === 3 }
  );

  const fetchOperatingPartnerData = async (date: string | string[], operating_partner: string) => {
    const { data } = await client.get<OperatingPartnerData[]>("/each-partner-data", { params: { date, operating_partner } });
    setCurrentTableData(data);
    return data;
  };

  const { data: operatingPartnerData, error: operatingPartnerError, isLoading: operatingPartnerLoading } = useQuery(
    ["fetchOperatingPartnerData", date, title],
    () => fetchOperatingPartnerData(date, title),
    { enabled: !!date && apiNumber === 4 }
  );

  useEffect(() => {
    if (isoData && apiNumber === 1) setCurrentTableData(isoData);
    else if (corpData && apiNumber === 2) setCurrentTableData(corpData);
    else if (agentData && apiNumber === 3) setCurrentTableData(agentData);
    else if (operatingPartnerData && apiNumber === 4) setCurrentTableData(operatingPartnerData);
  }, [apiNumber]);

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
          else if (apiNumber === 3) return { ISO: item?.iso || "Not Provided", Corporation: item?.corporation || "Not Provided", DBA: item?.dba || "Not Provided", MID: item?.mid || "Not Provided", "Total Residual": item?.total_residual ? Number(item?.total_residual) : 0.0, "PayDiverse Residual": item?.paydiverse_residual ? Number(item?.paydiverse_residual) : 0.0, "Agent Percentage": item?.agent_percentage ? `${item.agent_percentage}%` : "0.00%", "Agent Payout": item?.agent_payout ? item.agent_payout : 0.0 };
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
        <Row justify="space-between">
          <Col span={8}>
            {(apiNumber == 1 || apiNumber == 3) && (<><Switch checked={excludeZeroResiduals} onChange={(checked) => setExcludeZeroResiduals(checked)} checkedChildren="Yes" unCheckedChildren="No"/><span style={{marginLeft:"8px",fontSize:"16px",montWeight:"bold"}}>Exclude zero residuals</span></>)}
          </Col>
          <Col span={8} style={{display:"flex",justifyContent:"flex-end"}}>
            <Button className="download-btn" type="primary" onClick={handleDownload} disabled={isDownloadDisabled()}>Download as XLSX <DownloadOutlined/></Button>
          </Col>
        </Row>
        {apiNumber === 3 && <span style={{backgroundColor:"rgb(231,230,230)",fontWeight:600,fontSize:22,padding:5,borderRadius:6}}>Agent Total Payout: {formatCurrency(paydiverseResidual as number)}</span>}
        {apiNumber === 1 && <h2 style={{marginBottom:7}}>PayDiverse Residual:{" "}{formatCurrency((paydiverseResidual ?? 0) - (adjustmentPrice ?? 0))}</h2>}
        {apiNumber === 1 && adjustmentPrice != 0.0 && <h3>Adjustments: {formatCurrency(adjustmentPrice as number)}</h3>}
        <Table rowHoverable={false}
          dataSource={(apiNumber === 1 ? excludeZeroResiduals ? isoData?.filter((item) => item.paydiverse_residual !== 0) : isoData : apiNumber === 2 ? corpData : apiNumber === 3 ? excludeZeroResiduals ? agentData?.filter((item) => item.paydiverse_residual !== 0 && item?.total_residual !== 0) : agentData : apiNumber === 4 ? operatingPartnerData : []) as any}
          className="modal-table"
          columns={apiNumber === 1 ? isoColumns : apiNumber === 2 ? corporationColumns : apiNumber === 3 ? agentColumns : apiNumber === 4 ? operatingPartnerColumns : null}
          scroll={{x: apiNumber == 1 || apiNumber === 3 ? 768 : 0}}
          onChange={(_pagination: TablePaginationConfig, _filters: Record<string, FilterValue | null>, _sorter: SorterResult<any> | SorterResult<any>[], extra: { currentDataSource?: any[] }) => { setCurrentTableData(extra.currentDataSource || []); }}
          loading={isoLoading || corpLoading || agentLoading || operatingPartnerLoading}
          pagination={{pageSize: 200}}
          summary={(pageData) => {
            let agentPayout = 0;
            pageData.forEach(({ agent_payout }) => { agentPayout += agent_payout; });
            return (agentData && agentData?.length > 0 && (
              <Table.Summary.Row className="total-row">
                <Table.Summary.Cell index={1} colSpan={2}><strong>Total Agent Payout</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={2}/><Table.Summary.Cell index={3}/><Table.Summary.Cell index={4}/><Table.Summary.Cell index={5}/><Table.Summary.Cell index={6}/><Table.Summary.Cell index={7}/>
                <Table.Summary.Cell index={8}><strong>{formatCurrency(agentPayout)}</strong></Table.Summary.Cell>
              </Table.Summary.Row>
            ));
          }}
        />
      </Modal>
    </>
  );
};

export default ModalComponent;
