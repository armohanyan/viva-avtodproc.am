import { Skeleton } from "src/components/ui/skeleton";

type TableSkeletonRowsProps = {
	rows?: number;
	cols: number;
	cellClassName?: string;
};

export default function TableSkeletonRows({ rows = 6, cols, cellClassName = "px-5 py-3.5" }: TableSkeletonRowsProps) {
	return (
		<>
			{Array.from({ length: rows }).map((_, r) => (
				<tr key={r}>
					{Array.from({ length: cols }).map((_, c) => (
						<td key={c} className={cellClassName}>
							<Skeleton className="h-4 w-full max-w-[9rem]" />
						</td>
					))}
				</tr>
			))}
		</>
	);
}
