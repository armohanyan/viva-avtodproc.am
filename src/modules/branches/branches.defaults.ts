import type { Branch } from "./branch.types";

/** Seed data aligned with the public Contact page locations */
export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: "br-garegin-8",
    name: "Գարեգին Նժդեհ 8",
    mapUrl:
      "https://maps.google.com/maps?q=%D4%B3%D5%A1%D6%80%D5%A5%D5%A3%D5%AB%D5%B6%20%D5%86%D5%AA%D5%A4%D5%A5%D5%B0%208%2C%20Yerevan&z=16&output=embed",
    phone: "+374 10 123 456",
    email: "info@vivadrive.am",
    workHours: "Mon–Fri: 9:00–18:00; Sat: 9:00–15:00",
  },
  {
    id: "br-azatamart-75",
    name: "Ազատամարտիկների 75/1",
    mapUrl:
      "https://maps.google.com/maps?q=%D4%B1%D5%A6%D5%A1%D5%BF%D5%A1%D5%B4%D5%A1%D6%80%D5%BF%D5%AB%D5%AF%D5%B6%D5%A5%D6%80%D5%AB%2075%2F1%2C%20Yerevan&z=16&output=embed",
    phone: "+374 99 123 456",
    email: "support@vivadrive.am",
    workHours: "Mon–Fri: 9:00–18:00",
  },
  {
    id: "br-masis-125",
    name: "Ք.Մասիս Երևանյան 125",
    mapUrl:
      "https://maps.google.com/maps?q=%D5%94.%D5%84%D5%A1%D5%BD%D5%AB%D5%BD%20%D4%B5%D6%80%D6%87%D5%A1%D5%B6%D5%B5%D5%A1%D5%B6%20125&z=16&output=embed",
    phone: "+374 10 123 456",
    email: "info@vivadrive.am",
    workHours: "Mon–Fri: 9:00–18:00; Sat: 9:00–15:00",
  },
];

export const DEFAULT_PRIMARY_BRANCH_ID = DEFAULT_BRANCHES[0]!.id;
