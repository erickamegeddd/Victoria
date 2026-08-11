// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, Row, Col, Tabs, Button, DatePicker, Typography, Space, Statistic, Tag, Alert, Spin, Radio, Select, Tooltip } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined, WarningOutlined, UserDeleteOutlined, UserAddOutlined, BulbOutlined } from "@ant-design/icons";
import { supabase } from "../../utils/supabase";
import dayjs from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
dayjs.extend(quarterOfYear);
const { Title, Text } = Typography;
export default function InsightsPage() { return <div>Insights</div>; }
