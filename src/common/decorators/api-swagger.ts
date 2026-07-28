import { applyDecorators, Type, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

export interface ApiEndpointOptions<T = unknown> {
  summary: string;
  description?: string;
  authRequired?: boolean;
  bodyType?: Type<T>;
  exampleBody?: Partial<T> | Record<string, unknown>;
  successType?: Type<unknown>;
  responseType?: Type<unknown>;
  exampleResponse?: unknown;
  queries?: {
    name: string;
    required?: boolean;
    description?: string;
    example?: unknown;
    isArray?: boolean;
    type?:
      | string
      | typeof Boolean
      | typeof String
      | typeof Number
      | (new (...args: unknown[]) => unknown)
      | ((...args: unknown[]) => unknown);
    enum?: Record<string, unknown> | string[];
  }[];
  headers?: {
    name: string;
    required?: boolean;
    description?: string;
    example?: unknown;
  }[];
  pathParams?: { name: string; description?: string; type?: string | typeof String | typeof Number; example?: string }[];
  includeDeviceIdHeader?: boolean;
  includeCurrencyIdHeader?: boolean;
  queryType?: Type<T>;
}

function addBodyDecorators(
  decorators: (ClassDecorator | MethodDecorator | PropertyDecorator)[],
  options: ApiEndpointOptions<unknown>
) {
  if (!options.bodyType) return;
  decorators.push(ApiExtraModels(options.bodyType));
  decorators.push(
    ApiBody({
      type: options.bodyType,
      description: `${options.bodyType.name} payload`,
      schema: { $ref: getSchemaPath(options.bodyType) },
      examples: options.exampleBody
        ? {
            default: {
              summary: 'Example request body',
              value: options.exampleBody,
            },
          }
        : undefined,
    })
  );
}

function addQueryDecorators(
  decorators: (ClassDecorator | MethodDecorator | PropertyDecorator)[],
  options: ApiEndpointOptions<unknown>
) {
  if (options.queryType) {
    decorators.push(ApiExtraModels(options.queryType));
  }
  options.queries?.forEach(q => {
    const queryType = (q.type ?? String) as
      | string
      | typeof Boolean
      | typeof String
      | typeof Number
      | (new (...args: unknown[]) => unknown)
      | ((...args: unknown[]) => unknown);

    const queryEnum = (q.enum ?? undefined) as string[] | undefined;

    decorators.push(
      ApiQuery({
        name: q.name,
        required: q.required ?? false,
        description: q.description,
        example: q.example,
        isArray: q.isArray ?? false,
        type: queryType,
        enum: queryEnum,
      })
    );
  });
}

function addHeaderDecorators(
  decorators: (ClassDecorator | MethodDecorator | PropertyDecorator)[],
  options: ApiEndpointOptions<unknown>
) {
  options.headers?.forEach(h =>
    decorators.push(
      ApiHeader({
        name: h.name,
        required: h.required ?? false,
        description: h.description,
        example: h.example,
      })
    )
  );

  if (options.includeDeviceIdHeader) {
    decorators.push(
      ApiHeader({
        name: 'x-device-id',
        description: 'Device identifier',
        required: false,
        schema: { type: 'string' },
      })
    );
  }

  if (options.includeCurrencyIdHeader) {
    decorators.push(
      ApiHeader({
        name: 'currencyid',
        description: 'Currency identifier',
        required: false,
        schema: { type: 'string' },
      })
    );
  }
}

function addParamDecorators(
  decorators: (ClassDecorator | MethodDecorator | PropertyDecorator)[],
  options: ApiEndpointOptions<unknown>
) {
  options.pathParams?.forEach(param =>
    decorators.push(
      ApiParam({
        name: param.name,
        description: param.description ?? '',
        type: param.type ?? String,
        example: param.example,
      })
    )
  );
}

function addResponseDecorators(
  decorators: (ClassDecorator | MethodDecorator | PropertyDecorator)[],
  options: ApiEndpointOptions<unknown>
) {
  const responses = [
    {
      status: HttpStatus.OK,
      description: 'Request successful',
      schema: options.exampleResponse ? { example: options.exampleResponse } : undefined,
    },
    { status: HttpStatus.BAD_REQUEST, description: 'Invalid request' },
    { status: HttpStatus.UNAUTHORIZED, description: 'Invalid or missing authorization token' },
    { status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Internal server error' },
    { status: HttpStatus.CREATED, description: 'Created successfully' },
    { status: HttpStatus.NO_CONTENT, description: 'Deleted successfully' },
  ];
  responses.forEach(r => decorators.push(ApiResponse(r)));
}

export function ApiEndpoint<T = unknown>(options: ApiEndpointOptions<T>) {
  const decorators: (ClassDecorator | MethodDecorator | PropertyDecorator)[] = [
    ApiOperation({ summary: options.summary, description: options.description }),
    ApiBearerAuth('access-token'),
  ];

  addBodyDecorators(decorators, options);
  addQueryDecorators(decorators, options);
  addHeaderDecorators(decorators, options);
  addParamDecorators(decorators, options);
  addResponseDecorators(decorators, options);

  return applyDecorators(...decorators);
}
