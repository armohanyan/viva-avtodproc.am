export const ARMENIA_REGIONS = [
  "Yerevan",
  "Aragatsotn",
  "Ararat",
  "Armavir",
  "Gegharkunik",
  "Kotayk",
  "Lori",
  "Shirak",
  "Syunik",
  "Tavush",
  "Vayots Dzor",
] as const;

export const YEREVAN_DISTRICTS = [
  "Ajapnyak",
  "Arabkir",
  "Avan",
  "Davtashen",
  "Erebuni",
  "Kentron",
  "Malatia-Sebastia",
  "Nor Nork",
  "Nork-Marash",
  "Nubarashen",
  "Shengavit",
] as const;

export const PRACTICAL_LESSON_TYPES = ["exam", "city"] as const;

export type ArmeniaRegion = (typeof ARMENIA_REGIONS)[number];
export type YerevanDistrict = (typeof YEREVAN_DISTRICTS)[number];
export type PracticalLessonType = (typeof PRACTICAL_LESSON_TYPES)[number];

const REGION_LABELS: Record<ArmeniaRegion, string> = {
  Yerevan: "Երևան",
  Aragatsotn: "Արագածոտն",
  Ararat: "Արարատ",
  Armavir: "Արմավիր",
  Gegharkunik: "Գեղարքունիք",
  Kotayk: "Կոտայք",
  Lori: "Լոռի",
  Shirak: "Շիրակ",
  Syunik: "Սյունիք",
  Tavush: "Տավուշ",
  "Vayots Dzor": "Վայոց ձոր",
};

const YEREVAN_DISTRICT_LABELS: Record<YerevanDistrict, string> = {
  Ajapnyak: "Աջափնյակ",
  Arabkir: "Արաբկիր",
  Avan: "Ավան",
  Davtashen: "Դավթաշեն",
  Erebuni: "Էրեբունի",
  Kentron: "Կենտրոն",
  "Malatia-Sebastia": "Մալաթիա-Սեբաստիա",
  "Nor Nork": "Նոր Նորք",
  "Nork-Marash": "Նորք-Մարաշ",
  Nubarashen: "Նուբարաշեն",
  Shengavit: "Շենգավիթ",
};

export type InstructorFilterInput = {
  region: ArmeniaRegion | "";
  lessonType: PracticalLessonType | "";
  districts?: readonly YerevanDistrict[];
};

type InstructorForPracticalBooking = {
  teachesPractical: boolean;
  availableRegions: ArmeniaRegion[];
  availableYerevanDistricts?: YerevanDistrict[];
  lessonTypes: PracticalLessonType[];
};

export function getLessonTypeLabel(type: PracticalLessonType): string {
  return type === "exam" ? "քննական" : "քաղաքային";
}

export function getRegionLabel(region: ArmeniaRegion): string {
  return REGION_LABELS[region];
}

export function getYerevanDistrictLabel(district: YerevanDistrict): string {
  return YEREVAN_DISTRICT_LABELS[district];
}

export function filterInstructorsForPracticalBooking(
  source: readonly InstructorForPracticalBooking[],
  input: InstructorFilterInput,
): InstructorForPracticalBooking[] {
  const selectedDistricts = new Set(input.districts ?? []);
  return source.filter((instructor) => {
    if (!instructor.teachesPractical) return false;
    if (!input.region || !input.lessonType) return false;
    if (!instructor.availableRegions.includes(input.region)) return false;
    if (!instructor.lessonTypes.includes(input.lessonType)) return false;

    if (input.region !== "Yerevan") return true;

    if (selectedDistricts.size === 0) return false;
    const districts = instructor.availableYerevanDistricts ?? [];
    return districts.some((district) => selectedDistricts.has(district));
  });
}

export function validatePracticalBookingSelection(input: InstructorFilterInput): string[] {
  const errors: string[] = [];

  if (!input.lessonType) errors.push("lessonType");
  if (!input.region) errors.push("region");

  if (input.region === "Yerevan" && (!input.districts || input.districts.length === 0)) {
    errors.push("districts");
  }

  return errors;
}
