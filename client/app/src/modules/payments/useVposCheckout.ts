import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "src/lib/i18n";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";

export type VposPublicConfig = {
  enabled: boolean;
  mode?: "development" | "production";
  testMode: boolean;
  simulated: boolean;
};

export type VposCheckoutInput =
  | { kind: "booking"; bookingId: number }
  | { kind: "package"; packageId: number }
  | { kind: "extra_practical"; practicalTotal?: number };

type InitiateResponse = {
  sessionId: number;
  orderNumber: string;
  redirectUrl: string;
};

export type VposCheckoutResult = { mode: "simulated" } | { mode: "redirect" };

export function useVposCheckout() {
  const { lang } = useLang();
  const [config, setConfig] = useState<VposPublicConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const configRef = useRef(config);
  const configLoadingRef = useRef(configLoading);
  configRef.current = config;
  configLoadingRef.current = configLoading;

  useEffect(() => {
    let cancelled = false;
    setConfigLoading(true);
    void vivaApiJson<VposPublicConfig>("/payments/config")
      .then((data) => {
        if (!cancelled) {
          setConfig(data);
          setConfigError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setConfig({ enabled: false, testMode: true, simulated: true });
          setConfigError(getApiErrorMessage(e));
        }
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const initiateCheckout = useCallback(
    async (input: VposCheckoutInput): Promise<VposCheckoutResult> => {
      let waited = 0;
      while (configLoadingRef.current && waited < 5000) {
        await new Promise((resolve) => window.setTimeout(resolve, 50));
        waited += 50;
      }
      const cfg = configRef.current;
      if (!cfg || cfg.simulated) {
        return { mode: "simulated" };
      }
      const data = await vivaApiJson<InitiateResponse>("/payments/initiate", {
        method: "POST",
        body: { ...input, language: lang },
      });
      window.location.assign(data.redirectUrl);
      return { mode: "redirect" };
    },
    [lang],
  );

  const completeBookingPaymentSimulated = useCallback(async (bookingId: number) => {
    await vivaApiJson(`/bookings/${encodeURIComponent(String(bookingId))}/complete-payment`, { method: "POST" });
  }, []);

  const completePackagePurchaseSimulated = useCallback(async (studentUserId: number, packageId: number) => {
    await vivaApiJson(`/students/${encodeURIComponent(String(studentUserId))}/entitlements/package/complete-purchase`, {
      method: "POST",
      body: { packageId },
    });
  }, []);

  const purchaseExtraPracticalSimulated = useCallback(async (studentUserId: number, practicalTotal: number) => {
    await vivaApiJson(`/students/${encodeURIComponent(String(studentUserId))}/entitlements/extra-practical`, {
      method: "POST",
      body: { practicalTotal },
    });
  }, []);

  const syncPaymentSession = useCallback(async (sessionId: number) => {
    return vivaApiJson<{ status: "paid" | "failed"; sessionId: number; orderNumber: string; amountAmd: number }>(
      "/payments/sync",
      { method: "POST", body: { sessionId } },
    );
  }, []);

  return {
    config,
    configLoading,
    configError,
    initiateCheckout,
    completeBookingPaymentSimulated,
    completePackagePurchaseSimulated,
    purchaseExtraPracticalSimulated,
    syncPaymentSession,
  };
}
