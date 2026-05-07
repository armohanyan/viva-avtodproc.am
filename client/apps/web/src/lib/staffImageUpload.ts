import { ApiRequestError } from "src/lib/api";
import { vivaApiFetch } from "src/lib/vivaApi";

type UploadImageResponse = { url?: string };

/**
 * POST multipart `file` to the staff image upload endpoint; returns a public URL served from `/upload/…`.
 */
export async function uploadStaffImageFile(file: File): Promise<string> {
	const body = new FormData();
	body.append("file", file);
	const res = await vivaApiFetch("/uploads/image", { method: "POST", body });
	const text = await res.text();
	if (!res.ok) {
		let message = text || res.statusText;
		if (text) {
			try {
				const j = JSON.parse(text) as { message?: string };
				if (typeof j.message === "string" && j.message.trim()) {
					message = j.message.trim();
				}
			} catch {
				/* keep raw */
			}
		}
		throw new ApiRequestError(message, res.status, text || undefined);
	}
	let parsed: UploadImageResponse;
	try {
		parsed = JSON.parse(text) as UploadImageResponse;
	} catch {
		throw new ApiRequestError("Invalid upload response", res.status, text || undefined);
	}
	const url = typeof parsed.url === "string" ? parsed.url.trim() : "";
	if (!url) {
		throw new ApiRequestError("Upload response missing url", res.status, text || undefined);
	}
	return url;
}
