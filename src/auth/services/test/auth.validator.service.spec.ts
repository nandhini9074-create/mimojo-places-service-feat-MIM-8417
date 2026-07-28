import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ErrorMessages } from 'src/errors/error-messages';
import { AuthHeaderService } from '../auth.validator.service';
;

jest.mock('jsonwebtoken');

describe('AuthHeaderService', () => {
  let service: AuthHeaderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthHeaderService],
    }).compile();

    service = module.get<AuthHeaderService>(AuthHeaderService);
    jest.clearAllMocks();
  });

  describe('getUserId', () => {
    it('should return user ID when valid token is provided', async () => {
      const mockPayload = { user: { id: '123' } };
      (jwt.decode as jest.Mock).mockReturnValue(mockPayload);

      const result = await service.getUserId('Bearer valid.token.here');
      expect(result).toBe('123');
      expect(jwt.decode).toHaveBeenCalledWith('valid.token.here');
    });


    it('should throw UNAUTHORIZED when auth header does not start with Bearer', async () => {
      await expect(service.getUserId('Token abc.def.ghi')).rejects.toThrow(
        new HttpException(ErrorMessages.auth.invalidToken, HttpStatus.UNAUTHORIZED),
      );
    });

    it('should throw UNAUTHORIZED when token is missing after Bearer', async () => {
      await expect(service.getUserId('Bearer ')).rejects.toThrow(
        new HttpException(ErrorMessages.auth.invalidToken, HttpStatus.UNAUTHORIZED),
      );
    });

    it('should throw UNAUTHORIZED when decoded payload does not contain user', async () => {
      (jwt.decode as jest.Mock).mockReturnValue({ some: 'data' });

      await expect(service.getUserId('Bearer invalid.token')).rejects.toThrow(
        new HttpException(ErrorMessages.auth.invalidToken, HttpStatus.UNAUTHORIZED),
      );
    });

    it('should throw UNAUTHORIZED when decoded payload is null', async () => {
      (jwt.decode as jest.Mock).mockReturnValue(null);

      await expect(service.getUserId('Bearer invalid.token')).rejects.toThrow(
        new HttpException(ErrorMessages.auth.invalidToken, HttpStatus.UNAUTHORIZED),
      );
    });

  });
});