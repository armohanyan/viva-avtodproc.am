import { ReactNode } from "react";
import { cn } from "src/lib/utils";
import { Card } from "src/components/ui/card";
import { Label } from "src/components/ui/label";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import { Textarea } from "src/components/ui/textarea";

export function DirectorCard({ children, className }: { children: ReactNode; className?: string }) {
  return <Card className={cn("p-5 md:p-6 border-border", className)}>{children}</Card>;
}

export function DirectorStatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">{children}</div>;
}

export function DirectorStatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4 border-border">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </Card>
  );
}

export function DirectorField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="select-text">{label}</Label>
      {children}
    </div>
  );
}

export function DirectorFormRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 w-full max-w-xl [&>*]:w-full [&:not(:first-child)]:mt-4", className)}>
      {children}
    </div>
  );
}

export function DirectorInput(props: React.ComponentProps<typeof Input>) {
  return <Input {...props} />;
}

export function DirectorTextarea(props: React.ComponentProps<typeof Textarea>) {
  return <Textarea {...props} />;
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

export const directorSelectTriggerClass = selectClass;

export function DirectorSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(selectClass, className)}>
      {children}
    </select>
  );
}

export function DirectorButton({
  children,
  className,
  variant = "primary",
  ...props
}: React.ComponentProps<typeof Button> & { variant?: "primary" | "ghost" }) {
  return (
    <Button
      type="button"
      variant={variant === "ghost" ? "outline" : "default"}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}

export function DirectorTableWrap({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mt-6 overflow-x-auto rounded-lg border border-border", className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function DirectorTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-muted/50 border-b border-border">
      <tr className="text-muted-foreground">{children}</tr>
    </thead>
  );
}

export function DirectorTableTh({ children }: { children: ReactNode }) {
  return <th className="text-left py-2.5 px-3 font-medium">{children}</th>;
}

export function DirectorTableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function DirectorTableRow({ children }: { children: ReactNode }) {
  return <tr className="hover:bg-muted/30">{children}</tr>;
}

export function DirectorTableTd({
  children,
  className,
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn("py-2.5 px-3 text-foreground", className)}>
      {children}
    </td>
  );
}
