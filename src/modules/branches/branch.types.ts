export type Branch = {
  id: string;
  name: string;
  mapUrl: string;
  /** Branch-specific phone(s); shown on contact surfaces when set */
  phone?: string;
  email?: string;
  workHours?: string;
};
