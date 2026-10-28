// @ts-nocheck
import { useState } from "react";
import { Button, Form, Input, Typography, message } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../utils/supabase";

const { Title, Text } = Typography;

// Landing page for the emailed reset link: /reset-password?token_hash=...
const ResetPassword = () => {
  const [params] = useSearchParams();
  const tokenHash = params.get("token_hash");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async ({ password }) => {
    setLoading(true);
    try {
      const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
      if (vErr) throw new Error("This reset link is invalid or has expired. Please request a new one.");
      const { error: uErr } = await supabase.auth.updateUser({ password });
      if (uErr) throw new Error(uErr.message);
      await supabase.auth.signOut({ scope: "global" }); // revoke every other signed-in session for this account
      localStorage.removeItem("token"); localStorage.removeItem("user");
      setDone(true);
      message.success("Password updated. Please sign in.");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (e) {
      message.error(e.message || "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#eef2f7", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 36, width: "100%", maxWidth: 420, boxShadow: "0 10px 30px rgba(15,32,64,0.12)" }}>
        <Title level={3} style={{ marginTop: 0 }}>Choose a new password</Title>
        {!tokenHash ? (
          <>
            <Text>This reset link is incomplete. Please request a new one from the sign-in page.</Text>
            <Button type="primary" block style={{ marginTop: 20 }} onClick={() => navigate("/login")}>Back to sign in</Button>
          </>
        ) : done ? (
          <Text>Password updated. Taking you to sign in...</Text>
        ) : (
          <Form layout="vertical" onFinish={submit}>
            <Form.Item name="password" label="New password" rules={[{ required: true, message: "Please enter a new password" }, { min: 8, message: "Use at least 8 characters" }]}>
              <Input.Password size="large" autoFocus />
            </Form.Item>
            <Form.Item name="confirm" label="Confirm password" dependencies={["password"]} rules={[{ required: true, message: "Please confirm the password" }, ({ getFieldValue }) => ({ validator(_, v) { return !v || getFieldValue("password") === v ? Promise.resolve() : Promise.reject(new Error("Passwords do not match")); } })]}>
              <Input.Password size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>Update password</Button>
          </Form>
        )}
      </div>
    </div>
  );
};
export default ResetPassword;
