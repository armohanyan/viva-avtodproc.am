export type InstructorKmLogRow = {
  id: number;
  instructorUserId: number;
  instructorName: string;
  date: string;
  km: number;
  createdAt: string;
  updatedAt: string;
  createdByUserId: number | null;
  createdByName: string | null;
};

export type InstructorKmLogListResponse = {
  items: InstructorKmLogRow[];
};

export type InstructorKmLogBody = {
  instructorUserId: number;
  date: string;
  km: number;
};
