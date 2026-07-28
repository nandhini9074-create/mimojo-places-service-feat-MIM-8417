import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { snakeCase } from 'lodash';
import { FindOptions, Op, Sequelize } from 'sequelize';
import { Category } from 'src/category/models/category.model';
import { generatePaginationObject, Pagination } from 'src/common/helpers/utils';
import { Filter } from 'src/filters/models/filter.model';

import { GetAllMerchantsDto } from '../dtos/get-all-merchants.dto';
import { Merchant } from '../entities/merchant.model';
import { ProductEnum } from '../enums/merchant-listing-page.enum';
import { SortDto } from 'src/common/dtos/sort.dto';
import { PaginationDto } from 'src/common/dtos/pagenation.dto';
import { Literal } from 'sequelize/types/utils';
import { GenericHttpService } from 'src/http/generic-http.service';
import { EnvKeysEnum } from 'config/env.enum';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

interface MerchantAdmin {
  id: string;
  merchantUserLinks?: { merchantId: string; merchantUserId: string }[];
  [key: string]: unknown;
}

interface MerchantUserLink {
  merchantId: string;
  [key: string]: unknown;
}

interface MerchantUser {
  type?: string;
  id?: string;
  [key: string]: unknown;
}

@Injectable()
export class GroupMerchantService {
  constructor(
    @InjectModel(Merchant) private readonly merchantModel: typeof Merchant,
    private readonly logger: CustomPinoLogger,
    private readonly httpService: GenericHttpService
  ) {}

  private createBuilder(sortDto?: SortDto, paginationDto?: PaginationDto): FindOptions {
    const order: [string, string][] =
      sortDto?.sort?.length > 0
        ? sortDto.sort.map(sort => {
            const [field, direction] = sort.split(',');
            return [field, direction.toUpperCase()];
          })
        : [['createdAt', 'DESC']];
    const options: FindOptions = {
      where: {},
      order,
      include: [],
      subQuery: false,
    };
    if (paginationDto?.limit !== undefined && paginationDto?.page !== undefined) {
      options.limit = paginationDto.limit;
      options.offset = (paginationDto.page - 1) * paginationDto.limit;
    }
    return options;
  }

