import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SubCategory } from './models/sub-category.model';
import { SubCategoryService } from './services/sub-category.service';
import { SubCategoriesController } from './controllers/sub-categories.controller';
@Module({
    controllers:[SubCategoriesController],
    providers: [SubCategoryService],
    imports: [
        SequelizeModule.forFeature([SubCategory])        
    ],
    exports:[SubCategoryService]
})

export class SubCategoryModule { }