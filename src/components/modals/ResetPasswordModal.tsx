// @ts-nocheck
import { Button, Form, Input, message, Modal } from "antd";
import React, { useState } from "react";
import { getUserFromLocalStorage } from "../../utils/getUser";

interface ResetPasswordModalProps {
  isResetPassword: boolean;
  onOk?: () => void;
  onCancel?: () => void;
}

// Sends a one-time reset link by email (Victoria's own Gmail sender + Supabase recovery token, no external backend).
const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isResetPassword, onCancel }) => {
  const [form] = Form.useForm();
  const user = getUserFromLocalStorage();
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const send = async () => {
    let email = user?.email;
    if (!isResetPassword) {
      try { const v = await form.validateFields(); email = v.email; } catch { return; }
    }
    if (!email) { message.error("No email found for this account"); return; }
    setSending(true);
    try {
      const r = await fetch("/api/send-payment-reminder?action=password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.message || "Could not send the reset email. Please try again.");
      setSentTo(email);
    } catch (e) {
      message.error(e.message || "Could not send the reset email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      className="reset-password-modal"
      title={isResetPassword ? "Reset Password" : "Forgot Password"}
      open={true}
      maskClosable={true}
      onCancel={onCancel}
      footer={sentTo ? [<Button key="close" type="primary" onClick={onCancel}>Close</Button>] : [<Button key="send" type="primary" loading={sending} onClick={send}>Send reset link</Button>]}
    >
      {sentTo ? (
        <div className="sub-title">If <b>{sentTo}</b> is registered with Victoria, a reset link is on its way. Open the email and click the button to choose a new password. The link works once and expires soon. Check spam if you don't see it.</div>
      ) : (
        <>
          <div className="sub-title">{isResetPassword ? `We'll email a password reset link to ${user?.email || "your Victoria email"}.` : "Enter your Victoria email and we'll send you a password reset link."}</div>
          {!isResetPassword && (
            <Form form={form} layout="vertical">
              <Form.Item name="email" label="Email" rules={[{ required: true, message: "Please input the email!" }, { type: "email", message: "Please enter a valid email!" }]}>
                <Input placeholder="Enter email" size="large" onPressEnter={send} />
              </Form.Item>
            </Form>
          )}
        </>
      )}
    </Modal>
  );
};
export default ResetPasswordModal;
