import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { CustomPinoLogger } from "./logger/custom-logger.service";
import { ApiExcludeController } from "@nestjs/swagger";

@ApiExcludeController()
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly logger: CustomPinoLogger,
  ) {}

  @Get()
  getHello(): string {
    this.logger.info("Places service");
    return this.appService.getHello();
  }
}
