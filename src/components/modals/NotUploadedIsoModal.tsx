import { Modal, Row, Col, Typography } from "antd";
import React from "react";
import dayjs from "dayjs";

export type NotUploadedIso = {
  name: string;
};

type Props = {
  date: string | string[];
  onClose: () => void;
  data: NotUploadedIso[];
};

const NotUploadedIsosModal: React.FC<Props> = ({ onClose, data, date }) => {
  // Split the data into two columns
  const midpoint = Math.ceil(data.length / 2);
  const firstCol = data.slice(0, midpoint);
  const secondCol = data.slice(midpoint);

  return (
    <Modal
      title={`Not Uploaded ISOs for - ${dayjs(date as string).format(
        "MMMM, YYYY"
      )}`}
      open={true}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <Row gutter={16}>
        <Col span={12}>
          {firstCol.map((iso, idx) => (
            <Typography.Paragraph key={idx}>
              {idx + 1}. {iso.name}
            </Typography.Paragraph>
          ))}
        </Col>
        <Col span={12}>
          {secondCol.map((iso, idx) => (
            <Typography.Paragraph key={midpoint + idx}>
              {midpoint + idx + 1}. {iso.name}
            </Typography.Paragraph>
          ))}
        </Col>
      </Row>
    </Modal>
  );
};

export default NotUploadedIsosModal;
