import React from "react";
import { Button, Result } from "antd";
import { Link, useNavigate } from "react-router-dom";

const WarningMessage: React.FC = () => {
  const navigate = useNavigate();
  const BackHome = () => { navigate("/home"); window.location.href = "/home"; };
  return (
    <Result status="500" title="There are some problems with your operation." extra={[<Link to="/home" key="backHomeLink" onClick={BackHome}><Button key="backHomeButton">Back Home</Button></Link>]} />
  );
};

export default WarningMessage;
