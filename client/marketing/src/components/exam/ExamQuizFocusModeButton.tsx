import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";

type Props = {
	active: boolean;
	onToggle: () => void;
	className?: string;
};

export default function ExamQuizFocusModeButton({ active, onToggle, className }: Props) {
	const { t } = useLang();
	const label = active ? t("examQuizExitFocusMode") : t("examQuizFocusMode");

	return (
		<Button
			type="button"
			variant="outline"
			size="icon"
			onClick={onToggle}
			className={cn("shrink-0", className)}
			aria-pressed={active}
			aria-label={label}
			title={label}
		>
			{active ? (
				<Minimize2 className="size-4" aria-hidden />
			) : (
				<Maximize2 className="size-4" aria-hidden />
			)}
		</Button>
	);
}
