import type { ArmeniaRegion, PracticalLessonType, YerevanDistrict } from "src/modules/instructors/instructor-booking";

export type Instructor = {
  id: string;
  name: string;
  email: string;
  phone: string;
  years: number;
  rating: number;
  hourlyPrice: number;
  status: "active" | "inactive";
  schedule: string;
  location: string;
  car: string;
  transmission: string;
  imageSrc: string;
  availableRegions: ArmeniaRegion[];
  availableYerevanDistricts?: YerevanDistrict[];
  lessonTypes: PracticalLessonType[];
  /** Behind-the-wheel / practical driving lessons */
  teachesPractical: boolean;
  /** Classroom / online theory instruction */
  teachesTheory: boolean;
};

export const instructors: Instructor[] = [
  {
    id: "INS-001",
    name: "Armen Petrosyan",
    email: "armen.p@vivadrive.am",
    phone: "+374 99 111 111",
    years: 12,
    rating: 4.9,
    hourlyPrice: 7000,
    status: "active",
    schedule: "Mon-Sat",
    location: "Yerevan",
    car: "Toyota Corolla",
    transmission: "Manual",
    imageSrc: "/logo.jpg",
    availableRegions: ["Yerevan", "Kotayk"],
    availableYerevanDistricts: ["Ajapnyak", "Davtashen", "Kentron"],
    lessonTypes: ["exam", "city"],
    teachesPractical: true,
    teachesTheory: false,
  },
  {
    id: "INS-002",
    name: "Narine Hovhannisyan",
    email: "narine.h@vivadrive.am",
    phone: "+374 77 222 222",
    years: 8,
    rating: 4.8,
    hourlyPrice: 6500,
    status: "active",
    schedule: "Mon-Fri",
    location: "Yerevan",
    car: "Kia Rio",
    transmission: "Automatic",
    imageSrc: "/logo.jpg",
    availableRegions: ["Yerevan", "Ararat"],
    availableYerevanDistricts: ["Arabkir", "Kentron", "Nor Nork"],
    lessonTypes: ["exam"],
    teachesPractical: true,
    teachesTheory: true,
  },
  {
    id: "INS-003",
    name: "Vardan Grigoryan",
    email: "vardan.g@vivadrive.am",
    phone: "+374 55 333 333",
    years: 15,
    rating: 5.0,
    hourlyPrice: 8000,
    status: "active",
    schedule: "Tue-Sun",
    location: "Yerevan",
    car: "Kia Cerato",
    transmission: "Automatic",
    imageSrc: "/logo.jpg",
    availableRegions: ["Yerevan", "Armavir", "Aragatsotn"],
    availableYerevanDistricts: ["Erebuni", "Shengavit", "Malatia-Sebastia"],
    lessonTypes: ["city"],
    teachesPractical: true,
    teachesTheory: false,
  },
  {
    id: "INS-004",
    name: "Lilit Sargsyan",
    email: "lilit.s@vivadrive.am",
    phone: "+374 91 444 444",
    years: 6,
    rating: 4.7,
    hourlyPrice: 6000,
    status: "active",
    schedule: "Mon-Fri",
    location: "Yerevan",
    car: "Nissan Versa",
    transmission: "Automatic",
    imageSrc: "/logo.jpg",
    availableRegions: ["Yerevan"],
    availableYerevanDistricts: ["Avan", "Nor Nork", "Nork-Marash"],
    lessonTypes: [],
    teachesPractical: false,
    teachesTheory: true,
  },
  {
    id: "INS-005",
    name: "Hovhannes Mkrtchyan",
    email: "hov.m@vivadrive.am",
    phone: "+374 95 555 555",
    years: 10,
    rating: 4.9,
    hourlyPrice: 7200,
    status: "inactive",
    schedule: "Mon-Sat",
    location: "Yerevan",
    car: "Hyundai Elantra",
    transmission: "Manual",
    imageSrc: "/logo.jpg",
    availableRegions: ["Yerevan", "Lori"],
    availableYerevanDistricts: ["Kentron", "Arabkir"],
    lessonTypes: ["exam", "city"],
    teachesPractical: true,
    teachesTheory: true,
  },
];
