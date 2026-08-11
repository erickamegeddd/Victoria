import { Button, Form, Input, message, Modal, Spin } from "antd";
import React, { useState } from "react";
import { useMutation } from "react-query";
import client from "../../utils/axios";
import { getUserFromLocalStorage } from "../../utils/getUser";

interface ResetPasswordModalProps {
  isResetPassword: boolean;
  onOk?: () => void;
  onCancel?: () => void;
}

interface ForgotPasswordProps {
  email: string;
}

interface PasswordFormProps {
  password: string;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isResetPassword,
  onOk,
  onCancel,
}) => {
  const [form] = Form.useForm<ForgotPasswordProps>();
  const [passwordForm] = Form.useForm<PasswordFormProps>();
  const user = getUserFromLocalStorage();
  const [isOTPSent, setOTPSent] = useState<boolean>(false);
  const [isOTPVerified, setOTPVerified] = useState<boolean>(false);

  const handleVerifyOTP = async ({
    email,
    otp,
  }: {
    email: string;
    otp: string;
  }) => {
    const { data } = await client.post(`/verify-otp`, { email, otp });
    return data;
  };

  const { mutate: verifyOTP, isLoading: verifyOTPLoading } = useMutation(
    handleVerifyOTP,
    {
      onSuccess: (data) => {
        if (data.success) {
          setOTPVerified(true);
          setOTPSent(true);
          message.success(data.message || "OTP verified successfully!");
        } else {
          message.error(data.message || "OTP verification failed!");
          setOTPSent(false);
        }
      },
      onError: (error: any) => {
        if (error?.response?.data?.message) {
          setOTPSent(false);
          message.error(error.response.data.message);
        } else {
          message.error("Failed to verify OTP. Please try again.");
        }
      },
    }
  );

  const handleSendOTP = async ({ email }: { email: string }) => {
    const { data } = await client.post(`/send-otp`, { email });
    return data;
  };

  const { mutate: sendOTP, isLoading } = useMutation(handleSendOTP, {
    onSuccess: (data) => {
      if (data.success) {
        setOTPSent(true);
        message.success(data.message || "OTP verified successfully!");
      } else {
        message.error(data.message || "OTP verification failed!");
      }
    },
    onError: (error: any) => {
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error("Failed to verify OTP. Please try again.");
      }
    },
  });

  const handleOTPSubmit = async (value: string) => {
    if (user?.email != null && isResetPassword) {
      verifyOTP({ email: user.email, otp: value });
      return;
    }
    verifyOTP({ email: form.getFieldValue("email"), otp: value });
  };

  const handleResetPassword = async ({
    password,
    email,
  }: {
    password: string;
    email: string;
  }) => {
    const { data } = await client.post(`/reset-password`, { password, email });
    return data;
  };

  const { mutate: resetPassword, isLoading: resetPasswordLoading } =
    useMutation(handleResetPassword, {
      onSuccess: (data) => {
        if (data.success) {
          message.success(data.message || "Password changed successfully!");
          onOk && onOk();
        } else {
          message.error(data.message || "Failed to change password!");
        }
      },
      onError: (error: any) => {
        if (error?.response?.data?.message) {
          message.error(error.response.data.message);
        } else {
          message.error("Failed to reset Password. Please try again.");
        }
      },
    });

  const handlePasswordReset = async (email: string) => {
    try {
      const values = await passwordForm.validateFields();
      resetPassword({ password: values.password, email: email });
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  return (
    <Modal
      className="reset-password-modal"
      title={isResetPassword ? "Reset Password" : "Forgot Password"}
      open={true}
      maskClosable={true}
      onOk={onOk}
      onCancel={onCancel}
      footer={[
        !isOTPSent ? (
          <Button
            loading={isLoading}
            type="primary"
            disabled={isLoading && isResetPassword}
            onClick={() => {
              if (user != null && isResetPassword) {
                sendOTP({ email: user.email });
              } else if (!isResetPassword) {
                form.validateFields();
                sendOTP({ email: form.getFieldValue("email") });
              } else {
                message.error("Error sending OTP");
              }
            }}
          >
            Send OTP
          </Button>
        ) : null,
      ]}
    >
      <>
        <Spin
          className={
            isLoading || verifyOTPLoading || resetPasswordLoading
              ? `app-loading-wrapper`
              : "hide"
          }
        />
        <div className="sub-title">
          Send OTP by clicking the button below to your email registered with
          Victoria and confirm it by entering to reset password
        </div>
        {!isResetPassword && (
          <Form form={form} layout="vertical">
            <Form.Item
              name="email"
              label="Enter your email registered with victoria"
              rules={[
                { required: true, message: "Please input the email!" },
                {
                  type: "email",
                  message: "Please enter a valid email!",
                },
                { validator: (_, value) => { const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/; if (!value || emailRegex.test(value)) { return Promise.resolve(); } return Promise.reject(new Error("Email must follow the pattern: example@domain.com")); } },
              ]}
            >
              <Input placeholder="Enter email" size="large" />
            </Form.Item>
          </Form>
        )}
        {isOTPSent && !isOTPVerified && (
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",margin:"20px 0px"}}>
            <Input.OTP size="large" length={6} onChange={handleOTPSubmit} style={{fontSize:"24px",textAlign:"center",letterSpacing:"8px"}}/>
          </div>
        )}
        {isOTPSent && isOTPVerified && (
          <Form form={passwordForm} layout="vertical">
            <Form.Item name="password" label="Enter your new Password" rules={[{required:true,message:"Please input the new password!"}]}>
              <Input.Password size="large" />
            </Form.Item>
            <Form.Item style={{textAlign:"right"}}>
              <Button type="primary" loading={resetPasswordLoading} disabled={resetPasswordLoading} onClick={() => { if (user?.email != null && isResetPassword) handlePasswordReset(user?.email); else if (!isResetPassword) handlePasswordReset(form.getFieldValue("email")); }}>Reset Password</Button>
            </Form.Item>
          </Form>
        )}
      </>
    </Modal>
  );
};
export default ResetPasswordModal;
