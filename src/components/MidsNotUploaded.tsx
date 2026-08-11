import {
  Col,
  Row,
  Input,
  DatePicker,
  message,
  Table,
  Select,
  Button,
} from "antd";
import LoadingSpinner from "./ui/LoadingSpinner";
import { useEffect, useRef, useState } from "react";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useQuery } from "react-query";
import client from "../utils/axios";
import { Link } from "react-router-dom";
import { MdArrowOutward } from "react-icons/md";

const { RangePicker } = DatePicker;

const MidsNotUploaded = () => {
  return <div>Mids Not Uploaded Component</div>;
};

export default MidsNotUploaded;
