import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomPinoLogger } from './logger/custom-logger.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: AppService;
  let logger: CustomPinoLogger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: CustomPinoLogger,
          useValue: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
    logger = module.get<CustomPinoLogger>(CustomPinoLogger);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getHello returns app service response and logs', () => {
    const result = controller.getHello();
    expect(result).toBe('Hello World!');
    expect(logger.info).toHaveBeenCalledWith('Places service');
  });
});
