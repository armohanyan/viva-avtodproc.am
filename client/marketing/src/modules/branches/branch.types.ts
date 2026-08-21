export type Branch = {
  id: string;
  /** City from the cities directory */
  cityId: string;
  /** Street / address line */
  name: string;
  /** Short label shown next to instructor names in driving grids */
  label?: string;
  mapUrl: string;
  phone?: string;
  email?: string;
  workHours?: string;
};
