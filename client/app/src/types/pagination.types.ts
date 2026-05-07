/** Standard paginated list envelope from API list endpoints. */
export type PaginatedList<TItem> = {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
};
