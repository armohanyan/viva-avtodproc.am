import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "src/components/ui/tooltip";
import { useLang } from "src/lib/i18n";

type Props = {
	children: ReactNode;
};

/** Wraps a comments link/button with a consistent tooltip (must be inside TooltipProvider). */
export default function ExamQuizToolbarCommentsSlot({ children }: Props) {
	const { t } = useLang();
	return (
		<Tooltip>
			<TooltipTrigger asChild>{children}</TooltipTrigger>
			<TooltipContent side="bottom">{t("questionDetailOpenAction")}</TooltipContent>
		</Tooltip>
	);
}
