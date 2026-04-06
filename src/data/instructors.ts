export type Instructor = {
  name: string;
  years: number;
  students: number;
  rating: number;
  hourlyPrice: number;
  location: string;
  car: string;
  transmission: string;
  imageSrc: string;
  specialties: string[];
  /** Behind-the-wheel / practical driving lessons */
  teachesPractical: boolean;
  /** Classroom / online theory instruction */
  teachesTheory: boolean;
};

export const instructors: Instructor[] = [
  {
    name: "Armen Petrosyan",
    years: 12,
    students: 340,
    rating: 4.9,
    hourlyPrice: 7000,
    location: "Yerevan",
    car: "Toyota Corolla",
    transmission: "Manual",
    imageSrc: "/logo.jpg",
    specialties: ["City Driving", "Highway", "Night Driving"],
    teachesPractical: true,
    teachesTheory: false,
  },
  {
    name: "Narine Hovhannisyan",
    years: 8,
    students: 210,
    rating: 4.8,
    hourlyPrice: 6500,
    location: "Yerevan",
    car: "Kia Rio",
    transmission: "Automatic",
    imageSrc: "/logo.jpg",
    specialties: ["Beginners", "Theory", "Exam Prep"],
    teachesPractical: true,
    teachesTheory: true,
  },
  {
    name: "Vardan Grigoryan",
    years: 15,
    students: 420,
    rating: 5.0,
    hourlyPrice: 8000,
    location: "Yerevan",
    car: "Kia Cerato",
    transmission: "Automatic",
    imageSrc: "/logo.jpg",
    specialties: ["All Levels", "Night Driving", "Refresher"],
    teachesPractical: true,
    teachesTheory: false,
  }
];