  async getAllMerchants(
    customFilters: GetAllMerchantsDto,
    sortDto: SortDto,
    paginationDto: PaginationDto,
    groupId: string,
    user: MerchantUser
  ): Promise<{ data: Record<string, unknown>[]; pagination: Pagination }> {
    try {
      this.logger.info(`filters`, {
        customFilters,
        sortDto,
        paginationDto,
      });
      const { salesOwners, categoriesIds, merchantStatus, search, country, product } = customFilters;
      const queryBuilder = this.createBuilder(sortDto, paginationDto);
      const defaultOrder = JSON.parse(JSON.stringify(queryBuilder.order));
      const mainQuery = queryBuilder;

      if (salesOwners?.length > 0)
        mainQuery.where = {
          ...mainQuery.where,
          salesPerson: {
            [Op.or]: salesOwners,
          },
        };

      if (country) {
        mainQuery.where = {
          ...mainQuery.where,
          '$Merchant.country$': {
            [Op.iLike]: '%' + country + '%',
          },
        };
      }

      if (groupId)
        mainQuery.where = {
          ...mainQuery.where,
          groupId,
        };
      if (user?.type === 'MERCHANT_USER' && user?.id) {
        const merchantUserLinks = await this.getMerchantUserLinks(user.id);
        if (merchantUserLinks.length) {
          const merchantIds = merchantUserLinks.map(m => m.merchantId);
          mainQuery.where = {
            ...mainQuery.where,
            id: merchantIds,
          };
        }
      }

      if (product?.length > 0) {
        if (product?.length === 1) {
          if (product[0] === ProductEnum.CIRCLE) {
            mainQuery.where = {
              ...mainQuery.where,
              isCircle: true,
            };
          }
        } else {
          mainQuery.where = {
            ...mainQuery.where,
            maxOfferValue: { [Op.gt]: 0 },
          };
        }
      }

      if (merchantStatus) {
        if (product?.length > 0) {
          if (product?.length === 1) {
            if (product[0] === ProductEnum.CIRCLE) {
              mainQuery.where = {
                ...mainQuery.where,
                fastPaymentStatus: merchantStatus,
              };
            } else if (product[0] === ProductEnum.CLO) {
              mainQuery.where = {
                ...mainQuery.where,
                status: merchantStatus,
              };
            }
          } else {
            mainQuery.where = {
              ...mainQuery.where,
              status: merchantStatus,
              fastPaymentStatus: merchantStatus,
            };
          }
        }
        mainQuery.where = {
          ...mainQuery.where,
          [Op.or]: { status: merchantStatus, fastPaymentStatus: merchantStatus },
        };
      }

      if (search)
        mainQuery.where = {
          ...mainQuery.where,
          [Op.and]: [
            {
              [Op.or]: {
                '$Merchant.name$': { [Op.iLike]: '%' + search + '%' },
                '$Merchant.sales_person$': { [Op.iLike]: '%' + search + '%' },
                '$filters.category.name$': { [Op.iLike]: '%' + search + '%' },
              },
            },
            mainQuery.where?.[Op.or] || {},
          ],
        };

      mainQuery.include = [
        {
          model: Filter,
          required: categoriesIds && categoriesIds.length > 0,
          through: {
            attributes: [],
          },
          attributes: [],
          include: [
            {
              model: Category,
              where: {
                categoryId: {
                  [Op.or]: categoriesIds && categoriesIds.length > 0 ? categoriesIds : [],
                },
              },
              attributes: [],
              required: categoriesIds && categoriesIds.length > 0,
            },
          ],
        },
      ];

      const totalCount = await this.merchantModel.count({
        ...mainQuery,
        attributes: [[Sequelize.literal(`COUNT(DISTINCT ("Merchant"."id"))`), 'count']],
      });

      const attr: [Literal, string][] = [];
      const modifiedOrder: (string | Literal)[][] = [...(mainQuery.order as [string, string][])];

      for (let i = 0; i < modifiedOrder.length; i++) {
        const field = modifiedOrder[i][0];
        if (typeof field === 'string' && (field === 'salesPerson' || field === 'name')) {
          const columnName = snakeCase(field);
          const sortLiteral = Sequelize.literal(`lower("Merchant"."${columnName}")`);
          attr.push([sortLiteral, `lower_${columnName}`]);
          modifiedOrder[i] = [sortLiteral, modifiedOrder[i][1]];
        }
      }

      const merchantIds = await this.merchantModel.findAll({
        ...mainQuery,
        order: modifiedOrder as FindOptions['order'],
        attributes: [
          [Sequelize.literal(`DISTINCT ("Merchant"."id")`), 'id'],
          'name',
          'active_outlets_num',
          'in_active_outlets_num',
          'sales_person',
          'created_at',
          ...attr,
        ],
        raw: true,
      });

      queryBuilder.include = [
        {
          model: Filter,
          required: false,
          attributes: ['name'],
          through: {
            attributes: [],
          },
          include: [
            {
              model: Category,
              attributes: ['name'],
              required: false,
            },
          ],
        },
      ];
      delete queryBuilder.offset;
      delete queryBuilder.limit;
      delete queryBuilder.order;

      const res = await this.merchantModel.findAll({
        ...queryBuilder,
        where: { id: merchantIds.map(e => e.id) },
        order: defaultOrder,
      });
      const newMerchantIds = res.map(e => e.id);
      const merchantAdmins = await this.getMerchantAdminDetails(newMerchantIds);
      const finalResponse = this.formatFinalResponse(res, merchantAdmins);
      return {
        data: finalResponse,
        pagination: generatePaginationObject(
          { page: paginationDto?.page, limit: paginationDto?.limit },
          totalCount,
          merchantIds.length
        ),
      };
    } catch (error) {
      this.logger.error('GroupMerchantService.getAllMerchants failed', { error });
      throw new HttpException(
        error?.response ?? 'Failed to fetch the group merchant details',
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async getMerchantAdminDetails(merchantIds: string[]): Promise<MerchantAdmin[]> {
    try {
      const response: {
        data: {
          data: MerchantAdmin[];
        };
      } = await this.httpService.post(`${process.env[EnvKeysEnum.MERCHANT_IDENTITY_URL]}/users/merchant-users`, {
        merchantIds,
      });
      return response?.data?.data;
    } catch (error) {
      this.logger.error(`GroupMerchantService.getMerchantAdminDetails failed`, { error });
      return [];
    }
  }

  private async getMerchantUserLinks(userId: string): Promise<MerchantUserLink[]> {
    try {
      const response: {
        data: {
          data: MerchantUserLink[];
        };
      } = await this.httpService.get(
        `${process.env[EnvKeysEnum.MERCHANT_IDENTITY_URL]}/merchants/merchant-user-links/${userId}`
      );
      return response?.data?.data;
    } catch (error) {
      this.logger.error(`GroupMerchantService.getMerchantUserLinks failed`, { error });
      return [];
    }
  }
  private formatFinalResponse(res: Merchant[], merchantAdmins: MerchantAdmin[]): Record<string, unknown>[] {
    const merchantAdminMap = new Map();
    const merchantUserLinkMap = new Map();
    merchantAdmins?.forEach(merchantAdmin => {
      merchantAdmin?.merchantUserLinks?.forEach(link => {
        if (!merchantAdminMap.has(link.merchantId)) {
          merchantAdminMap.set(link.merchantId, []);
        }
        merchantUserLinkMap.set(`${link.merchantId}-${link.merchantUserId}`, link);
        merchantAdminMap.get(link.merchantId).push(merchantAdmin);
      });
    });
    const final = res.map(merchant => {
      const adminsForThisMerchant = merchantAdminMap.get(merchant.id) || [];

      const clonedAdmins = adminsForThisMerchant?.map(admin => ({
        ...admin,
        merchantUserLinks: merchantUserLinkMap.get(`${merchant.id}-${admin.id}`) || null,
      }));

      return {
        ...merchant.toJSON(),
        merchantAdmin: clonedAdmins,
      };
    });
    return final;
  }
}
