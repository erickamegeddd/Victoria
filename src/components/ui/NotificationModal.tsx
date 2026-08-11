import { Button, notification } from "antd";

interface NotificationProps {
  description: string | JSX.Element;
  type: string;
}

export const NotificationModal = (props: NotificationProps) => {
  const { description, type } = props;
  const confirmOkModal = () => {
    if (type == "error") {
      notification.warning({ message: "Error Message", description: description, duration: 5, placement: "top", className: "custom-notification", btn: (<Button size="large" onClick={() => notification.destroy()}>Continue</Button>) });
    } else if (type == "success") {
      notification.success({ message: "Victoria!", description: description, duration: 5, placement: "top", className: "custom-notification", btn: (<Button size="large" onClick={() => notification.destroy()}>Continue</Button>) });
    } else if (type == "info") {
      notification.info({ message: "Info", description: description, duration: 5, placement: "top", className: "custom-notification", btn: (<Button size="large" onClick={() => notification.destroy()}>Continue"</Button>) });
    }
  };
  return confirmOkModal();
};
