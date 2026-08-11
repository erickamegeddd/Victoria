import { Spin } from "antd";

interface SpinnerProps {
  isLoading: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<SpinnerProps> = ({ isLoading, className = "" }) => {
  return (
    <Spin className={isLoading ? `app-loading-wrapper ${className}` : "hide"} />
  );
};

export default LoadingSpinner;
