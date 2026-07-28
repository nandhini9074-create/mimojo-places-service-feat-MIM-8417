import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Category } from '../models/category.model';
import { Transaction, Op } from 'sequelize';
import { SubCategory } from 'src/sub-category/models/sub-category.model';
import { Filter } from 'src/filters/models/filter.model';
import { Sequelize } from 'sequelize-typescript';
import { generatePaginationObject, Pagination } from 'src/common/helpers/utils';
import { EnvKeysEnum } from 'config/env.enum';
import { CmsUpdateCategoryDto, FilterDTO } from '../dtos/cms-update-category.dto';
import { OutletFilters } from 'src/outlet/models/outlet-filters.model';
import { Outlet } from 'src/outlet/models/outlet.model';
import { OutletStatusEnum } from 'src/outlet/enums/outlet-status-enum';
import { OutletAddress } from 'src/outlet/models/outlet-address.model';
import { Neighbourhood } from 'src/neighbourhood/models/neighbourhood.model';
import { MerchantFilter } from '../../merchant-filters/entities/merchant-filters.model';
import { Merchant } from 'src/merchant/entities/merchant.model';
import { SortDto } from 'src/common/dtos/sort.dto';
import { PaginationDto } from 'src/common/dtos/pagenation.dto';
import { buildQueryOptions } from 'src/common/helpers/query-utils';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Filter) public readonly filterModel: typeof Filter,
    @InjectModel(MerchantFilter)
    public readonly merchantFilter: typeof MerchantFilter,
    @InjectConnection('default')
    private readonly sequelize: Sequelize,
    @InjectModel(Category) private readonly categoryModel: typeof Category,
    @InjectModel(SubCategory) private readonly subCategoryModel: typeof SubCategory,
    private readonly logger: CustomPinoLogger
  ) {}

  async insert(category: Category, transaction: Transaction) {
    await this.deleteByIds(category.id, transaction);
    return await this.categoryModel.create(category, { transaction });
  }

  async insertBulk(categories: Category[], transaction: Transaction) {
    await this.deleteByIds(
      categories.map(c => c.categoryId),
      transaction
    );
    return await this.categoryModel.bulkCreate(categories, { transaction });
  }

  async upsert(category: Category, transaction: Transaction) {
    return await this.categoryModel.upsert(category, { transaction });
  }

  async deleteByIds(ids: string[], transaction: Transaction) {
    await this.categoryModel.destroy({
      where: { categoryId: ids },
      transaction: transaction,
    });
  }

  async getAllCategories() {
    return await this.categoryModel.findAll({
      attributes: [['category_id', 'id'], 'name'],
    });
  }

  async getCategoryById(categoryId: string) {
    return await this.categoryModel.findOne({
      where: { categoryId: categoryId },
    });
  }
  async getSubCategories(categoryId: string, isConsumerApp: boolean) {
    let filters = [];
    if (isConsumerApp) {
      filters = [
        {
          attributes: [],
          model: SubCategory,
          required: true,
        },
        {
          attributes: [],
          model: Category,
          required: true,
        },
        {
          attributes: [],
          model: MerchantFilter,
          where: { included: true },
          required: true,
        },
      ];
    } else {
      filters = [
        {
          attributes: [],
          model: SubCategory,
          required: true,
        },
        {
          attributes: [],
          model: Category,
          required: true,
        },
      ];
    }
    return this.categoryModel.findByPk(categoryId, {
      attributes: [],
      include: [
        {
          model: Filter,
          attributes: [
            ['filter_id', 'id'],
            [Sequelize.literal('"filters"."name"'), 'filter'],
            [Sequelize.literal('"filters->subCategory"."name"'), 'subCategoryName'],
            [Sequelize.literal('"filters->subCategory"."name_ar"'), 'subCategoryNameAr'],
            [Sequelize.literal('"filters->subCategory"."type"'), 'type'],
            [Sequelize.literal('"filters->subCategory"."sub_category_id"'), 'subCategoryId'],
            [Sequelize.literal('"filters->category"."category_id"'), 'categoryId'],
          ],
          required: true,
          include: filters,
        },
      ],
    });
  }
  async getSubCategoriesHasOutlet(categoryId: string, cityId: string, preferredLanguage: string) {
    const includes = [
      {
        attributes: [],
        model: SubCategory,
        required: true,
      },
      {
        attributes: [],
        model: Category,
        required: true,
      },
      {
        attributes: [],
        model: OutletFilters,
        where: { included: true },
        required: true,
        include: [
          {
            model: Outlet,
            required: true,
            where: { status: OutletStatusEnum.Active },
            include: [],
          },
        ],
      },
    ];

    // Check if cityId is not null before adding the additional include
    if (cityId) {
      includes[2].include[0].include.push({
        model: OutletAddress,
        required: true,
        where: { isActive: true },
        include: [
          {
            model: Neighbourhood,
            required: true,
            where: { areaId: cityId },
          },
        ],
      });
    }

    let response = await this.categoryModel.findByPk(categoryId, {
      attributes: [],
      include: [
        {
          model: Filter,
          attributes: [
            ['filter_id', 'id'],
            [Sequelize.literal('"filters"."name"'), 'filter'],
            [Sequelize.literal('"filters"."name_ar"'), 'filterNameAr'],
            [Sequelize.literal('"filters->subCategory"."name"'), 'subCategoryName'],
            [Sequelize.literal('"filters->subCategory"."name_ar"'), 'subCategoryNameAr'],
            [Sequelize.literal('"filters->subCategory"."type"'), 'type'],
            [Sequelize.literal('"filters->subCategory"."sub_category_id"'), 'subCategoryId'],
            [Sequelize.literal('"filters->category"."category_id"'), 'categoryId'],
          ],
          required: true,
          include: includes,
        },
      ],
    });

    response?.dataValues?.filters.forEach(filter => {
      filter.dataValues['filter'] =
        preferredLanguage === 'ar' && filter.dataValues['filterNameAr']
          ? filter.dataValues['filterNameAr']
          : filter.dataValues['filter'];
      filter.dataValues['subCategoryName'] =
        preferredLanguage === 'ar' && filter.dataValues['subCategoryNameAr']
          ? filter.dataValues['subCategoryNameAr']
          : filter.dataValues['subCategoryName'];

      delete filter.dataValues['filterNameAr'];
      delete filter.dataValues['subCategoryNameAr'];
    });

    return response;
  }
  async findAll(
    preferredLanguage: string,
    sortDto?: SortDto,
    paginationDto?: PaginationDto,
    searchQuery?: string,
    user?: any
  ): Promise<{ data: Category[]; pagination: Pagination }> {
    try {
      const isFromMp = user?.type === 'MIMOJO_USER' ? true : false;
      const query = buildQueryOptions({
        searchQuery: searchQuery,
        sortDto: sortDto,
        paginationDto: paginationDto,
      });
      const mainQuery = query;
      const res = await this.categoryModel.findAll({
        ...query,
        attributes: [
          ['category_id', 'id'],
          'name',
          'nameAr',
          'imageUrl',
          'darkImageUrl',
          'isAnimated',
          'isNewCategory',
          'isVirtual',
          'updatedBy',
          'isBordered',
          'displayOrder',
          'createdAt',
          'updatedAt',
        ],
        ...(!isFromMp && { where: { showInCa: true } }),
        order: [['displayOrder', 'ASC']],
      });
      const totalCount = await this.categoryModel.count({
        ...mainQuery,
        attributes: [[Sequelize.literal(`COUNT(DISTINCT ("Category"."category_id"))`), 'count']],
      });
      const showEverythingCategoryId = process.env[EnvKeysEnum.SHOW_ME_EVERYTHING_CATEGORY_ID];
      const otherCategoryIcons = [];
      const showMeEverythingIcons = [];

      res.forEach((category: Category) => {
        if (showEverythingCategoryId) {
          const imageUrlElement = {
            imageUrl: category.imageUrl,
            darkImageUrl: category.darkImageUrl,
            isAnimated: category.isAnimated,
          };
          if (category?.dataValues?.id === showEverythingCategoryId) {
            showMeEverythingIcons.push(imageUrlElement);
          } else {
            otherCategoryIcons.push(imageUrlElement);
          }
        }
        category.dataValues['isShowMeEverything'] = false;
        category.dataValues.name =
          preferredLanguage === 'ar' && category.dataValues.nameAr ? category.dataValues.nameAr : category.dataValues.name;
        delete category.dataValues.nameAr;
      });

      const showEverythingCategory = res?.find(category => category?.dataValues?.id === showEverythingCategoryId);
      if (showEverythingCategory?.dataValues) {
        const imageUrls = [...showMeEverythingIcons, ...otherCategoryIcons];
        (showEverythingCategory.dataValues as Record<string, unknown>).imageUrls = imageUrls;
        (showEverythingCategory.dataValues as Record<string, unknown>).isShowMeEverything = true;
      }

      return {
        data: res,
        pagination: generatePaginationObject(
          { page: paginationDto.page, limit: paginationDto.limit },
          totalCount,
          res.length
        ),
      };
    } catch (error) {
      this.logger.error('CategoryService.findAll - exception', { error, searchQuery, sortDto, paginationDto });
      throw new HttpException(
        error?.response?.data?.message ?? 'Error fetching categories',
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  async getOverridableSubCategories(merchantId: string) {
    const merchant = await Merchant.findByPk(merchantId, {
      include: [
        {
          model: Filter,
          required: true,
          include: [
            {
              required: true,
              model: Category,
              where: {
                name: {
                  [Op.iLike]: '%food%',
                },
              },
            },
          ],
        },
      ],
    });
    if (!merchant) return [];
    return this.filterModel.findAll({
      where: {
        name: {
          [Op.iLike]: 'Preferences',
        },
      },
      attributes: [
        [Sequelize.literal('"Filter"."filter_id"'), 'id'],
        [Sequelize.literal('"Filter"."name"'), 'filter'],
        [Sequelize.literal('"subCategory"."name"'), 'subCategoryName'],
        [Sequelize.literal('"subCategory"."type"'), 'type'],
        [Sequelize.literal('"subCategory"."sub_category_id"'), 'subCategoryId'],
        [Sequelize.literal('"category"."category_id"'), 'categoryId'],
      ],
      include: [
        {
          attributes: [],
          model: SubCategory,
          where: {
            type: ['GOOD_FOR', 'TOGGLE'],
          },
          required: true,
        },
        {
          attributes: ['name', 'imageUrl'],
          model: Category,
          where: {
            name: {
              [Op.iLike]: '%food%',
            },
          },
          required: true,
        },
      ],
    });
  }
  async cmsFindAllCategories(sortDto: SortDto, paginationDto: PaginationDto, searchQuery: string) {
    //const builder = this.createBuilder(parsedRequestParams, { query: {} });
    //const builder = this.getManyBase(parsedRequestParams)
    const query = buildQueryOptions({
      searchQuery: searchQuery,
      sortDto: sortDto,
      paginationDto: paginationDto,
    });
    // count all categories
    const totalCount = await this.categoryModel.count({
      ...query,
      attributes: [[Sequelize.literal(`COUNT(DISTINCT ("Category"."category_id"))`), 'count']],
    });

    // find all ids to get with limit and offset
    const categoriesIds = await this.categoryModel.findAll({
      ...query,
      attributes: ['categoryId'],
      raw: true,
    });

    // with many to many relation
    delete query.offset;
    delete query.limit;
    const res = await this.categoryModel.findAll({
      ...query,
      attributes: [
        ['category_id', 'id'],
        'name',
        'nameAr',
        'imageUrl',
        'darkImageUrl',
        'isAnimated',
        'isNewCategory',
        'imageUrl',
        'isVirtual',
        'updatedBy',
        'isBordered',
        'displayOrder',
        'createdAt',
        'updatedAt',
      ],
      include: [
        {
          model: Filter,
          attributes: ['name', 'nameAr'],
        },
      ],
      where: { categoryId: categoriesIds.map(e => e.categoryId) },
      order: [['createdAt', 'DESC']],
    });

    return {
      data: res,
      pagination: generatePaginationObject(
        { page: paginationDto.page, limit: paginationDto.limit },
        totalCount,
        categoriesIds.length
      ),
    };
  }
  async cmsFindOneCategory(id: string) {
    return this.categoryModel.findByPk(id, {
      include: [
        {
          model: Filter,
          attributes: [['filter_id', 'id'], 'name'],
          include: [
            {
              attributes: [['sub_category_id', 'id'], 'type', 'name'],
              model: SubCategory,
            },
          ],
        },
      ],
      attributes: [
        ['category_id', 'id'],
        'name',
        'nameAr',
        'imageUrl',
        'darkImageUrl',
        'isAnimated',
        'isNewCategory',
        'isVirtual',
        'updatedBy',
        'isBordered',
        'displayOrder',
        'createdAt',
        'updatedAt',
      ],
    });
  }
  async cmsUpdateCategory(id: string, body: CmsUpdateCategoryDto, updatedBy: string) {
    await this.sequelize.transaction(async transaction => {
      await this.findOrFail({ where: { categoryId: id } });

      await this.categoryModel.update(
        {
          name: body.name,
          nameAr: body.nameAr ?? body.name,
          updatedBy,
        },
        {
          where: { categoryId: id },
          transaction,
        }
      );

      for (const filter of body.filters) {
        await this.handleFilterUpdate(filter, id, updatedBy, transaction);
      }
    });
  }
  private async handleFilterUpdate(filter: FilterDTO, categoryId: string, updatedBy: string, transaction: Transaction) {
    const filterObj = await this.filterModel.findByPk(filter.id, { transaction });
    if (!filterObj) throw new NotFoundException('Filter is not Found');

    const filterName = filterObj.name;
    const filterNameAr = filterObj.nameAr;

    switch (filter.subCategory.action) {
      case 'CREATE':
        await this.createSubCategoryAndFilter(filter, categoryId, filterName, filterNameAr, updatedBy, transaction);
        break;

      case 'UPDATE':
        await this.subCategoryModel.update(
          {
            name: filter.subCategory.name,
            nameAr: filter.subCategory.nameAr ?? filter.subCategory.name,
            updatedBy,
          },
          {
            where: { subCategoryId: filter.subCategory.id },
            transaction,
          }
        );
        break;

      case 'DELETE':
        await this.deleteSubCategoryIfUnused(filter, transaction);
        break;
    }
  }
  private async createSubCategoryAndFilter(
    filter: FilterDTO,
    categoryId: string,
    filterName: string,
    filterNameAr: string,
    updatedBy: string,
    transaction: Transaction
  ) {
    const newSubCategory = await this.subCategoryModel.create(
      {
        name: filter.subCategory.name,
        nameAr: filter.subCategory.nameAr ?? filter.subCategory.name,
        type: filter.subCategory.type,
        updatedBy,
      },
      { transaction }
    );

    await this.filterModel.create(
      {
        subCategoryId: newSubCategory.subCategoryId,
        categoryId,
        name: filterName,
        nameAr: filterNameAr ?? filterName,
        updatedBy,
      },
      { transaction }
    );
  }
  private async deleteSubCategoryIfUnused(filter: FilterDTO, transaction: Transaction) {
    await this.subCategoryModel.findByPk(filter.subCategory.id, {
      include: [Filter],
      transaction,
    });

    const merchantFilters = await this.merchantFilter.count({
      where: { filterId: filter.id },
    });

    if (merchantFilters > 0) {
      throw new HttpException('This value is used by other merchants and cannot be deleted', 400);
    }

    await this.filterModel.destroy({
      where: { filterId: filter.id },
      transaction,
    });

    const inUseSubCategory = await Filter.count({
      where: { subCategoryId: filter.subCategory.id },
    });

    if (inUseSubCategory <= 0) {
      await this.subCategoryModel.destroy({
        where: { subCategoryId: filter.subCategory.id },
        transaction,
      });
    }
  }
  async findOrFail(data) {
    return await this.categoryModel.findOne(data);
  }

  // async cmsUpdateCategory(id: string, body: CmsUpdateCategoryDto, updatedBy: string) {
  //   await this.sequelize.transaction(async (transaction) => {
  //     await this.findOrFail({ where: { id } });
  //     await this.categoryModel.update(
  //       { name: body.name, nameAr: body.nameAr ?? body.name, updatedBy },
  //       {
  //         where: {
  //           categoryId:id
  //         },
  //         transaction
  //       }
  //     );

  //     for (const element of body.filters) {
  //       const filter = element;
  //       const filterObj = await this.filterModel.findByPk(element.id, { transaction });
  //       if (!filterObj) throw new NotFoundException('Filter is not Found');
  //       const filterName = filterObj.name;
  //       const filterNameAr = filterObj.nameAr;
  //       if (filter.subCategory.action === 'CREATE') {
  //         const newSubCategory = await this.subCategoryModel.create(
  //           {
  //             name: filter.subCategory.name,
  //             nameAr: filter.subCategory.nameAr ?? filter.subCategory.name,
  //             type: filter.subCategory.type,
  //             updatedBy
  //           },
  //           { transaction }
  //         );
  //         await this.filterModel.create(
  //           {
  //             subCategoryId: newSubCategory.subCategoryId,
  //             categoryId: id,
  //             name: filterName,
  //             nameAr: filterNameAr ?? filterName,
  //             updatedBy
  //           },
  //           { transaction }
  //         );
  //       } else if (filter.subCategory.action === 'UPDATE') {
  //         await this.subCategoryModel.update(
  //           {
  //             name: filter.subCategory.name,
  //             nameAr: filter.subCategory.nameAr ?? filter.subCategory.name,
  //             updatedBy
  //           },
  //           {
  //             where: {
  //               subCategoryId: filter.subCategory.id
  //             },
  //             transaction
  //           }
  //         );
  //       } else if (filter.subCategory.action === 'DELETE') {
  //         await this.subCategoryModel.findByPk(filter.subCategory.id, {
  //           include: [Filter],
  //           transaction
  //         });
  //         const merchantFilters = await this.merchantFilter.count({
  //           where: {
  //             filterId: filter.id
  //           }
  //         });
  //         if (merchantFilters > 0)
  //           throw new HttpException(
  //             'This value is used by other merchants and cannot be deleted',
  //             400
  //           );
  //         await this.filterModel.destroy({
  //           where: {
  //             filterId: filter.id
  //           },
  //           transaction
  //         });
  //         const inUseSubCategory = await Filter.count({
  //           where: {
  //             subCategoryId: filter.subCategory.id
  //           }
  //         });
  //         if (inUseSubCategory <= 0)
  //           await this.subCategoryModel.destroy({
  //             where: {
  //               subCategoryId: filter.subCategory.id
  //             },
  //             transaction
  //           });
  //       }
  //     }
  //   });
  // }
}
