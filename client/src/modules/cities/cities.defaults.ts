import type { City } from "./city.types";

export const DEFAULT_CITIES: City[] = [
  { id: "city-yerevan", name: "Երևան" },
  { id: "city-masis", name: "Մասիս" },
];

export const DEFAULT_PRIMARY_CITY_ID = DEFAULT_CITIES[0]!.id;
