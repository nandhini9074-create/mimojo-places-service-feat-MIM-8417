import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { catchError, from, lastValueFrom, Observable, throwError } from 'rxjs';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class GenericHttpService {
  private readonly axiosInstance: AxiosInstance;

  constructor(private readonly logger: CustomPinoLogger,) {
    this.axiosInstance = axios.create({
      timeout: 10000
    });
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        console.log(error);

        this.logger.error({error});
        if (error.response) {
          throw new HttpException(error.response.data, error.response.status);
        } else if (error.code === 'ECONNRESET') {
          console.log('No response received from server' + `${error.request._currentUrl}`);
          throw new HttpException(
            'No response received from server',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        } else {
          throw new HttpException('Something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const response$: Observable<AxiosResponse<T>> = from(this.axiosInstance.get<T>(url, config));
    const response: AxiosResponse<T> = await lastValueFrom(response$);
    return response;
  }

  async post<T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const response$: Observable<AxiosResponse<T>> = from(
      this.axiosInstance.post<T>(url, body, config)
    );
    const response: AxiosResponse<T> = await lastValueFrom(response$);
    return response;
  }

  async patch<T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const response$: Observable<AxiosResponse<T>> = from(
      this.axiosInstance.patch<T>(url, body, config)
    ).pipe(
      catchError((error: unknown) => {
        console.error(error);
        return throwError(() => {
          if (error instanceof Error) {
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
          } else {
            throw new HttpException('Unknown patch method error', HttpStatus.INTERNAL_SERVER_ERROR);
          }
        });
      })
    );
    const response: AxiosResponse<T> = await lastValueFrom(response$);
    return response;
  }

  async put<T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const response$: Observable<AxiosResponse<T>> = from(
      this.axiosInstance.put<T>(url, body, config)
    ).pipe(
      catchError((error: unknown) => {
        console.error(error);
        return throwError(() => {
          if (error instanceof Error) {
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
          } else {
            throw new HttpException('Unknown put method error', HttpStatus.INTERNAL_SERVER_ERROR);
          }
        });
      })
    );
    const response: AxiosResponse<T> = await lastValueFrom(response$);
    return response;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const response$: Observable<AxiosResponse<T>> = from(
      this.axiosInstance.delete<T>(url, config)
    ).pipe(
      catchError((error: unknown) => {
        console.error(error);
        return throwError(() => {
          if (error instanceof Error) {
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
          } else {
            throw new HttpException(
              'Unknown delete method error',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }
        });
      })
    );
    const response: AxiosResponse<T> = await lastValueFrom(response$);
    return response;
  }
}
