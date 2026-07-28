export interface GetManyBaseResponsePagination<T> {
  data: T[];
  pagination: {
    count: number;
    total: number;
    page: number;
    pageCount: number;
  };
}
