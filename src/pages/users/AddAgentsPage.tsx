import { Form, Input, Button, Row, Col, Select, message, Alert } from "antd";
import { useMutation, useQuery } from "react-query";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import client from "../../utils/axios";
import Spinner from "../../components/general/Spinner";

const { Option } = Select;

interface UsersFormValues {
  email: string;
  fullName: string;
  password: string;
  role: "super_admin" | "agent";
}

message.config({
  duration: 2,
  maxCount: 1,
});

const AddAgentsPage = () => {
  const { id } = useParams<{ id: string }>();
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [isUserAdded, setIsUserAdded] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>("");
  const [form] = Form.useForm<UsersFormValues>();

  useEffect(() => {
    setIsEdit(id !== "new");
  }, [id]);

  const fetchUserData = async () => {
    const { data } = await client.get(`/users/${id}`);
    return data;
  };

  useQuery(["fetchUserData", id], fetchUserData, {
    enabled: isEdit, // Only run query if editing
    onSuccess: (data) => {
      // Populate form fields with the fetched data
      form.setFieldsValue({
        ...data,
      });
      if (data?.message) message.success(data?.message);
    },
    onError: () => {
      message.error("Failed to fetch user details.");
    },
  });

  const submitUser = async (values: UsersFormValues) => {
    const payload = {
      ...values,
      ...(isEdit ? {} : { password: values.password }), // Include password only when adding
      ...(isEdit ? { id } : {}), // Include id only when editing
    };

    await client.post("/users", payload);
  };

  const { mutate: handleSubmit, isLoading } = useMutation(submitUser, {
    onSuccess: (_, values) => {
      if (isEdit) message.success("User edited successfully");
      else {
        message.success("User added successfully");
        form.resetFields();
        setIsUserAdded(true);
        setUserRole(values.role);
      }
    },
    onError: (error: any) => {
      if (error?.response?.data?.message)
        message.error(error?.response?.data?.message);
      else message.error("Failed to submit user details.");
    },
  });

  const onFinish = (values: UsersFormValues) => {
    handleSubmit(values);
  };

  return (
    <>
      <Spinner isLoading={isLoading} />
      <h2>{isEdit ? "Edit User" : "Add Users"}</h2>
      <span className="subtitle">
        Fill the form below to add or edit agents or admins in victoria
      </span>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <Form.Item
              label="Full Name"
              name="name"
              rules={[
                {
                  required: true,
                  message: "Please input the user's full name!",
                },
              ]}
            >
              <Input placeholder="Enter Full Name" size="large" />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                {
                  required: true,
                  message: "Please input the user's email!",
                },
                {
                  type: "email",
                  message: "Please enter a valid email!",
                },
              ]}
            >
              <Input placeholder="Enter Email" size="large" />
            </Form.Item>
          </Col>

          {isEdit ? null : (
            <Col xs={24} lg={12}>
              <Form.Item
                label="Password"
                name="password"
                rules={[
                  {
                    required: true,
                    message: "Please input the user's password!",
                  },
                ]}
              >
                <Input.Password placeholder="Enter Password" size="large" />
              </Form.Item>
            </Col>
          )}

          <Col xs={24} lg={12}>
            <Form.Item
              label="Role"
              name="role"
              rules={[
                { required: true, message: "Please select the user's role!" },
              ]}
            >
              <Select placeholder="Select Role" size="large">
                <Option value="super_admin">Admin</Option>
                <Option value="agent">Agent</Option>
              </Select>
            </Form.Item>
          </Col>

          {/* Submit Button aligned to the right */}
          <Col span={24}>
            <Form.Item>
              <div style={{ textAlign: "right" }}>
                <Button
                  className="download-btn"
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={isLoading}
                >
                  {isEdit ? "Edit User" : "Add User"}
                </Button>
              </div>
            </Form.Item>
          </Col>
        </Row>
      </Form>
      {!isEdit && isUserAdded && (
        <Row>
          <Col span={24}>
            <Alert
              message={
                userRole === "agent"
                  ? "The user's login credentials have been emailed to them successfully."
                  : "Please share the admin's login credentials securely through a trusted channel."
              }
              type="warning"
            />
          </Col>
        </Row>
      )}
    </>
  );
};

export default AddAgentsPage;
