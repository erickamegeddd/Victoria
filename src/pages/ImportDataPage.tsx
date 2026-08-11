// @ts-nocheck
import { useState } from "react";
import { Card, Upload, Select, Button, Table, Typography, Alert, Space } from "antd";
import { InboxOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { supabase } from "../utils/supabase";
import * as XLSX from "xlsx";
const { Dragger } = Upload;
const { Title, Text } = Typography;
const { Option } = Select;
const ISO_MAPPINGS = {
  "maverick":{ mid:"MID",dba:"DBA",volume:"Sales Amount",total_residual:"Total Net Revenue",payout:"Agent Payout" },
  "payarc":{ mid:"MID",dba:"Merchant",volume:"Captured Sales",total_residual:"Gross Profit",payout:"Agent Income" },
  "nmi":{ mid:"MID",dba:"Merchant",volume:"",total_residual:"",payout:"Total Commission" },
  "cardworks":{ mid:"ACCOUNT",dba:"DBA Name",volume:"Total Sales",total_residual:"Net Profit",payout:"Payment to Sales Agent" },
  "worldpay":{ mid:"MERCH_NBR",dba:"MERCHANT_NAME",volume:"TOTAL_SALES_VOLUME",total_residual:"TOTAL_MERCH_REV",payout:"TOTAL_ADJ_RESID" },
  "coastal-pay":{ mid:"Merchant ID",dba:"Merchant",volume:"Sales Amount",total_residual:"Net",payout:"Agent Net" },
  "first-direct":{ mid:"Merchant ID",dba:"Merchant",volume:"Sales Amount",total_residual:"Net",payout:"Agent Net" },
  "group-iso":{ mid:"MID",dba:"DBA",volume:"Volume",total_residual:"Net Revenue",payout:"Agent Net" },
  "payment-cloud":{ mid:"MID",dba:"DBA",volume:"Volume",total_residual:"Net Revenue",payout:"Agent Net" },
};
const EPOCH=new Date(1899,11,30).getTime();
function excelDateToISO(s){const d=new Date(EPOCH+s*86400000);return new Date(d.getFullYear(),d.getMonth(),1).toISOString().split('T')[0];}
function toFloat(v){const n=parseFloat(String(v));return isNaN(n)?null:n;}
const ImportDataPage=()=>{return(<div>Import Data Page</div>);};
export default ImportDataPage;
