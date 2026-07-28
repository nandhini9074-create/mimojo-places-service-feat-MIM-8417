import { TestingModule, Test } from "@nestjs/testing";
import { Sequelize } from "sequelize";
import { UpsertNeighbourhoodDto } from "src/neighbourhood/dtos/upsert-neighbourhood-dto";
import { AreaController } from "../area.controller";
import { AreaService } from "../services/area.service";
import { getConnectionToken } from '@nestjs/sequelize';

jest.mock('src/helpers/base-response.helper', () => ({
    baseResponseHelper: jest.fn((data) => data),
}));

describe('AreaController', () => {
    let controller: AreaController;
    let areaService: AreaService;
    let sequelize: Sequelize;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AreaController],
            providers: [
                {
                    provide: AreaService,
                    useValue: {
                        findAllAreas: jest.fn().mockResolvedValue(['Area1', 'Area2']),
                        findAreas: jest.fn().mockResolvedValue(['AreaA', 'AreaB']),
                        upsertNeighbourhood: jest.fn().mockResolvedValue('Neighbourhood Saved'),
                    },
                },
                {
                    provide: getConnectionToken(),
                    useValue: {
                        transaction: jest.fn().mockImplementation((callback) => callback({})),
                    },
                },
            ],
        }).compile();

        controller = module.get<AreaController>(AreaController);
        areaService = module.get<AreaService>(AreaService);
        sequelize = module.get<Sequelize>(getConnectionToken());
    });



    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should return all area neighbourhoods', async () => {
        const result = await controller.GetAreaNeighbourhood();
        expect(areaService.findAllAreas).toHaveBeenCalled();
        expect(result).toEqual(['Area1', 'Area2']);
    });

    it('should return all areas', async () => {
        const result = await controller.GetAllAreaNeighbourhood();
        expect(areaService.findAreas).toHaveBeenCalled();
        expect(result).toEqual(['AreaA', 'AreaB']);
    });

    it('should upsert area neighbourhood', async () => {
        const dto: UpsertNeighbourhoodDto = {
            neighbourhoodId: '1',
            neighbourhoodName: 'NewNeighbourhood',
            neighbourhoodNameAr: 'حي جديد',
            areaId: '2'
        };
        const result = await controller.UpsertAreaNeighbourhood(dto);
        expect(areaService.upsertNeighbourhood).toHaveBeenCalledWith(dto, expect.any(Object));
        expect(result).toEqual('Neighbourhood Saved');
    });
});
