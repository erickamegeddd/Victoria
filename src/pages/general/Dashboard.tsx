// @ts-nocheck
import { useEffect, useState, useRef } from "react";
import { Card, Row, Col, Table, Select, DatePicker, Button, Typography, Space, Statistic, Tabs, Tag, Input, Alert, Modal } from "antd";
import { DollarOutlined, FileExcelOutlined, BankOutlined, SearchOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { supabase } from "../../utils/supabase";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
const { Title, Text } = Typography;
const { Option } = Select;
const fmt = (n) => n NULL !!= null ? `$${Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}` : '—';
const Dashboard = () => null;
export default Dashboard;
