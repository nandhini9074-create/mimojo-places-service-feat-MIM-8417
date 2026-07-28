import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { BaseResponse } from 'src/dtos/base-response';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { OutletKafkaProducerService } from 'src/images/services/outlet-kafka-producer.service';
import { OutletPhotoService } from 'src/outlet/services/outlet-photo.service';
import { DeleteOutletImageDto } from './dtos/delete-outlet-image-dto';
import { SetDefaultOutletImageDto } from './dtos/set-default-outlet-image-dto';
import { UploadOutletImageDto } from './dtos/upload-outlet-image-dto';
import { DataOperationsProducer } from 'src/kafka-services/data-operations.producer';
import { EnvKeysEnum } from 'config/env.enum';
import { ChangeImageOrderDto } from './dtos/change-image-order-dto';
import { ApiEndpoint } from 'src/common/decorators/api-swagger';
import { UploadOutletImageFileDto } from './dtos/upload-outlet-image-file.dto';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void
) => {
  if (!file.mimetype.startsWith('image/')) {
    return callback(new BadRequestException('Only image files are allowed!'), false);
  }
  callback(null, true);
};

@Controller({ version: '1', path: 'images' })
export class ImagesController {
  constructor(
    private readonly outletPhotoService: OutletPhotoService,
    private readonly outletKafkaProducerService: OutletKafkaProducerService,
    private readonly dataOperationsProducer: DataOperationsProducer
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('upload-outlet-images')
  @UseInterceptors(
    FilesInterceptor('images', null, {
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    })
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Images to upload',
        },
        outletId: { type: 'string', maxLength: 200, description: 'Optional outlet ID' },
        setAsHeroImage: { type: 'boolean', description: 'Whether to set the image as the hero image' },
      },
    },
  })
  async uploadOutletImages(
    @UploadedFiles() images: Array<Express.Multer.File>,
    @Body() uploadOutletImage: UploadOutletImageDto
  ): Promise<BaseResponse<void>> {
    return baseResponseHelper(await this.outletKafkaProducerService.uploadImageAndPush(uploadOutletImage, images));
  }

  @HttpCode(HttpStatus.OK)
  @Post('set-default-image')
  @ApiEndpoint({
    summary: 'Set default outlet image',
    description: 'Marks a specific outlet image as the default image.',
    bodyType: SetDefaultOutletImageDto,
  })
  async setDefaultImage(@Body() request: SetDefaultOutletImageDto): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.outletPhotoService.updateDefaultImage(request.outletPhotoId));
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete-image')
  @ApiEndpoint({
    summary: 'Delete outlet image',
    description: 'Deletes a specific outlet image.',
    bodyType: DeleteOutletImageDto,
  })
  async deleteImage(@Body() request: DeleteOutletImageDto): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.outletPhotoService.deleteImage(request.outletPhotoId));
  }

  @HttpCode(HttpStatus.OK)
  @Post('change-image-order')
  @ApiEndpoint({
    summary: 'Change outlet image order',
    description: 'Changes the order of outlet images.',
    bodyType: ChangeImageOrderDto,
  })
  async changeImageOrder(@Body() request: ChangeImageOrderDto): Promise<BaseResponse<unknown>> {
    return baseResponseHelper(await this.outletPhotoService.changeImageOrder(request));
  }

  @HttpCode(HttpStatus.OK)
  @Post('upload-hero-image')
  @ApiConsumes('multipart/form-data')
  @ApiEndpoint({
    summary: 'Upload outlet hero image',
    description: 'Uploads a hero image for an outlet.',
    bodyType: UploadOutletImageFileDto,
  })
  @UseInterceptors(
    FileInterceptor('image', {
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    })
  )
  async uploadOutletHeroImage(@UploadedFile() image: Express.Multer.File, @Body() uploadOutletImage: UploadOutletImageDto) {
    return baseResponseHelper(await this.outletKafkaProducerService.uploadHeroImageAndPush(uploadOutletImage, image));
  }

  @HttpCode(HttpStatus.OK)
  @Post('upload-outlet-image')
  @ApiConsumes('multipart/form-data')
  @ApiEndpoint({
    summary: 'Upload outlet image',
    description: 'Uploads an image for an outlet.',
    bodyType: UploadOutletImageFileDto,
  })
  @UseInterceptors(
    FileInterceptor('image', {
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    })
  )
  async uploadOutletImage(
    @UploadedFile() image: Express.Multer.File,
    @Body() uploadOutletImage: UploadOutletImageDto,
    @Req() _req: Request
  ) {
    const { response, isFirstHeroImage } = await this.outletKafkaProducerService.uploadOutletImageSync(
      uploadOutletImage,
      image,
      _req.headers
    );

    if (uploadOutletImage.setAsHeroImage.toString() == 'true' && response) {
      // Audit Log : node_name = Hero Image
      this.dataOperationsProducer.pushToAuditLogService(
        'mimojo-places-service',
        {
          status: isFirstHeroImage ? 'COMPLETED' : 'UPDATED',
          values: response,
        },
        {
          audit_main_node_configuration_id: process.env[EnvKeysEnum.AUDIT_LOG_NODE_HERO_IMAGE],
        }
      );
    }
    return baseResponseHelper(response);
  }
}
