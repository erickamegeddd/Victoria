// @ts-nocheck
import { useState, useEffect } from "react";
import { Button, Form, Input, Typography, message } from "antd";
import { LockOutlined, GlobalOutlined, DollarOutlined, BarChartOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabase";

message.config({ duration: 2, maxCount: 1 });

const GlobeDecor = () => (
  <svg width="148" height="148" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="80" cy="80" r="72" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
    <ellipse cx="80" cy="80" rx="72" ry="26" stroke="rgba(255,255,255,0.14)" strokeWidth="1"/>
    <ellipse cx="80" cy="80" rx="72" ry="50" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
    <line x1="80" y1="8" x2="80" y2="152" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
    <line x1="8" y1="80" x2="152" y2="80" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
    <path d="M80 8 Q120 80 80 152" stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none"/>
    <path d="M80 8 Q40 80 80 152" stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none"/>
    {/* Node dots */}
    <circle cx="80" cy="80" r="5" fill="#60a5fa" opacity="0.9"/>
    <circle cx="118" cy="54" r="3.5" fill="#60a5fa" opacity="0.75"/>
    <circle cx="42" cy="50" r="3.5" fill="#60a5fa" opacity="0.75"/>
    <circle cx="130" cy="100" r="3" fill="#60a5fa" opacity="0.65"/>
    <circle cx="34" cy="108" r="3" fill="#60a5fa" opacity="0.65"/>
    <circle cx="95" cy="120" r="2.5" fill="#60a5fa" opacity="0.55"/>
    {/* Connection lines */}
    <line x1="80" y1="80" x2="118" y2="54" stroke="rgba(96,165,250,0.4)" strokeWidth="1"/>
    <line x1="80" y1="80" x2="42" y2="50" stroke="rgba(96,165,250,0.4)" strokeWidth="1"/>
    <line x1="80" y1="80" x2="130" y2="100" stroke="rgba(96,165,250,0.3)" strokeWidth="1"/>
    <line x1="80" y1="80" x2="34" y2="108" stroke="rgba(96,165,250,0.3)" strokeWidth="1"/>
    <line x1="80" y1="80" x2="95" y2="120" stroke="rgba(96,165,250,0.25)" strokeWidth="1"/>
    <line x1="118" y1="54" x2="42" y2="50" stroke="rgba(96,165,250,0.15)" strokeWidth="1"/>
    <line x1="130" y1="100" x2="95" y2="120" stroke="rgba(96,165,250,0.15)" strokeWidth="1"/>
  </svg>
);

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
        maxWidth: 940,
        minHeight: 560,
        boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
      }}>

        {/* ── Left panel — brand ──────────────────────────── */}
        <div style={{
          flex: "0 0 44%",
          background: "rgba(255,255,255,0.055)",
          backdropFilter: "blur(16px)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          padding: "48px 42px",
          position: "relative",
          overflow: "hidden",
          gap: 24,
        }}>

          {/* Dog — large watermark bottom-right */}
          <img
            src="/PD_logo_dog.png"
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: -10,
              right: -24,
              width: 210,
              opacity: 0.14,
              filter: "brightness(2) grayscale(20%)",
              pointerEvents: "none",
              userSelect: "none",
            }}
          />

          {/* Top: logo + headline + subtext */}
          <div>
            {/* Logo — no white box, screen-blend onto dark */}
            <img
              src="/paydiverse-logo.webp"
              alt="PayDiverse"
              style={{
                height: 58,
                objectFit: "contain",
                marginBottom: 28,
                mixBlendMode: "screen",
                filter: "brightness(1.5)",
                display: "block",
              }}
            />

            <Typography.Title level={2} style={{
              color: "#fff",
              margin: 0,
              fontSize: 27,
              fontWeight: 800,
              lineHeight: 1.25,
              letterSpacing: "-0.3px",
            }}>
              The reconciliation hub for PayDiverse.
            </Typography.Title>

            <p style={{
              color: "rgba(255,255,255,0.72)",
              fontSize: 14,
              marginTop: 14,
              lineHeight: 1.75,
              marginBottom: 0,
            }}>
              Victoria brings ISO analytics, residuals, and payment reporting into a single place — so your team moves fast and nothing slips.
            </p>
          </div>

          {/* Globe + chips */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, zIndex: 1 }}>
            <GlobeDecor />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>
              {[
                { icon: <BarChartOutlined />, label: "ISO Analytics" },
                { icon: <DollarOutlined />,   label: "Residuals"    },
                { icon: <GlobalOutlined />,   label: "40+ Banks"    },
                { icon: <SafetyCertificateOutlined />, label: "Secured" },
              ].map(({ icon, label }) => (
                <div key={label} style={{
                  background: "rgba(255,255,255,0.09)",
                  border: "1px solid rgba(255,255,255,0.13)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  <span style={{ color: "#60a5fa", fontSize: 14 }}>{icon}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom badge */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "rgba(255,255,255,0.42)",
            fontSize: 12,
            marginTop: "auto",
          }}>
            <LockOutlined style={{ fontSize: 13 }} />
            <span>Secured · Invitation-only access</span>
          </div>
        </div>

        {/* ── Right panel — form ──────────────────────────── */}
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
              <Input placeholder="you@example.com" style={{ borderRadius: 8, height: 44 }} />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 600, color: "#374151" }}>Password</span>}
              name="password"
              rules={[{ required: true, message: "Please input your password!" }]}
            >
              <Input.Password placeholder="••••••••" style={{ borderRadius: 8, height: 44 }} />
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
