import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IBlobConfig, IKafkaProducerConfig } from 'config/interface';
import { KafkaProducerService } from 'src/kafka-producer/kafka-producer.service';
import { OutletSourceEnum } from '../../outlet/enums/outlet-source-enum';
import { v4 as uuid } from 'uuid';
import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import { extname } from 'path';
import { OutletPhotoService } from '../../outlet/services/outlet-photo.service';
import { UploadOutletImageDto } from 'src/images/dtos/upload-outlet-image-dto';
import { UploadOutletImageProxy } from 'src/images/proxies/outlet-image-upload.proxy';
import { LlmImageOptimizationProxy } from 'src/images/proxies/llm-image-optimization.proxy';

@Injectable()
export class OutletKafkaProducerService {
  private config: IKafkaProducerConfig;
  private blobConnectionString: string;
  private blobContainerName: string;
  private blobSasToken: string;
  private blobUrl: string;

  constructor(
    private readonly producerService: KafkaProducerService,
    private configService: ConfigService,
    private outletPhotoService: OutletPhotoService,
    private uploadOutletImageProxy: UploadOutletImageProxy,
    private llmImageOptimizationProxy: LlmImageOptimizationProxy
  ) {
    this.config = this.configService.get('kafka-producer');
    const { BLOB_CONNECTION_STRING, BLOB_CONTAINER_NAME, BLOB_SAS_TOKEN, BLOB_URL } =
      this.configService.get<IBlobConfig>('blob');

    this.blobConnectionString = BLOB_CONNECTION_STRING;
    this.blobContainerName = BLOB_CONTAINER_NAME;
    this.blobSasToken = BLOB_SAS_TOKEN;
    this.blobUrl = BLOB_URL;
  }

  getBlobClient(imageName: string): BlockBlobClient {
    const sas = this.blobConnectionString;
    const blobClientService = BlobServiceClient.fromConnectionString(sas);
    const containerClient = blobClientService.getContainerClient(this.blobContainerName);
    const blobClient = containerClient.getBlockBlobClient(imageName);
    return blobClient;
  }

  async uploadImageAndPush(uploadOutletImage: UploadOutletImageDto, images: Express.Multer.File[]) {
    for (const image of images) {
      if (image) {
        const id: string = uuid();
        const fileName = `${id}${extname(image.originalname)}`;

        const optimizedBuffer = await this.llmImageOptimizationProxy.proxyImageToImagesService(image.buffer, image.originalname);

        //Uploading to Blob
        const blobClient = this.getBlobClient(fileName);
        await blobClient.uploadData(optimizedBuffer);

        await this.pushToOutletImageService(
          uploadOutletImage.outletId,
          {
            image: fileName,
            is_default: false,
          },
          OutletSourceEnum.Custom
        );
      }
    }
  }

  async uploadHeroImageAndPush(uploadOutletImage: UploadOutletImageDto, image: Express.Multer.File) {
    if (image) {
      const id: string = uuid();
      const fileName = `${id}${extname(image.originalname)}`;

      await this.outletPhotoService.deselectDefaultImage(uploadOutletImage.outletId);

      //Uploading to Blob
      const blobClient = this.getBlobClient(fileName);
      await blobClient.uploadData(image.buffer);

      await this.pushToOutletImageService(
        uploadOutletImage.outletId,
        {
          image: fileName,
          is_default: uploadOutletImage.setAsHeroImage,
        },
        OutletSourceEnum.Custom
      );
    }
  }

  async uploadOutletImageSync(
    uploadOutletImage: UploadOutletImageDto,
    image: Express.Multer.File,
    token: Record<string, string | string[] | undefined>
  ): Promise<{ response: unknown; isFirstHeroImage: boolean } | undefined> {
    if (image) {
      const id: string = uuid();
      const fileName = `${id}${extname(image.originalname)}`;
      let isFirstHeroImage = false;
      console.log('uploadOutletImage.setAsHeroImage:', typeof uploadOutletImage.setAsHeroImage);
      console.log('(uploadOutletImage.setAsHeroImage == true):', uploadOutletImage.setAsHeroImage.toString() == 'true');

      if (uploadOutletImage.setAsHeroImage.toString() == 'true') {
        const updatedCount = await this.outletPhotoService.deselectDefaultImage(uploadOutletImage.outletId);
        if (updatedCount === 0) {
          isFirstHeroImage = true;
        }
      }

      //Uploading to Blob
      const blobClient = this.getBlobClient(fileName);
      await blobClient.uploadData(image.buffer);
      const response = await this.uploadOutletImageProxy.uploadOutletImageDirect(
        uploadOutletImage.outletId,
        fileName,
        uploadOutletImage.setAsHeroImage,
        token
      );
      console.log('response ', response);
      return { response: response.data.data, isFirstHeroImage };
    }
  }

  async pushToOutletImageService(outlet_id: string, photos: unknown, source: OutletSourceEnum) {
    if (photos != undefined)
      await this.producerService.produce({
        topic: this.config.KAFKA_TOPIC,
        messages: [
          {
            headers: { imageSource: source },
            key: outlet_id.toString(),
            value: JSON.stringify(photos),
          },
        ],
      });
  }
}
