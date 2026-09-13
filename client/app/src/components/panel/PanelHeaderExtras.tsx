import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "src/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu";
import { cn } from "src/lib/utils";

/**
 * Secondary header controls: inline from `sm` up; collapsed into a "more" menu on narrow screens.
 * Put interactive controls (selects, toggles) in `secondary` - they render in both places via CSS.
 */
export function PanelHeaderExtras({
	secondary,
	primary,
	moreLabel,
	className,
}: {
	/** Theme, lang, branch filter, director shortcuts, etc. */
	secondary?: ReactNode;
	/** Always visible: notifications + avatar */
	primary: ReactNode;
	moreLabel: string;
	className?: string;
}) {
	return (
		<div className={cn("flex items-center justify-end gap-1.5 sm:gap-2 min-w-0", className)}>
			{secondary != null ? (
				<>
					<div className="hidden sm:flex items-center gap-1.5 sm:gap-2 shrink-0">{secondary}</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								type="button"
								variant="outline"
								size="icon-lg"
								className="sm:hidden shrink-0"
								aria-label={moreLabel}
							>
								<MoreHorizontal className="h-5 w-5" aria-hidden />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className="w-[min(18rem,calc(100vw-1.5rem))] p-3 flex flex-col gap-3"
							onCloseAutoFocus={(e) => e.preventDefault()}
						>
							{/* Keep selects/toggles usable inside the menu */}
							<div
								className="flex flex-col gap-3 [&_button]:w-full [&_[data-slot=select-trigger]]:w-full"
								onPointerDown={(e) => e.stopPropagation()}
							>
								{secondary}
							</div>
						</DropdownMenuContent>
					</DropdownMenu>
				</>
			) : null}
			<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">{primary}</div>
		</div>
	);
}
