import { TestingModule, Test } from "@nestjs/testing";
import { DistanceController } from "../distance.controller";
import { DistanceRequestDto } from "../dtos/distance-req-dto";
import { DistanceResponseDto } from "../dtos/distance-res-dto";
import { DistanceService } from "../services/distance.service";

describe('DistanceController', () => {
    let controller: DistanceController;
    let service: DistanceService;

    const mockDistanceService = {
        calculateDistances: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DistanceController],
            providers: [
                {
                    provide: DistanceService,
                    useValue: mockDistanceService,
                },
            ],
        }).compile();

        controller = module.get<DistanceController>(DistanceController);
        service = module.get<DistanceService>(DistanceService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('calculateDistances', () => {
        it('should return distance result from service', () => {
            const reqDto: DistanceRequestDto = {
                destinations: [
                    { lat: 13.0827, lon: 80.2707 },
                    { lat: 17.3850, lon: 78.4867 },
                ],
                source: {
                    lat: 0,
                    lon: 0
                }
            };

            const resDto: DistanceResponseDto = {
                source: { lat: 12.9716, lon: 77.5946 },
                destinations: [
                    {
                        coordinate: { lat: 13.0827, lon: 80.2707 },
                        distanceInKm: '290',
                    },
                    {
                        coordinate: { lat: 17.3850, lon: 78.4867 },
                        distanceInKm: '570',
                    },
                ],
            };

            mockDistanceService.calculateDistances.mockReturnValue(resDto);

            const result = controller.calculateDistances(reqDto);
            expect(result).toEqual(resDto);
            expect(service.calculateDistances).toHaveBeenCalledWith(reqDto);
        });
    });

});
