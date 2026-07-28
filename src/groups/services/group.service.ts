import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { PaginationDto } from 'src/common/dtos/pagenation.dto';
import { SortDto } from 'src/common/dtos/sort.dto';
import { ErrorMessages } from 'src/errors/error-messages';
import { GetAllMerchantsDto } from 'src/merchant/dtos/get-all-merchants.dto';
import { Merchant } from 'src/merchant/entities/merchant.model';
import { MerchantStatusEnum } from 'src/merchant/enums/merchant-status.enum';
import { GroupMerchantService } from 'src/merchant/shared/group-merchant.service';
import { CreateGroupDto } from '../dtos/create-group.dto';
import { UpdateGroupDto } from '../dtos/update-group.dto';
import { Group } from '../entities/group.model';
import { UpdateGroupLogoDto } from '../dtos/update-group-logo.dto';
import { GenericHttpService } from '../../http/generic-http.service';
import { EnvKeysEnum } from 'config/env.enum';
import { buildQueryOptions } from 'src/common/helpers/query-utils';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class GroupService {
  constructor(
    @InjectModel(Group) public readonly groupModel: Group & typeof Group,
    @InjectModel(Merchant) private readonly merchantModel: typeof Merchant,
    private readonly groupMerchantService: GroupMerchantService,
    private readonly sequelize: Sequelize,
    private readonly httpService: GenericHttpService,
    private readonly logger: CustomPinoLogger
  ) {}

  async create(createGroupDto: CreateGroupDto, updatedBy: string, transaction?: Transaction) {
    const [group] = await this.groupModel.findOrCreate({
      transaction: transaction ?? null,
      defaults: {
        name: createGroupDto.name,
        updatedBy,
      },
      where: {
        name: createGroupDto.name,
      },
    });

    await this.syncGroupWithCore(group);

    return group;
  }

  async findAllGroupWithMerchants(searchQuery: string, paginationDto: PaginationDto, sortDto: SortDto) {
    let sortField;
    let sortOrder;
    const { page, limit } = paginationDto;
    const offset = page && limit ? (page - 1) * limit : 0;
    if (sortDto?.sort?.length == 1) {
      sortOrder = sortDto.sort[0].split(',')[1] ? sortDto.sort[0].split(',')[1] : 'desc';
      sortField = sortDto.sort[0].split(',')[0] ? sortDto.sort[0].split(',')[0] : 'createdAt';
    } else {
      sortField = 'createdAt';
      sortOrder = 'desc';
    }
    const { count, rows } = await this.groupModel.findAndCountAll({
      where: searchQuery ? { name: { [Op.iLike]: `%${searchQuery}%` }, deletedAt: null } : null,
      order: [[sortField, sortOrder]],
      offset,
      limit,
    });
    const merchants = await this.merchantModel.findAll();
    const groupList = [];

    for (const group of rows) {
      let count = 0;
      for (const merchant of merchants) {
        if (merchant.groupId == group.id) {
          count = count + 1;
        }
      }
      groupList.push({
        id: group.id,
        name: group.name,
        logo: group.logo,
        createdAt: group.createdAt,
        merchantsCount: count,
      });
    }
    const pagination = this.pagination(page, limit, rows, count);
    return { data: groupList, pagination };
  }

  async getGroupDetails(
    customFilters: GetAllMerchantsDto,
    groupId: string,
    sortDto?: SortDto,
    paginationDto?: PaginationDto
  ): Promise<{ id: string; name: string; nameAr: string; logo: string; merchants: unknown } | unknown[]> {
    const group = await this.groupModel.findOne({ where: { id: groupId, deletedAt: null } });
    if (group) {
      const merchantsWithGroup = await this.groupMerchantService.getAllMerchants(
        customFilters,
        sortDto,
        paginationDto,
        groupId,
        null
      );

      return {
        id: group.id,
        name: group.name,
        nameAr: group.nameAr ?? group.name,
        logo: group.logo,
        merchants: merchantsWithGroup,
      };
    }
    return [];
  }

  async insert(createGroupDto: CreateGroupDto, updatedBy: string) {
    try {
      let group;
      await this.sequelize.transaction(async transaction => {
        [group] = await this.groupModel.findOrCreate({
          defaults: {
            name: createGroupDto.name,
            nameAr: createGroupDto.nameAr ?? createGroupDto.name,
            updatedBy,
          },
          where: {
            name: createGroupDto.name,
            deletedAt: null,
          },
          transaction,
        });

        for (const merchantId of createGroupDto.merchantIds) {
          await this.merchantModel.update(
            { groupId: group.id, updatedBy },
            {
              where: {
                id: merchantId,
              },
              returning: true,
              transaction,
            }
          );
        }
      });

      await this.syncGroupWithCore(group);

      return group;
    } catch (error) {
      throw new HttpException(ErrorMessages.group.groupInsertion, HttpStatus.BAD_REQUEST);
    }
  }

  private async syncGroupWithCore(group: { id: string; name: string; nameAr?: string; logo?: string }) {
    const groupBody = {
      groupId: group.id,
      groupName: group.name,
      groupNameAr: group.nameAr ?? group.name,
      groupLogo: group.logo,
      categoryLogo: process.env[EnvKeysEnum.FNB_CATEGORY_LOGO],
      categoryId: process.env[EnvKeysEnum.FNB_CATEGORY_ID],
      categoryName: process.env[EnvKeysEnum.FNB_CATEGORY_NAME],
    };
    await this.httpService.post(`${process.env[EnvKeysEnum.CORE_PAYOUT_URL]}/merchant-outlet/group`, groupBody);
  }

  async delete(groupId: string, updatedBy: string) {
    await this.sequelize.transaction(async transaction => {
      const merchants = await this.merchantModel.findAll({
        where: {
          groupId,
        },
      });

      let flag = false;
      merchants?.forEach(async merchant => {
        if (merchant.status == MerchantStatusEnum.ACTIVE) {
          flag = true;
        }
      });

      if (!flag) {
        await this.groupModel.destroy({
          where: {
            id: groupId,
          },
          transaction,
        });

        await this.merchantModel.update(
          {
            groupId: null,
            updatedBy,
          },
          {
            where: {
              groupId,
            },
            returning: true,
            transaction,
          }
        );
      } else {
        throw new HttpException(ErrorMessages.group.groupDeletionFailedMerchantActive, HttpStatus.BAD_REQUEST);
      }
    });
  }

  async update(updateGroupDto: UpdateGroupDto, updatedBy: string) {
    try {
      await this.sequelize.transaction(async transaction => {
        updateGroupDto?.detachMerchantIds?.forEach(async merchantId => {
          await this.merchantModel.update(
            {
              groupId: null,
              updatedBy,
            },
            {
              where: {
                id: merchantId,
              },
              transaction,
            }
          );
        });

        updateGroupDto?.attachMerchantIds?.forEach(async merchantId => {
          await this.merchantModel.update(
            {
              groupId: updateGroupDto.id,
              updatedBy,
            },
            {
              where: {
                id: merchantId,
              },
              transaction,
            }
          );
        });

        await this.groupModel.update(
          {
            name: updateGroupDto.name,
            nameAr: updateGroupDto.nameAr ?? updateGroupDto.name,
            updatedBy,
          },
          { where: { id: updateGroupDto.id, deletedAt: null }, transaction }
        );

        const group = await this.groupModel.findOne({ where: { id: updateGroupDto.id } });
        const dto = {
          id: updateGroupDto.id,
          name: updateGroupDto.name,
          nameAr: updateGroupDto.nameAr ?? updateGroupDto.name,
          logo: group?.logo,
        };
        await this.syncGroupWithCore(dto);
      });
    } catch (err) {
      throw new HttpException(ErrorMessages.group.groupUpdation, HttpStatus.BAD_REQUEST);
    }
  }

  async updateLogo(updateGroupLogoDto: UpdateGroupLogoDto, updatedBy: string) {
    try {
      await this.groupModel.update(
        {
          logo: updateGroupLogoDto.url,
          updatedBy,
        },
        { where: { id: updateGroupLogoDto.id, deletedAt: null } }
      );
    } catch (err) {
      throw new HttpException(ErrorMessages.group.groupUpdation, HttpStatus.BAD_REQUEST);
    }
  }

  private pagination(page: number, limit: number, rows: Group[], count: number) {
    if (page && limit) {
      const totalPages = Math.ceil(count / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;
      return {
        page,
        pageCount: totalPages,
        total: count,
        count: rows.length,
        hasNextPage,
        hasPreviousPage,
      };
    }
  }
  async findGroup(query: Record<string, unknown>) {
    return await this.groupModel.findOne(query);
  }
  async findAll(sortDto?: SortDto, paginationDto?: PaginationDto, searchQuery?: string) {
    try {
      const query = buildQueryOptions({
        searchQuery: searchQuery,
        paginationDto: paginationDto,
        sortDto: sortDto,
      });
      return await this.groupModel.findAll(query);
    } catch (error) {
      this.logger.error('GroupService.findAll', { error });
      throw new HttpException('Failed to fetch the group details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
