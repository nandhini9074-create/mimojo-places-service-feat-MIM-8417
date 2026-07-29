import './tracer';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appConfig } from 'config/server.config';
import { ValidationError, ValidationPipe, VersioningType } from '@nestjs/common';
import { AllExceptionsFilter } from './errors/catch-all-errors';
import { exceptionFactory } from './errors/exception-factory.filter';
import { CspMiddleware } from './middlewares/csp.middleware';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

// Minimal crypto polyfill for randomUUID; full Crypto type not required
// eslint-disable-next-line @typescript-eslint/no-explicit-any
//(global as any).crypto = { randomUUID };

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('query parser', 'extended');
  const { SERVER_HTTP_HOST, SERVER_HTTP_PORT, IS_SWAGGER_ENABLED, DOMAIN_URL, NODE_ENV } = appConfig();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => exceptionFactory(validationErrors),
    })
  );
  app.enableCors();
  if (IS_SWAGGER_ENABLED) {
    const config = new DocumentBuilder()
      .setTitle('Places service')
      .setDescription('API documentation')
      .setVersion('1.0')
      .addServer(`${DOMAIN_URL}`, 'Domain URL')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          in: 'header',
        },
        'access-token'
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);

    const docsDir = path.resolve(process.cwd(), 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    const filePath = path.join(docsDir, 'swagger.json');
    fs.writeFileSync(filePath, JSON.stringify(document, null, 2));
    if (NODE_ENV === 'local') SwaggerModule.setup('api-docs', app, document);
  }

  // Enable versioning with default version
  app.enableVersioning({
    defaultVersion: '1',
    prefix: 'v',
    type: VersioningType.URI,
  });

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  // Redirect root path to a specific versioned route
  app.use((req, res, next) => {
    const { originalUrl } = req;

    // Check if the original URL matches the desired non-versioned route
    if (!originalUrl.startsWith('/v')) {
      // Rewrite the URL to include the version prefix
      req.url = `/v1${originalUrl}`;
    }

    // Continue to the next middleware or route handler
    next();
  });

  app.use((req, res, next) => new CspMiddleware().use(req, res, next));

  await app.listen(SERVER_HTTP_PORT);
  console.log(`Http Server is running over: ${SERVER_HTTP_HOST}:${SERVER_HTTP_PORT}`);
}

bootstrap();
