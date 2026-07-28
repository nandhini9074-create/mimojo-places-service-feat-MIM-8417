import { Op, WhereOptions } from 'sequelize';
import { PaginationDto } from '../dtos/pagenation.dto';
import { SortDto } from '../dtos/sort.dto';

interface QueryOptions<TAttributes> {
  searchQuery?: string;
  searchField?: string;
  paginationDto?: PaginationDto;
  sortDto?: SortDto;
  defaultSortField?: string;
  extraWhere?: WhereOptions<TAttributes>;
}
export interface QueryResult<TAttributes> {
  where: WhereOptions<TAttributes> | null;
  order: [string, string][];
  offset: number;
  limit: number;
}
export function buildQueryOptions<TAttributes = unknown>({
  searchQuery,
  searchField = 'name',
  paginationDto,
  sortDto,
  defaultSortField = 'createdAt',
  extraWhere = {},
}: QueryOptions<TAttributes>): QueryResult<TAttributes> {
  // Sorting logic
  let sortField = defaultSortField;
  let sortOrder = 'desc';
  if (sortDto?.sort?.length) {
    const [field, order] = sortDto.sort[0].split(',');
    sortField = field || defaultSortField;
    sortOrder = order || 'desc';
  }

  // Pagination logic
  let offset: number | undefined;
  let limit: number | undefined;
  if (paginationDto?.page && paginationDto?.limit) {
    offset = (paginationDto.page - 1) * paginationDto.limit;
    limit = paginationDto.limit;
  }

  // Search and where clause
  const where: WhereOptions<TAttributes> = { ...extraWhere };
  if (searchQuery) {
    where[searchField] = { [Op.iLike]: `%${searchQuery}%` };
  }

  return {
    where: Object.keys(where).length > 0 ? where : null,
    order: [[sortField, sortOrder]],
    offset,
    limit,
  };
}
