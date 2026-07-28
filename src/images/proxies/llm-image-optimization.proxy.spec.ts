import { Test, TestingModule } from '@nestjs/testing';
import { LlmImageOptimizationProxy } from './llm-image-optimization.proxy';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

jest.mock('axios');

describe('LlmImageOptimizationProxy', () => {
  let proxy: LlmImageOptimizationProxy;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmImageOptimizationProxy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://test-images-service:3000'),
          },
        },
      ],
    }).compile();

    proxy = module.get<LlmImageOptimizationProxy>(LlmImageOptimizationProxy);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(proxy).toBeDefined();
  });

  describe('proxyImageToImagesService', () => {
    it('should successfully proxy image and return buffer', async () => {
      const mockFileBuffer = Buffer.from('test-image-content');
      const mockFilename = 'test.jpg';
      const mockResponseBuffer = Buffer.from('optimized-image-content');
      
      (axios.post as jest.Mock).mockResolvedValue({ data: mockResponseBuffer });

      const result = await proxy.proxyImageToImagesService(mockFileBuffer, mockFilename);

      expect(result).toEqual(mockResponseBuffer);
      expect(axios.post).toHaveBeenCalledWith(
        'http://test-images-service:3000/files/optimize-image-buffer',
        expect.any(Object), // FormData instance
        expect.objectContaining({
          headers: expect.any(Object),
          responseType: 'arraybuffer',
        })
      );
    });

    it('should throw an error if axios post fails', async () => {
      const mockFileBuffer = Buffer.from('test-image-content');
      const mockFilename = 'test.jpg';
      const error = new Error('Network Error');
      
      (axios.post as jest.Mock).mockRejectedValue(error);

      await expect(proxy.proxyImageToImagesService(mockFileBuffer, mockFilename))
        .rejects
        .toThrow('Network Error');
    });
  });
});
