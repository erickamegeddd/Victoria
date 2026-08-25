// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, Row, Col, Tabs, Button, DatePicker, Typography, Space, Statistic, Tag, Alert, Spin, Radio, Tooltip } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined, WarningOutlined, UserDeleteOutlined, UserAddOutlined, BulbOutlined } from "@ant-design/icons";
import { supabase } from "../../utils/supabase";
import dayjs from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
dayjs.extend(quarterOfYear);
const { Title, Text } = Typography;

const fmt=(n)=>n!=null?`$${Number(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"--";
const fmtK=(n)=>{if(n==null)return"--";const abs=Math.abs(n);if(abs>=1000000)return`$${(n/1000000).toFixed(1)}M`;if(abs>=1000)return`$${(n/1000).toFixed(1)}K`;return fmt(n);};
const fmtPct=(n)=>n!=null?`${n>=0?"+":""}${n.toFixed(1)}%`:"--";


// ── SVG Trend Chart ───────────────────────────────────────────────────────────
const TrendChart = ({ data, height = 140, color = "#1d4ed8", labelKey = "label", valueKey = "net" }) => {
  const [hovered, setHovered] = useState(null);
  if (!data || data.length < 2) return null;
  const W = 900, H = height, PL = 48, PR = 16, PT = 12, PB = 28;
  const w = W - PL - PR, h = H - PT - PB;
  const vals = data.map(d => d[valueKey] || 0);
  const minV = Math.min(0, ...vals), maxV = Math.max(...vals, 1), range = maxV - minV || 1;
  const toX = (i) => PL + (i / (data.length - 1)) * w;
  const toY = (v) => PT = h - ((valueKey === v ? v : v) - minV) / range * h;
  const pathD = data.map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(d[valueKey] || 0).toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${toX(data.length-1).toFixed(1)} ${toY(minV).toFixed(1)} L ${toX(0).toFixed(1)} ${toY(minV).toFixed(1)} Z`;