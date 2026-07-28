import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { FavoriteOutletService } from './services/favorite-outlet.service';
import { FavoriteOutlet } from './models/favorite-outlet.model';
@Module({
    providers: [FavoriteOutletService],
    imports: [
        SequelizeModule.forFeature([FavoriteOutlet])        
    ],
    exports:[FavoriteOutletService]
})

export class FavoriteOutletModule { }