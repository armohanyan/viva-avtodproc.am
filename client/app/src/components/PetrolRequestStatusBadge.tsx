import { useLang } from "src/lib/i18n";
import type { TranslationKey } from "src/lib/i18n";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";

export type PetrolRequestStatus = "pending" | "approved" | "rejected";

const STATUS_KEY: Record<PetrolRequestStatus, TranslationKey> = {
  pending: "petrolRequestStatusPending",
  approved: "petrolRequestStatusApproved",
  rejected: "petrolRequestStatusRejected",
};

const STATUS_CLASS: Record<PetrolRequestStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

const STATUS_ICON: Record<PetrolRequestStatus, typeof Clock3> = {
  pending: Clock3,
  approved: CheckCircle2,
  rejected: XCircle,
};

export default function PetrolRequestStatusBadge({ status }: { status: PetrolRequestStatus }) {
  const { t } = useLang();
  const Icon = STATUS_ICON[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${STATUS_CLASS[status]}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {t(STATUS_KEY[status])}
    </span>
  );
}
