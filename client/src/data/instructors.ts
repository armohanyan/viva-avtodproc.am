export type Instructor = {
  id: string;
  name: string;
  email: string;
  phone: string;
  years: number;
  rating: number;
  hourlyPrice: number;
  status: "active" | "inactive";
  car: string;
  transmission: string;
  imageSrc: string;
  /** Branch IDs (from branch directory) this instructor can teach at */
  availableBranchIds: string[];
  /** Behind-the-wheel / practical driving lessons */
  teachesPractical: boolean;
  /** Classroom / online theory instruction */
  teachesTheory: boolean;
  /** When > 0, public rating is averaged from student reviews (admin cannot override the number). */
  studentRatingCount?: number;
  /** Fleet vehicle ids (`fleet_car_instructors`) assigned to this instructor. */
  fleetCarIds?: number[];
  /** Admin list only (staff token): invitation/setup email can still be sent. */
  inviteEligible?: boolean;
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
    car: "Toyota Corolla",
    transmission: "Manual",
    imageSrc: "/logo.jpg",
    availableBranchIds: ["br-garegin-8", "br-azatamart-75"],
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
    car: "Kia Rio",
    transmission: "Automatic",
    imageSrc: "/logo.jpg",
    availableBranchIds: ["br-garegin-8", "br-azatamart-75", "br-masis-125"],
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
    car: "Kia Cerato",
    transmission: "Automatic",
    imageSrc: "/logo.jpg",
    availableBranchIds: ["br-garegin-8", "br-azatamart-75"],
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
    car: "Nissan Versa",
    transmission: "Automatic",
    imageSrc: "/logo.jpg",
    availableBranchIds: [],
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
    car: "Hyundai Elantra",
    transmission: "Manual",
    imageSrc: "/logo.jpg",
    availableBranchIds: ["br-garegin-8", "br-azatamart-75"],
    teachesPractical: true,
    teachesTheory: true,
  },
];
