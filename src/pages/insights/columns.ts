import dayjs from "dayjs";
import formatCurrency from "../../utils/formatCurrency";

export const columns = [
  {
    key: 1,
    title: "Month",
    dataIndex: "month",
    width: "400px",
    render: (month: string) => {
      return dayjs(month).format("MMMM, YYYY");
    },
    sorter: (a: any, b: any) => {
      const dateA = dayjs(a.month);
      const dateB = dayjs(b.month);
      return dateA.isBefore(dateB) ? -1 : dateA.isAfter(dateB) ? 1 : 0;
    },
  },
  {
    key: 2,
    title: "Total Residual",
    dataIndex: "total_residual",
    width: "400px",
    sorter: (a: Columns, b: Columns) => a.total_residual - b.total_residual,
    render: (total_residual: any) => formatCurrency(total_residual),
  },
  {
    key: 3,
    title: "PayDiverse Residual",
    dataIndex: "paydiverse_residual",
    width: "400px",
    sorter: (a: Columns, b: Columns) =>
      a.paydiverse_residual - b.paydiverse_residual,
    render: (paydiverse_residual: any) => formatCurrency(paydiverse_residual),
  },
];
