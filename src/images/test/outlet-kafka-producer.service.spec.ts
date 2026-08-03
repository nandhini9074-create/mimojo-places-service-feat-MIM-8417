import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { KafkaProducerService } from 'src/kafka-producer/kafka-producer.service';
import { OutletPhotoService } from '../../outlet/services/outlet-photo.service';
import { UploadOutletImageProxy } from '../proxies/outlet-image-upload.proxy';
import { LlmImageOptimizationProxy } from '../proxies/llm-image-optimization.proxy';
import { Outlet } from '../../outlet/models/outlet.model';
import { OutletProfileMetadata } from 'src/outlet-profile/entities/outlet-profile.model';
import { OutletKafkaProducerService } from '../services/outlet-kafka-producer.service';
import { UploadOutletImageDto } from '../dtos/upload-outlet-image-dto';
import { extname } from 'path';

describe('OutletKafkaProducerService', () => {
  let service: OutletKafkaProducerService;
  let configService: ConfigService;
  let outletProfileMetadataModel: any;
  let llmImageOptimizationProxy: LlmImageOptimizationProxy;
  let uploadOutletImageProxy: UploadOutletImageProxy;
  let outletPhotoService: OutletPhotoService;

  const mockKafkaProducerService = {
    produce: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'kafka-producer') {
        return {
          KAFKA_CLIENT_ID: 'test-client',
          KAFKA_PRODUCER_BROKERS: 'localhost:9092',
          KAFKA_TOPIC: 'test-topic',
        };
      }
      if (key === 'blob') {
        return {
          BLOB_CONNECTION_STRING:
            'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=key;EndpointSuffix=core.windows.net',
          BLOB_CONTAINER_NAME: 'test-container',
          BLOB_SAS_TOKEN: 'sas',
          BLOB_URL: 'http://test-blob',
        };
      }
      if (key === 'internal-apis.LLM_MASTER_PROFILE_ID') {
        return 'master-profile-id';
      }
      return null;
    }),
  };

  const mockOutletPhotoService = {
    deselectDefaultImage: jest.fn(),
  };

  const mockUploadOutletImageProxy = {
    uploadOutletImageDirect: jest.fn(),
  };

  const mockLlmImageOptimizationProxy = {
    proxyImageToImagesService: jest.fn(),
  };

  const mockOutletModel = {};
  const mockOutletProfileMetadataModel = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutletKafkaProducerService,
        { provide: KafkaProducerService, useValue: mockKafkaProducerService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OutletPhotoService, useValue: mockOutletPhotoService },
        { provide: UploadOutletImageProxy, useValue: mockUploadOutletImageProxy },
        { provide: LlmImageOptimizationProxy, useValue: mockLlmImageOptimizationProxy },
        { provide: getModelToken(Outlet), useValue: mockOutletModel },
        { provide: getModelToken(OutletProfileMetadata), useValue: mockOutletProfileMetadataModel },
      ],
    }).compile();

    service = module.get<OutletKafkaProducerService>(OutletKafkaProducerService);
    configService = module.get<ConfigService>(ConfigService);
    outletProfileMetadataModel = module.get(getModelToken(OutletProfileMetadata));
    llmImageOptimizationProxy = module.get<LlmImageOptimizationProxy>(LlmImageOptimizationProxy);
    uploadOutletImageProxy = module.get<UploadOutletImageProxy>(UploadOutletImageProxy);
    outletPhotoService = module.get<OutletPhotoService>(OutletPhotoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadOutletImageSync', () => {
    const mockImage: Express.Multer.File = {
      fieldname: 'image',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test-image-content'),
      size: 1024,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const mockBlobClient = {
      uploadData: jest.fn().mockResolvedValue({}),
    };

    beforeEach(() => {
      jest.spyOn(service, 'getBlobClient').mockReturnValue(mockBlobClient as any);
    });

    it('should optimize, upload, and sync image when valid inputs are provided', async () => {
      const dto: UploadOutletImageDto = {
        outletId: 'outlet-123',
        setAsHeroImage: false,
      };

      outletProfileMetadataModel.findOne.mockResolvedValue({ profileId: 'profile-456' });
      mockLlmImageOptimizationProxy.proxyImageToImagesService.mockResolvedValue(Buffer.from('optimized-content'));
      mockUploadOutletImageProxy.uploadOutletImageDirect.mockResolvedValue({ data: { data: 'success-details' } });

      const result = await service.uploadOutletImageSync(dto, mockImage, { authorization: 'Bearer token' });

      expect(outletProfileMetadataModel.findOne).toHaveBeenCalledWith({
        where: { outletId: 'outlet-123' },
      });
      expect(llmImageOptimizationProxy.proxyImageToImagesService).toHaveBeenCalledWith(
        mockImage.buffer,
        mockImage.originalname,
        'profile-456'
      );
      expect(mockBlobClient.uploadData).toHaveBeenCalledWith(Buffer.from('optimized-content'));
      expect(uploadOutletImageProxy.uploadOutletImageDirect).toHaveBeenCalledWith('outlet-123', expect.any(String), false, {
        authorization: 'Bearer token',
      });
      expect(result).toEqual({ response: 'success-details', isFirstHeroImage: false });
    });

    it('should fallback to master profile ID when no outlet profile mapping is found', async () => {
      const dto: UploadOutletImageDto = {
        outletId: 'outlet-123',
        setAsHeroImage: false,
      };

      outletProfileMetadataModel.findOne.mockResolvedValue(null);
      mockLlmImageOptimizationProxy.proxyImageToImagesService.mockResolvedValue(Buffer.from('optimized-content'));
      mockUploadOutletImageProxy.uploadOutletImageDirect.mockResolvedValue({ data: { data: 'success-details' } });

      await service.uploadOutletImageSync(dto, mockImage, {});

      expect(llmImageOptimizationProxy.proxyImageToImagesService).toHaveBeenCalledWith(
        mockImage.buffer,
        mockImage.originalname,
        'master-profile-id'
      );
    });

    it('should deselect other defaults and mark as first hero image if updatedCount is 0', async () => {
      const dto: UploadOutletImageDto = {
        outletId: 'outlet-123',
        setAsHeroImage: true,
      };

      outletProfileMetadataModel.findOne.mockResolvedValue({ profileId: 'profile-456' });
      mockLlmImageOptimizationProxy.proxyImageToImagesService.mockResolvedValue(Buffer.from('optimized-content'));
      mockOutletPhotoService.deselectDefaultImage.mockResolvedValue(0);
      mockUploadOutletImageProxy.uploadOutletImageDirect.mockResolvedValue({ data: { data: 'success-details' } });

      const result = await service.uploadOutletImageSync(dto, mockImage, {});

      expect(outletPhotoService.deselectDefaultImage).toHaveBeenCalledWith('outlet-123');
      expect(result).toEqual({ response: 'success-details', isFirstHeroImage: true });
    });

    it('should not mark as first hero image if updatedCount is greater than 0', async () => {
      const dto: UploadOutletImageDto = {
        outletId: 'outlet-123',
        setAsHeroImage: true,
      };

      outletProfileMetadataModel.findOne.mockResolvedValue({ profileId: 'profile-456' });
      mockLlmImageOptimizationProxy.proxyImageToImagesService.mockResolvedValue(Buffer.from('optimized-content'));
      mockOutletPhotoService.deselectDefaultImage.mockResolvedValue(1);
      mockUploadOutletImageProxy.uploadOutletImageDirect.mockResolvedValue({ data: { data: 'success-details' } });

      const result = await service.uploadOutletImageSync(dto, mockImage, {});

      expect(outletPhotoService.deselectDefaultImage).toHaveBeenCalledWith('outlet-123');
      expect(result).toEqual({ response: 'success-details', isFirstHeroImage: false });
    });

    it('should return undefined if no image is provided', async () => {
      const dto: UploadOutletImageDto = {
        outletId: 'outlet-123',
        setAsHeroImage: false,
      };

      const result = await service.uploadOutletImageSync(dto, undefined as any, {});
      expect(result).toBeUndefined();
      expect(mockBlobClient.uploadData).not.toHaveBeenCalled();
    });
  });
});
