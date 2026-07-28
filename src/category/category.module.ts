import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CategoryService } from './services/category.service';
import { Category } from './models/category.model';
import { MerchantFilter } from '../merchant-filters/entities/merchant-filters.model';
import { Filter } from 'src/filters/models/filter.model';
import { CMSCategoriesController } from './controllers/cms-categories.controller';
import { CategoriesController } from './controllers/categories.controller';
import { SubCategory } from 'src/sub-category/models/sub-category.model';
import { CustomLoggerModule } from 'src/logger/logger.module';
@Module({
    controllers: [CategoriesController, CMSCategoriesController],
    providers: [CategoryService],
    imports: [
        SequelizeModule.forFeature([Category,MerchantFilter,Filter,SubCategory]),
        CustomLoggerModule
    ],
    exports:[CategoryService]
})

export class CategoryModule { }