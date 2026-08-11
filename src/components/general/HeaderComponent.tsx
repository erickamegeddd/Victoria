// @ts-nocheck
import React, { useState } from "react";
import { Avatar, Dropdown, Tooltip } from "antd";
import { MenuUnfoldOutlined, MenuFoldOutlined, UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getUserFromLocalStorage } from "../../utils/getUser";
import { handleLogout } from "../../utils/logout";
import ResetPasswordModal from "../modals/ResetPasswordModal";
import ResetPassWordIcon from "../ui/ResetPasswordIcon";

const HeaderComponent = ({ collapsed, handleToggle }) => {
  const user = getUserFromLocalStorage();
  const navigate = useNavigate();
  const [isModalVisible, setModalVisible] = useState(false);
  const items = [
    { key:"1", label:(<span style={{display:"flex",alignItems:"center"}} onClick={()=>setModalVisible(true)}><ResetPassWordIcon/>Reset Password</span>) },
    { key:"2", label:(<span onClick={(e)=>{e.stopPropagation();handleLogout(navigate);}} style={{color:"var(--red-color)",width:"100%"}}><LogoutOutlined style={{marginRight:"10px"}}/>Logout</span>) },
  ];
  return (
    <>
      <header style={{color:"#333",height:90,backgroundColor:"var(--panel-color)",borderBottom:"1px solid var(--line-color)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px"}}>
        <div style={{display:"flex",alignItems:"center"}}>
          <Tooltip title="Click to toggle the Sidebar" color="black">
            {collapsed
              ? <MenuUnfoldOutlined style={{fontSize:22,color:"var(--muted-color)"}} onClick={handleToggle}/>
              : <MenuFoldOutlined style={{fontSize:22,color:"var(--muted-color)"}} onClick={handleToggle}/>
            }
          </Tooltip>
          <img src="/paydiverse-logo.svg" alt="PayDiverse" style={{height:90,marginLeft:10,objectFit:"contain",maxWidth:340}}/>
        </div>
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:"20px"}}>
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",flexDirection:"column"}}>
            <span style={{fontSize:"16px",fontWeight:"600"}}>{user?.name||"N/A"}</span>
            <span>{user?.role=="super_admin"?"Admin":"Agent"}</span>
          </div>
          <Dropdown placement="bottomLeft" trigger={["hover","click"]} menu={{items}}>
            <Avatar size="large" style={{backgroundColor:"var(--primary-color)"}} icon={<UserOutlined/>}/>
          </Dropdown>
        </div>
      </header>
      {isModalVisible&&<ResetPasswordModal isResetPassword={true} onOk={()=>setModalVisible(false)} onCancel={()=>setModalVisible(false)}/>}
    </>
  );
};
export default HeaderComponent;
