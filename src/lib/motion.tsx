import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type RevealProps = {
	children: ReactNode;
	className?: string;
	delay?: number;
	duration?: number;
	amount?: number;
	once?: boolean;
};

const revealVariants = {
	hidden: { opacity: 0, y: 18 },
	show: { opacity: 1, y: 0 },
} as const;

export function Reveal({
	children,
	className,
	delay = 0,
	duration = 0.45,
	amount = 0.2,
	once = true,
}: RevealProps) {
	const reducedMotion = useReducedMotion();
	if (reducedMotion) return <div className={className}>{children}</div>;

	return (
		<motion.div
			className={className}
			variants={revealVariants}
			initial="hidden"
			whileInView="show"
			viewport={{ once, amount }}
			transition={{ duration, delay, ease: "easeOut" }}
		>
			{children}
		</motion.div>
	);
}

type CountUpValue = string | number;

export function parseCountValue(input: CountUpValue): {
	to: number;
	suffix: string;
	decimals: number;
} {
	if (typeof input === "number") {
		const decimals = Number.isInteger(input) ? 0 : input.toString().split(".")[1]?.length ?? 0;
		return { to: input, suffix: "", decimals };
	}

	const s = input.trim();
	const match = s.match(/^([0-9][0-9,]*(?:\.[0-9]+)?)\s*(.*)$/);
	if (!match) return { to: 0, suffix: s, decimals: 0 };

	const numberPart = match[1]!;
	const suffixPart = match[2] ?? "";
	const to = Number.parseFloat(numberPart.replace(/,/g, ""));
	const decimals = numberPart.includes(".") ? numberPart.split(".")[1]?.length ?? 0 : 0;

	return { to: Number.isFinite(to) ? to : 0, suffix: suffixPart.trimStart(), decimals };
}

type CountUpTextProps = {
	value: CountUpValue;
	start?: number;
	duration?: number;
	decimals?: number;
	prefix?: string;
	suffix?: string;
	className?: string;
};

export function CountUpText({
	value,
	start = 0,
	duration = 0.8,
	decimals,
	prefix = "",
	suffix: suffixOverride,
	className,
}: CountUpTextProps) {
	const reducedMotion = useReducedMotion();
	const target = useMemo(() => parseCountValue(value), [value]);
	const ref = useRef<HTMLSpanElement | null>(null);
	const inView = useInView(ref, { once: true, amount: 0.35 });

	const [current, setCurrent] = useState<number>(start);

	useEffect(() => {
		if (!inView) return;

		if (reducedMotion) {
			setCurrent(target.to);
			return;
		}

		const controls = animate(start, target.to, {
			duration,
			ease: "easeOut",
			onUpdate: (v) => setCurrent(v),
		});

		return () => controls.stop();
	}, [duration, inView, reducedMotion, start, target.to]);

	const finalDecimals = decimals ?? target.decimals;
	const formatted = useMemo(() => {
		if (finalDecimals > 0) return current.toFixed(finalDecimals);
		return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(current));
	}, [current, finalDecimals]);

	return (
		<span ref={ref} className={className}>
			{prefix}
			{formatted}
			{suffixOverride ?? target.suffix}
		</span>
	);
}

