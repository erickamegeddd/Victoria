// @ts-nocheck
import dayjs from "dayjs";

// Default month for every month picker: two months before the current month (e.g. in October the default is August).
export const defaultMonth = (): string => dayjs().subtract(2, "month").startOf("month").format("YYYY-MM-01");
export const fetchLatestMonth = async (): Promise<string> => defaultMonth();
export const useLatestMonth = (): string => defaultMonth();
