import { Module } from '@nestjs/common';
import { AreaController } from './area.controller';
import { AreaService } from './services/area.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { Area } from 'src/area/models/area.model';
import { Neighbourhood } from 'src/neighbourhood/models/neighbourhood.model';
import { GooglePlacesModule } from 'src/google-places/places.module';
import { CustomLoggerModule } from 'src/logger/logger.module';
@Module({
    controllers: [AreaController],
    providers: [AreaService],
    imports: [
        GooglePlacesModule,
        SequelizeModule.forFeature([Area, Neighbourhood]),
        CustomLoggerModule      
    ],
    exports:[AreaService]
})

export class AreaModule { }