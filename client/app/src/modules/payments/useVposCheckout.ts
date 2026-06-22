import { useCallback, useEffect, useState } from "react";
import { useLang } from "src/lib/i18n";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";

export type VposPublicConfig = {
  enabled: boolean;
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
      if (!config || config.simulated) {
        return { mode: "simulated" };
      }
      const data = await vivaApiJson<InitiateResponse>("/payments/initiate", {
        method: "POST",
        body: { ...input, language: lang },
      });
      window.location.assign(data.redirectUrl);
      return { mode: "redirect" };
    },
    [config, lang],
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

  return {
    config,
    configLoading,
    configError,
    initiateCheckout,
    completeBookingPaymentSimulated,
    completePackagePurchaseSimulated,
    purchaseExtraPracticalSimulated,
  };
}
