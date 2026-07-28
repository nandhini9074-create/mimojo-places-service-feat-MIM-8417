import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import axios from 'axios';
import { dataUriToBuffer } from 'data-uri-to-buffer';
import * as ExcelJS from 'exceljs';
import * as FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

@Injectable()
export class SeederImageService {
  private readonly CLOUD_FLARE_URL =
    'https://api.cloudflare.com/client/v4/accounts/4f66287037d3bfcc6c7513be6b3b45fc/images/v1';
  private readonly API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
  private readonly RECEIPT_SAS_TOKEN = process.env.RECEIPT_SAS_TOKEN || '';
  private readonly RECEIPT_CONTAINER = 'fab-images';

  async uploadImage(imagePath: string): Promise<{ filename: string; url: string; date: string }> {
    try {
      const filePath = path.resolve(imagePath);
      const fileStream = fs.createReadStream(filePath);

      const form = new FormData();
      form.append('file', fileStream, path.basename(filePath));

      const response = await axios.post(this.CLOUD_FLARE_URL, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${this.API_TOKEN}`,
        },
      });

      const result = response.data;
      const imageUrl = result.result.variants[0];
      const uploadDate = new Date().toISOString();

      return {
        filename: path.basename(filePath),
        url: imageUrl,
        date: uploadDate,
      };
    } catch (error) {
      return {
        filename: path.basename(imagePath),
        url: 'Upload failed',
        date: new Date().toISOString(),
      };
    }
  }

  async uploadAllImages(folderPath: string, fileName: string): Promise<void> {
    try {
      const files = fs.readdirSync(folderPath);
      const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));

      const uploadPromises = imageFiles.map(file => {
        const filePath = path.join(folderPath, file);
        return this.uploadImage(filePath);
      });

      const results = await Promise.all(uploadPromises);

      await this.saveToExcel(results, fileName);
    } catch (error) {
      throw new Error('Failed to upload images');
    }
  }

  async saveToExcel(data: { filename: string; url: string; date: string }[], fileName: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Uploaded Images');

    worksheet.columns = [
      { header: 'Filename', key: 'filename', width: 30 },
      { header: 'Cloudflare URL', key: 'url', width: 50 },
      { header: 'Upload Date', key: 'date', width: 25 },
    ];

    data.forEach(row => worksheet.addRow(row));

    const filePath = path.join(__dirname, '..', fileName + '.xlsx');
    await workbook.xlsx.writeFile(filePath);
  }

  async uploadReceiptTransaction(receiptUri: string): Promise<string> {
    const parsedUri = dataUriToBuffer(receiptUri);
    const id: string = uuid();
    const fileName = `${id}.png`;
    const blobClient = this.getBlobClient(fileName);
    await blobClient.uploadData(parsedUri.buffer);
    return fileName;
  }

  private getBlobClient(imageName: string): BlockBlobClient {
    const sas = this.RECEIPT_SAS_TOKEN ?? '';
    const blobClientService = BlobServiceClient.fromConnectionString(sas);
    const containerClient = blobClientService.getContainerClient(this.RECEIPT_CONTAINER ?? '');
    const blobClient = containerClient.getBlockBlobClient(imageName);
    return blobClient;
  }
}
