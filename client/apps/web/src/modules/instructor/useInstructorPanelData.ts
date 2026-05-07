import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "src/lib/api";
import { vivaApiJson } from "src/lib/vivaApi";
import type { AccountSessionUser } from "src/modules/accounts";

export type InstructorPanelBooking = {
	id: number;
	studentId: number;
	studentName: string;
	dateIso: string;
	time: string;
	endTime: string | null;
	totalPriceAmd: number | null;
	type: "practical" | "theory" | "theory_personal";
	status: string;
	branchId: number;
	/** `null` = not set; same field staff and instructors update. */
	lessonPassedSuccessfully: boolean | null;
};

export type InstructorPanelStudent = {
	id: number;
	name: string;
	email: string;
	phone: string;
	instructor: string;
	package: string;
	lessons: string;
	status: string;
	joinedIso: string;
	branchId: number;
	skillRating: number;
	licenseAchieved: boolean;
};

function instructorUserIdOrNull(user: AccountSessionUser | null): number | null {
	if (!user || user.accountType !== "instructor") return null;
	const uid = Number(user.id);
	return Number.isFinite(uid) && uid > 0 ? uid : null;
}

export function useInstructorPanelBookings(user: AccountSessionUser | null) {
	const [bookings, setBookings] = useState<InstructorPanelBooking[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		const uid = instructorUserIdOrNull(user);
		if (uid == null) {
			setBookings([]);
			setLoading(false);
			setError(null);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const q = new URLSearchParams({ instructorUserId: String(uid) });
			const data = await vivaApiJson<InstructorPanelBooking[]>(`/bookings?${q.toString()}`);
			setBookings(
				Array.isArray(data)
					? data.map((b) => ({
							...b,
							lessonPassedSuccessfully:
								b.lessonPassedSuccessfully === null || b.lessonPassedSuccessfully === undefined
									? null
									: Boolean(b.lessonPassedSuccessfully),
						}))
					: [],
			);
		} catch (e) {
			setBookings([]);
			setError(getApiErrorMessage(e));
		} finally {
			setLoading(false);
		}
	}, [user]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { bookings, loading, error, refresh };
}

export async function patchBookingLessonPassed(
	bookingId: number,
	lessonPassedSuccessfully: boolean | null,
): Promise<InstructorPanelBooking> {
	return vivaApiJson<InstructorPanelBooking>(`/bookings/${encodeURIComponent(String(bookingId))}/lesson-passed`, {
		method: "PATCH",
		body: { lessonPassedSuccessfully },
	});
}

export function useInstructorPanelStudents(user: AccountSessionUser | null) {
	const [students, setStudents] = useState<InstructorPanelStudent[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		const uid = instructorUserIdOrNull(user);
		if (uid == null) {
			setStudents([]);
			setLoading(false);
			setError(null);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const q = new URLSearchParams({ instructorUserId: String(uid) });
			const data = await vivaApiJson<InstructorPanelStudent[]>(`/students?${q.toString()}`);
			setStudents(Array.isArray(data) ? data : []);
		} catch (e) {
			setStudents([]);
			setError(getApiErrorMessage(e));
		} finally {
			setLoading(false);
		}
	}, [user]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { students, loading, error, refresh, setStudents };
}

export async function patchInstructorStudentFields(
	studentUserId: number,
	body: { skillRating?: number; licenseAchieved?: boolean },
): Promise<InstructorPanelStudent> {
	return vivaApiJson<InstructorPanelStudent>(`/students/${encodeURIComponent(String(studentUserId))}/instructor-fields`, {
		method: "PATCH",
		body,
	});
}
