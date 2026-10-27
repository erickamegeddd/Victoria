// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// Latest month that has residuals or a logged (received) payment. Pages default to it instead of a hard-coded month.
const FALLBACK = "2026-08-01";
let cached: string | null = null;
let inflight: Promise<string> | null = null;

export const fetchLatestMonth = async (): Promise<string> => {
  if (cached) return cached;
  if (!inflight) {
    inflight = (async () => {
      const [r, p] = await Promise.all([
        supabase.from("residuals").select("report_month").order("report_month", { ascending: false }).limit(1),
        supabase.from("iso_payments").select("report_month").not("received_amount", "is", null).order("report_month", { ascending: false }).limit(1),
      ]);
      const months = [r.data?.[0]?.report_month, p.data?.[0]?.report_month].filter(Boolean).map((m) => String(m).slice(0, 7) + "-01");
      cached = months.length ? months.sort().pop() : FALLBACK;
      return cached;
    })().finally(() => { inflight = null; });
  }
  return inflight;
};

export const useLatestMonth = (): string => {
  const [m, setM] = useState<string>(cached || FALLBACK);
  useEffect(() => { fetchLatestMonth().then(setM).catch(() => {}); }, []);
  return m;
};
