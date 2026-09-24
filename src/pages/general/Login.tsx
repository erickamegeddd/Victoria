// @ts-nocheck
import { useState, useEffect } from "react";
import { Button, Form, Input, Typography, message } from "antd";
import { LockOutlined } from "@ant-design/icons";
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
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #08111f 0%, #0c1c36 45%, #0a1628 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        display: "flex",
        borderRadius: 20,
        overflow: "hidden",
        width: "100%",
        maxWidth: 920,
        minHeight: 500,
        boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
      }}>

        {/* ── Left panel — brand ──────────────────────────────── */}
        <div style={{
          flex: "0 0 44%",
          background: "rgba(255,255,255,0.055)",
          backdropFilter: "blur(16px)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px 44px",
        }}>
          <div>
            {/* Logo */}
            <div style={{
              background: "#fff",
              borderRadius: 10,
              padding: "6px 14px",
              display: "inline-flex",
              alignItems: "center",
              boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
              marginBottom: 36,
            }}>
              <img src="/paydiverse-logo.webp" alt="PayDiverse" style={{ height: 38, objectFit: "contain", maxWidth: 160 }} />
            </div>

            {/* Headline */}
            <Typography.Title level={2} style={{
              color: "#fff",
              margin: 0,
              fontSize: 30,
              fontWeight: 800,
              lineHeight: 1.25,
              letterSpacing: "-0.3px",
            }}>
              The ISO operations hub for PayDiverse.
            </Typography.Title>

            {/* Subtext */}
            <p style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 15,
              marginTop: 18,
              lineHeight: 1.75,
            }}>
              Victoria brings ISO analytics, residuals, and payment reporting into a single place — so your team moves fast and nothing slips.
            </p>
          </div>

          {/* Bottom badge */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "rgba(255,255,255,0.38)",
            fontSize: 12,
            marginTop: 32,
          }}>
            <LockOutlined style={{ fontSize: 13 }} />
            <span>Secured · Invitation-only access</span>
          </div>
        </div>

        {/* ── Right panel — form ──────────────────────────────── */}
        <div style={{
          flex: 1,
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "52px 52px",
        }}>
          <Typography.Title level={2} style={{
            margin: "0 0 6px",
            fontWeight: 800,
            fontSize: 28,
            color: "#0f172a",
          }}>
            Sign in
          </Typography.Title>
          <p style={{
            color: "#64748b",
            fontSize: 14,
            marginBottom: 36,
            lineHeight: 1.6,
          }}>
            Enter your work email and password to continue into Victoria.
          </p>

          <Form form={form} layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              label={<span style={{ fontWeight: 600, color: "#374151" }}>Email</span>}
              name="email"
              rules={[
                { required: true, message: "Please input your email!" },
                { type: "email", message: "Please enter a valid email!" },
              ]}
            >
              <Input
                placeholder="you@example.com"
                style={{ borderRadius: 8, height: 44 }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 600, color: "#374151" }}>Password</span>}
              name="password"
              rules={[{ required: true, message: "Please input your password!" }]}
            >
              <Input.Password
                placeholder="••••••••"
                style={{ borderRadius: 8, height: 44 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 14, marginTop: 4 }}>
              <Button
                loading={loading}
                type="primary"
                htmlType="submit"
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 700,
                  background: "#1d4ed8",
                  border: "none",
                  letterSpacing: "0.2px",
                }}
              >
                Sign in
              </Button>
            </Form.Item>

            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <Button type="link" style={{ padding: 0, fontSize: 13, color: "#1d4ed8" }}>
                Forgot password?
              </Button>
            </div>
          </Form>

          <p style={{
            color: "#94a3b8",
            fontSize: 12,
            textAlign: "center",
            margin: 0,
            lineHeight: 1.6,
          }}>
            New to Victoria? Sign-up is by invitation only —{" "}
            your admin will email you a setup link.
          </p>
        </div>

      </div>
    </div>
  );
}
