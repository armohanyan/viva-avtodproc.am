import type { ArmeniaRegion, PracticalLessonType, YerevanDistrict } from "src/modules/instructors/instructor-booking";

export type Instructor = {
  id: string;
  name: string;
  email: string;
  phone: string;
  years: number;
  students: number;
  rating: number;
  hourlyPrice: number;
  status: "active" | "inactive";
  schedule: string;
  location: string;
  car: string;
  transmission: string;
  imageSrc: string;
  specialties: string[];
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
    students: 340,
    rating: 4.9,
    hourlyPrice: 7000,
    status: "active",
    schedule: "Mon-Sat",
    location: "Yerevan",
    car: "Toyota Corolla",
    transmission: "Manual",
    imageSrc: "/logo.jpg",
    specialties: ["City Driving", "Highway", "Night Driving"],
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
    students: 210,
    rating: 4.8,
    hourlyPrice: 6500,
    status: "active",
    schedule: "Mon-Fri",
    location: "Yerevan",
    car: "Kia Rio",
    transmission: "Automatic",
    imageSrc: "/logo.jpg",
    specialties: ["Beginners", "Theory", "Exam Prep"],
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
    students: 420,
    rating: 5.0,
    hourlyPrice: 8000,
    status: "active",
    schedule: "Tue-Sun",
    location: "Yerevan",
    car: "Kia Cerato",
    transmission: "Automatic",
    imageSrc: "/logo.jpg",
    specialties: ["All Levels", "Night Driving", "Refresher"],
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
    students: 175,
    rating: 4.7,
    hourlyPrice: 6000,
    status: "active",
    schedule: "Mon-Fri",
    location: "Yerevan",
    car: "Nissan Versa",
    transmission: "Automatic",
    imageSrc: "/logo.jpg",
    specialties: ["Theory", "Signs", "Beginner Support"],
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
    students: 290,
    rating: 4.9,
    hourlyPrice: 7200,
    status: "inactive",
    schedule: "Mon-Sat",
    location: "Yerevan",
    car: "Hyundai Elantra",
    transmission: "Manual",
    imageSrc: "/logo.jpg",
    specialties: ["Exam Prep", "Manual Transmission"],
    availableRegions: ["Yerevan", "Lori"],
    availableYerevanDistricts: ["Kentron", "Arabkir"],
    lessonTypes: ["exam", "city"],
    teachesPractical: true,
    teachesTheory: true,
  },
];
