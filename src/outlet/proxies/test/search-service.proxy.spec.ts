import axios from 'axios';
import { SearchServiceProxy } from '../search-service.proxy';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// mock config
jest.mock('config/server.config', () => ({
  internalApisConfig: jest.fn().mockReturnValue({
    SEARCH_SERVICE_UPDATE_PAYLOAD_URL: 'https://mock-search-service/update'
  })
}));

describe('SearchServiceProxy', () => {
  let service: SearchServiceProxy;
  let mockLogger: jest.Mocked<CustomPinoLogger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn()
    } as any;

    service = new SearchServiceProxy(mockLogger);
    jest.clearAllMocks();
  });

  describe('updateOutletStatus', () => {
    const profileId = 'profile';

    it('should call axios.put with correct payload and log start/end', async () => {
      const outletId = 'outlet-123';
      const status = 'ACTIVE';
      const mockResponse = { data: { success: true } };
      mockedAxios.put.mockResolvedValueOnce(mockResponse);

      await service.updateOutletStatus(outletId, profileId, status);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'SearchServiceProxy.updateOutletStatus - starts',
        { outletId, status, profileId }
      );
      expect(mockedAxios.put).toHaveBeenCalledWith(
        'https://mock-search-service/update',
        {
          updates: [
            {
              outletId,
              status,
              profileId,
            },
          ],
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'SearchServiceProxy.updateOutletStatus - ends',
        { response: mockResponse }
      );
    });

    it('should log error if axios.put throws', async () => {
      const outletId = 'outlet-999';
      const status = 'INACTIVE';
      const mockError = new Error('network error');
      mockedAxios.put.mockRejectedValueOnce(mockError);

      await service.updateOutletStatus(outletId, profileId, status);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'SearchServiceProxy.updateOutletStatus - starts',
        { outletId, status, profileId }
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'SearchServiceProxy.updateOutletStatus - exception;',
        { error: mockError, outletId, status, profileId }
      );
    });
  });
});
