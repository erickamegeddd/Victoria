// @ts-nocheck
import { useState, useEffect } from "react";
import { Button, Form, Input, Typography, Flex, Row, Col, message } from "antd";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabase";
message.config({ duration: 2, maxCount: 1 });
export default function Login() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (localStorage.getItem("token")) navigate("/home"); }, []);
  const onFinish = async (values) => {
    if (!values.email || !values.password) return message.error("Please enter credentials");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
    setLoading(false);
    if (error) return message.error(error.message);
    const role = data.user.user_metadata?.role || "admin";
    const name = data.user.user_metadata?.name || data.user.email;
    localStorage.setItem("token", data.session.access_token);
    localStorage.setItem("user", JSON.stringify({ name, role, email: data.user.email }));
    form.resetFields();
    message.success("Welcome back, " + name + "!");
    if (role === "agent") { navigate("/home/agents", { replace: true }); }
    else { navigate("/home", { replace: true }); }
  };
  return (
    <Row align="middle" justify="center" style={{ height: "100vh", margin: 0, padding: 0 }}>
      <Col xs={{ span: 24 }} md={{ span: 12, order: 2 }}>
        <Flex gap="middle" vertical style={{ paddingLeft: 40, paddingRight: 40 }}>
          <Typography.Title level={2}>Login</Typography.Title>
          <Form form={form} layout="vertical" style={{ maxWidth: 600 }} onFinish={onFinish} size="large">
            <Form.Item label="Email" name="email" rules={[{ required: true, message: "Please input email!" }, { type: "email", message: "Please enter a valid email!" }]}>
              <Input placeholder="Enter your email" />
            </Form.Item>
            <Form.Item label="Password" name="password" rules={[{ required: true, message: "Please input password!" }]}>
              <Input.Password placeholder="Enter your password" />
            </Form.Item>
            <Form.Item>
              <Button loading={loading} type="primary" htmlType="submit" style={{ width: "100%" }}>Login</Button>
            </Form.Item>
          </Form>
        </Flex>
      </Col>
      <Col xs={{ span: 24 }} md={{ span: 12, order: 1 }} style={{
          position: "relative",
          backgroundImage: "url('/PD_logo_dog.png')",
          backgroundSize: "75%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "left center",
          backgroundColor: "#1877F2",
          height: "100%",
          margin: 0,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingRight: 32
        }}>
          <img src="/PD_logo_text.webp" alt="PayDiverse" style={{ width: 180, objectFit: "contain", mixBlendMode: "multiply" }} />
        </Col>
    </Row>
  );
}
