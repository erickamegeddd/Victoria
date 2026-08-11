import { useState, useEffect } from "react";
import { Button, Form, Input, Typography, Flex, Row, Col, message, Image } from "antd";
import { useNavigate } from "react-router-dom";
import { useMutation } from "react-query";
import client from "../../utils/axios";
import ResetPasswordModal from "../../components/modals/ResetPasswordModal";
message.config({ duration: 2, maxCount: 1 });
export default function Login() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [isModalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  useEffect(() => { if (localStorage.getItem("token")) navigate("/home"); });
  const loginUser = async (values) => { const { data } = await client.post(`/login`, values); return data; };
  const { mutate: login, isLoading } = useMutation(loginUser, {
    onSuccess: (data) => { localStorage.setItem("token", data.token); localStorage.setItem("user", JSON.stringify(data.user)); form.resetFields(); window.location.reload(); navigate("/home", { replace: true }); message.success(data.message); },
    onError: (error) => { if (error&&error.response&&error.response.data&&error.response.data.message) { message.error(error.response.data.message); } else { message.error("Failed to log in. Please try again"); } },
  });
  const onFinish = async (values) => { if (!values.email || !values.password) return message.error("Please enter credentials"); login(values); };
  return (
    <>
      <Row align="middle" justify="center" style={{ height: "100vh", margin: 0, padding: 0 }}>
        <Col xs={{ span: 24 }} md={{ span: 12, order: 2 }}>
          <Flex gap="middle" vertical style={{ paddingLeft: 40, paddingRight: 40 }}>
            <Typography.Title level={2}>Login</Typography.Title>
            <Form form={form} layout="vertical" style={{ maxWidth: 600 }} onFinish={onFinish} size="large">
              <Form.Item label="Email" name="email" rules={[{ required: true, message: "Please input email!" }, { type: "email", message: "Please enter a valid email!" }]}>
                <Input placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Form.Item>
              <Form.Item label="Password" name="password">
                <Input.Password placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Form.Item>
              <Form.Item style={{ textAlign: "right" }}>
                <Button type="link" onClick={() => setModalVisible(true)}>Forgot Password?</Button>
              </Form.Item>
              <Form.Item>
                <Button loading={isLoading} type="primary" htmlType="submit">Login</Button>
              </Form.Item>
            </Form>
          </Flex>
        </Col>
        <Col xs={{ span: 24 }} md={{ span: 12, order: 1 }} style={{ backgroundColor: "var(--primary-color)", display: "flex", alignItems: "center", justifyContent: "center", height: "100%", margin: 0 }}>
          <Flex vertical gap="middle" align="center">
            <Image src="paydiverse-logo.svg" alt="PayDiverse Logo" preview={false} />
          </Flex>
        </Col>
      </Row>
      {isModalVisible && (<ResetPasswordModal isResetPassword={false} onOk={() => setModalVisible(false)} onCancel={() => setModalVisible(false)} />)}
    </>
  );
}
