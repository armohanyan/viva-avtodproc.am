export type Branch = {
  id: string;
  /** City from the cities directory */
  cityId: string;
  /** Street / address line */
  name: string;
  mapUrl: string;
  phone?: string;
  email?: string;
  workHours?: string;
};
