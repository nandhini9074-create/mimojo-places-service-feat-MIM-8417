import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { SubCategory } from "../models/sub-category.model";
import { Transaction } from "sequelize";
import { buildQueryOptions } from "src/common/helpers/query-utils";
import { SortDto } from "src/common/dtos/sort.dto";
import { PaginationDto } from "src/common/dtos/pagenation.dto";


@Injectable()
export class SubCategoryService  {
    constructor(@InjectModel(SubCategory)
    private readonly subCategoryModel: typeof SubCategory) {
     }

    async insert(subCategories: SubCategory[], transaction: Transaction) {
        await this.deleteByIds(subCategories.map(sc => sc.subCategoryId), transaction);
        return this.subCategoryModel.bulkCreate(subCategories, { transaction });
    }

    async upsert(subCategory: SubCategory, transaction: Transaction) {
        return await this.subCategoryModel.upsert(subCategory, { transaction });
    }

    async deleteByIds(ids: string[], transaction: Transaction) {
        await this.subCategoryModel.destroy({
            where:{subCategoryId: ids},
            transaction: transaction
        });
    }
    async findAll(sortDto:SortDto,paginationDto:PaginationDto,search:string) {
        const query = buildQueryOptions({
            sortDto,
            paginationDto,
            searchQuery:search
        })
        return await this.subCategoryModel.findAll(query)
      }
}