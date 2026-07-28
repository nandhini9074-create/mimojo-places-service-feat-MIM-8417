import { Global, Module } from '@nestjs/common';
import { GenericHttpService } from './generic-http.service';
import { HttpModule } from '@nestjs/axios';
import { CustomLoggerModule } from 'src/logger/logger.module';

@Global()
@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 10000,
        maxRedirects: 5
      })
    }),
    CustomLoggerModule
  ],
  providers: [GenericHttpService],
  exports: [GenericHttpService]
})
export class GenericHttpModule {}
