import { ProductEnum } from 'src/merchant/enums/merchant-listing-page.enum';
import { MerchantStatusEnum } from 'src/merchant/enums/merchant-status.enum';

export function sortExampleDto() {
  return {
    name: 'sort[]',
    type: String,
    isArray: true,
    required: false,
    example: 'coffee',
    description: 'Sort order. Example: ?sort[]=name,ASC&sort[]=createdAt,DESC'
  };
}

export function getAllMerchantsExampleDto() {
  return [
    {
      name: 'salesOwners',
      type: String,
      isArray: true,
      required: false,
      example: ['owner-123', 'owner-456'],
      description: 'List of sales owner IDs'
    },
    {
      name: 'categoriesIds',
      type: String,
      isArray: true,
      required: false,
      example: ['Food & Drink', 'Retail'],
      description: 'List of category IDs to filter merchants'
    },
    {
      name: 'merchantStatus',
      type: String,
      isArray: false,
      required: false,
      enum: Object.values(MerchantStatusEnum),
      description: 'Filter merchants by status'
    },
    {
      name: 'search',
      type: String,
      isArray: false,
      required: false,
      example: 'coffee',
      description: 'Search merchants by keyword'
    },
    {
      name: 'country',
      type: String,
      isArray: false,
      required: false,
      example: 'AE',
      description: 'Country code to filter merchants'
    },
    {
      name: 'product',
      type: 'string',
      isArray: true,
      required: false,
      enum: Object.values(ProductEnum),
      description: `Filter by products offered by merchants. Enter one or more of the following values: ${Object.values(ProductEnum).join(', ')}`
    }
  ];
}

export function paginationExampleDto() {
  return [
    {
      name: 'page',
      type: Number,
      isArray: false,
      required: false,
      example: 1,
      description: 'Page number for pagination'
    },
    {
      name: 'limit',
      type: Number,
      isArray: false,
      required: false,
      example: 10,
      description: 'Number of items per page'
    }
  ];
}
