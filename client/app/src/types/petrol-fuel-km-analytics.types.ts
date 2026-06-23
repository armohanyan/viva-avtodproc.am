export type PetrolFuelKmAnalyticsRow = {
  date: string;
  instructorUserId: number;
  instructorName: string;
  lessonCount: number;
  totalKm: number;
  hasPetrolExpense: boolean;
  totalBenzinLiters: number;
  totalLpgLiters: number;
  avgKmPerLesson: number;
  avgBenzinPerLesson: number;
  avgLpgPerLesson: number;
};

export type PetrolFuelKmAnalyticsResponse = {
  items: PetrolFuelKmAnalyticsRow[];
};
