import axios from "axios";
import { OutletMigrationService } from "../outlet-migration.service";

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OutletMigrationService', () => {
  let service: OutletMigrationService;
  let mockOutletModel: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockOutletModel = {
      findAll: jest.fn(),
      update: jest.fn()
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue({ OUTLET_OFFER: 'https://api.example.com/offer/:outletId' })
    };

    service = new OutletMigrationService(mockOutletModel, mockConfigService);
  });

  it('should migrate offers and update outlets', async () => {
    const token = {
      authorization: 'Bearer some-token',
      'x-device-id': 'device-id'
    };

    const userId = 'user-123';

    const fakeOutlets = [
      { outletId: 'outlet1', status: 'Active' },
      { outletId: 'outlet2', status: 'Active' }
    ];

    mockOutletModel.findAll.mockResolvedValue(fakeOutlets);

    mockedAxios.get.mockImplementation((url: string) => {
      const outletId = url.includes('outlet1') ? 'outlet1' : 'outlet2';
      return Promise.resolve({
        data: {
          data: {
            outletCustomHours: outletId === 'outlet1' ? [{}] : [],
            outletBlackOutdays: outletId === 'outlet2' ? [{}] : []
          }
        }
      });
    });

    await service.migrateOffer(token, userId);

    expect(mockConfigService.get).toHaveBeenCalledWith('internal-apis');
    expect(mockOutletModel.findAll).toHaveBeenCalledWith({ where: { status: 'Active' } });
    expect(mockOutletModel.update).toHaveBeenCalledTimes(2);
    expect(mockOutletModel.update).toHaveBeenCalledWith(
      { hasCustomOffer: true, updatedBy: userId },
      { where: { outletId: 'outlet1' } }
    );
    expect(mockOutletModel.update).toHaveBeenCalledWith(
      { hasCustomOffer: true, updatedBy: userId },
      { where: { outletId: 'outlet2' } }
    );
  });

  it('should handle errors gracefully and continue', async () => {
    const token = {
      authorization: 'Bearer error-token',
      'x-device-id': 'device-id'
    };

    const userId = 'user-456';

    const outlets = [{ outletId: 'outlet-error', status: 'Active' }];
    mockOutletModel.findAll.mockResolvedValue(outlets);

    mockedAxios.get.mockRejectedValue(new Error('Offer fetch failed'));

    const result = await service.migrateOffer(token, userId);

    expect(result).toEqual({ status: 'success' });
    expect(mockOutletModel.update).not.toHaveBeenCalled();
  });
});
