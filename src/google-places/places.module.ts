import { Module } from '@nestjs/common';
import { GooglePlacesController } from './places.controller';
import { GooglePlacesService } from './services/google-places.service';
import { CustomLoggerModule } from 'src/logger/logger.module';
@Module({
    controllers: [GooglePlacesController],
    providers: [GooglePlacesService],
    exports:[GooglePlacesService],
    imports: [CustomLoggerModule]
})

export class GooglePlacesModule { }