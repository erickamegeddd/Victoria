import { Modal } from "antd";

interface ZeroVolumeISOModalProps {
  onClose: () => void;
}

const ZeroVolumeISOModal: React.FC<ZeroVolumeISOModalProps> = ({ onClose }) => {
  const data = ["Authorize.Net", "NMI"];
  return (
    <>
      <Modal
        title={`Zero Volume ISO's List`}
        open={true}
        onCancel={onClose}
        footer={null}
        centered
        width={"600px"}
      >
        <ul style={{ marginLeft: 20 }}>
          {data.map((iso: string, index: number) => (
            <li key={index} style={{ fontSize: 15 }}>
              {iso}
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
};

export default ZeroVolumeISOModal;
