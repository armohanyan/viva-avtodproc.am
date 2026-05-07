/** Two-letter initials for avatar chips (Latin / mixed scripts). */
export function initialsFromName(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase() || "?";
	}
	const one = parts[0] ?? "?";
	return one.slice(0, 2).toUpperCase();
}
