import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BookmarkOutletService } from './services/bookmark-outlet.service';
import { BookmarkOutlet } from './models/bookmark-outlet.model';
@Module({
    providers: [BookmarkOutletService],
    imports: [
        SequelizeModule.forFeature([BookmarkOutlet])        
    ],
    exports:[BookmarkOutletService]
})

export class BookmarkOutletModule { }