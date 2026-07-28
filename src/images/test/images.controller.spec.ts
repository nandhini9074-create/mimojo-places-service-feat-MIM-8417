import { Test, TestingModule } from '@nestjs/testing';
import { OutletKafkaProducerService } from '../services/outlet-kafka-producer.service';
import { BadRequestException } from '@nestjs/common';
import { ImagesController } from '../images.controller';
import { OutletPhotoService } from 'src/outlet/services/outlet-photo.service';
import { DataOperationsProducer } from 'src/kafka-services/data-operations.producer';
import { ChangeImageOrderDto } from '../dtos/change-image-order-dto';
import { DeleteOutletImageDto } from '../dtos/delete-outlet-image-dto';
import { SetDefaultOutletImageDto } from '../dtos/set-default-outlet-image-dto';
import { UploadOutletImageDto } from '../dtos/upload-outlet-image-dto';

const mockOutletPhotoService = {
  updateDefaultImage: jest.fn(),
  deleteImage: jest.fn(),
  changeImageOrder: jest.fn(),
};

const mockKafkaProducerService = {
  uploadImageAndPush: jest.fn(),
  uploadHeroImageAndPush: jest.fn(),
  uploadOutletImageSync: jest.fn(),
};

const mockDataOperationsProducer = {
  pushToAuditLogService: jest.fn(),
};

const mockImage: Express.Multer.File = {
  fieldname: 'image',
  originalname: 'test-image.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  size: 1024,
  buffer: Buffer.from('test image content'),
  stream: {} as any,
  destination: '/tmp',
  filename: 'test-image.jpg',
  path: '/tmp/test-image.jpg',
};

describe('ImagesController', () => {
  let controller: ImagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImagesController],
      providers: [
        { provide: OutletPhotoService, useValue: mockOutletPhotoService },
        { provide: OutletKafkaProducerService, useValue: mockKafkaProducerService },
        { provide: DataOperationsProducer, useValue: mockDataOperationsProducer },
      ],
    }).compile();

    controller = module.get<ImagesController>(ImagesController);
  });

  it('should upload outlet images', async () => {
    const dto: UploadOutletImageDto = { outletId: '123' } as any;
    mockKafkaProducerService.uploadImageAndPush.mockResolvedValue(null);
    const res = await controller.uploadOutletImages([mockImage], dto);
    expect(mockKafkaProducerService.uploadImageAndPush).toHaveBeenCalledWith(dto, [mockImage]);
    expect(res.message).toBe('Success');
  });

  it('should set default image', async () => {
    const dto: SetDefaultOutletImageDto = { outletPhotoId: 'img1' };
    mockOutletPhotoService.updateDefaultImage.mockResolvedValue('ok');
    const res = await controller.setDefaultImage(dto);
    expect(mockOutletPhotoService.updateDefaultImage).toHaveBeenCalledWith('img1');
    expect(res.message).toBe('Success');
  });

  it('should delete image', async () => {
    const dto: DeleteOutletImageDto = { outletPhotoId: 'img1' };
    mockOutletPhotoService.deleteImage.mockResolvedValue('deleted');
    const res = await controller.deleteImage(dto);
    expect(mockOutletPhotoService.deleteImage).toHaveBeenCalledWith('img1');
    expect(res.message as any).toBe('Success');
  });

  it('should change image order', async () => {
    const dto: ChangeImageOrderDto = {
      orderData: [
        {
          outletPhotoId: 'img1',
          sortOrder: 0,
        },
        {
          outletPhotoId: 'img2',
          sortOrder: 0,
        },
      ],
    };
    mockOutletPhotoService.changeImageOrder.mockResolvedValue('ordered');
    const res = await controller.changeImageOrder(dto);
    expect(mockOutletPhotoService.changeImageOrder).toHaveBeenCalledWith(dto);
    expect(res.message).toBe('Success');
  });

  it('should upload hero image', async () => {
    const dto: UploadOutletImageDto = { outletId: '1' } as any;
    mockKafkaProducerService.uploadHeroImageAndPush.mockResolvedValue('hero');
    const res = await controller.uploadOutletHeroImage(mockImage, dto);
    expect(mockKafkaProducerService.uploadHeroImageAndPush).toHaveBeenCalledWith(dto, mockImage);
    expect(res.message).toBe('Success');
  });

  it('should upload outlet image and log audit', async () => {
    const dto: UploadOutletImageDto = { outletId: '1', setAsHeroImage: true } as any;
    const req = { headers: { 'x-header': 'test' } };
    mockKafkaProducerService.uploadOutletImageSync.mockResolvedValue({
      response: { uploaded: true },
      isFirstHeroImage: false,
    });
    const res = await controller.uploadOutletImage(mockImage, dto, req as any);
    expect(mockKafkaProducerService.uploadOutletImageSync).toHaveBeenCalledWith(dto, mockImage, req.headers);
    expect(mockDataOperationsProducer.pushToAuditLogService).toHaveBeenCalled();
    expect(res.message).toBe('Success');
  });
});
