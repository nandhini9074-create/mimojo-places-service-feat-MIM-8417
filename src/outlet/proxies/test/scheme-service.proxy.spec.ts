import { Test, TestingModule } from '@nestjs/testing';
import { SchemeServiceProxy } from '../scheme-service.proxy';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { Outlet } from 'src/outlet/models/outlet.model';

jest.mock('axios');
jest.mock('src/outlet/models/outlet.model');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedOutlet = Outlet as jest.Mocked<typeof Outlet>;

describe('SchemeServiceProxy', () => {
    let service: SchemeServiceProxy;
    let configService: ConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SchemeServiceProxy,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue({
                            SCHEME_SERVICE_OUTLET_STATUS: 'http://scheme-service/status/:outletId',
                            SCHEME_SERVICE_DISABLE_OUTLETS: 'http://scheme-service/disable',
                            SCHEME_SERVICE_ENABLE_OUTLETS: 'http://scheme-service/enable',
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<SchemeServiceProxy>(SchemeServiceProxy);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should get scheme transaction service status successfully', async () => {
        const token = { authorization: 'auth', 'x-device-id': 'device' };
        const outletId = '123';
        const response = { data: 'status' };
        mockedAxios.get.mockResolvedValueOnce(response);

        const result = await service.getSchemeTransactionServiceStatus(outletId, token);
        expect(result).toEqual(response);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            'http://scheme-service/status/123',
            expect.objectContaining({
                headers: { Authorization: 'auth', 'x-device-id': 'device' },
            })
        );
    });

    it('should throw NotFoundException when getting scheme service status fails', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('Failed'));
        await expect(
            service.getSchemeTransactionServiceStatus('123', { authorization: 'auth', 'x-device-id': 'device' })
        ).rejects.toThrow(NotFoundException);
    });

    it('should disable outlet on scheme', async () => {
        const token = { authorization: 'auth', 'x-device-id': 'device' };
        const outlet = { posIds: ['123'] };
        mockedOutlet.findOne.mockResolvedValueOnce(outlet as any);
        mockedAxios.post.mockResolvedValueOnce({ data: 'disabled' });

        const result = await service.getSchemeTransactionDisableOutlet('321', token);
        expect(result).toEqual({ data: 'disabled' });
        expect(mockedAxios.post).toHaveBeenCalledWith(
            'http://scheme-service/disable',
            expect.objectContaining({
                outletId: '321',
                disableTerminalsOnly: true,
                terminals: ['123'],
            }),
            expect.objectContaining({
                headers: { Authorization: 'auth', 'x-device-id': 'device' },
            })
        );
    });

    it('should throw NotFoundException when disabling outlet fails', async () => {
        mockedOutlet.findOne.mockRejectedValueOnce(new Error('fail'));
        await expect(
            service.getSchemeTransactionDisableOutlet('123', { authorization: 'auth', 'x-device-id': 'device' })
        ).rejects.toThrow(NotFoundException);
    });

    it('should enable outlet on scheme', async () => {
        const token = { authorization: 'auth', 'x-device-id': 'device' };
        const outlet = { posIds: [] };
        mockedOutlet.findOne.mockResolvedValueOnce(outlet as any);
        mockedAxios.post.mockResolvedValueOnce({ data: 'enabled' });

        const result = await service.getSchemeTransactionEnableOutlet('999', token);
        expect(result).toEqual({ data: 'enabled' });
        expect(mockedAxios.post).toHaveBeenCalledWith(
            'http://scheme-service/enable',
            expect.objectContaining({
                outletId: '999',
                enableTerminalsOnly: false,
                terminals: [],
            }),
            expect.objectContaining({
                headers: { Authorization: 'auth', 'x-device-id': 'device' },
            })
        );
    });

    it('should throw NotFoundException when enabling outlet fails', async () => {
        mockedOutlet.findOne.mockRejectedValueOnce(new Error('fail'));
        await expect(
            service.getSchemeTransactionEnableOutlet('123', { authorization: 'auth', 'x-device-id': 'device' })
        ).rejects.toThrow(NotFoundException);
    });
});
