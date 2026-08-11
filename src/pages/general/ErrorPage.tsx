import { Result, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { handleLogout } from "../../utils/logout";
export default function ErrorPage() {
  const navigate = useNavigate();
  return (<><Result status="403" title="403" subTitle="Sorry, you are not authorized to access this page." extra={<Button type="primary" onClick={() => handleLogout(navigate)}>Go back to Home</Button>}/></>);
}
