import { useCallback, useEffect, useState } from "react";
import type { StudentDemoBooking } from "src/data/studentDemoBookings";
import { vivaApiJson } from "src/lib/vivaApi";

export function useStudentBookings(studentUserId: string | undefined) {
	const [bookings, setBookings] = useState<StudentDemoBooking[]>([]);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		if (!studentUserId) {
			setBookings([]);
			setLoading(false);
			return;
		}
		try {
			const q = new URLSearchParams({ studentUserId });
			const data = await vivaApiJson<StudentDemoBooking[]>(`/bookings?${q.toString()}`);
			setBookings(Array.isArray(data) ? [...data] : []);
		} catch {
			setBookings([]);
		} finally {
			setLoading(false);
		}
	}, [studentUserId]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { bookings, loading, refresh };
}
