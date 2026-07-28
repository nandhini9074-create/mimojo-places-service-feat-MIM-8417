import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Outlet } from 'src/outlet/models/outlet.model';
import { MastercardSchemeServiceProxy } from '../mc-scheme-service.proxy';

jest.mock('axios');
jest.mock('src/outlet/models/outlet.model');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedOutlet = Outlet as jest.Mocked<typeof Outlet>;

describe('MastercardSchemeServiceProxy', () => {
    let service: MastercardSchemeServiceProxy;

    const mockConfigService = {
        get: jest.fn().mockReturnValue({
            MC_SCHEME_SERVICE_OUTLET_STATUS: 'http://mock-service/status/:outletId',
            MC_SCHEME_SERVICE_DISABLE_OUTLETS: 'http://mock-service/disable',
            MC_SCHEME_SERVICE_ENABLE_OUTLETS: 'http://mock-service/enable',
        }),
    };

    const mockToken = {
        authorization: 'Bearer mockToken',
        'x-device-id': 'mockDeviceId',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MastercardSchemeServiceProxy,
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<MastercardSchemeServiceProxy>(
            MastercardSchemeServiceProxy,
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getSchemeTransactionServiceStatus', () => {
        it('should call axios.get with proper url and headers', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: 'active' });

            const res = await service.getSchemeTransactionServiceStatus(
                'outlet-123',
                mockToken,
            );

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'http://mock-service/status/outlet-123',
                {
                    headers: {
                        Authorization: mockToken.authorization,
                        'x-device-id': mockToken['x-device-id'],
                    },
                },
            );

            expect(res.data).toBe('active');
        });

        it('should throw NotFoundException on axios error', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('fail'));

            await expect(
                service.getSchemeTransactionServiceStatus('outlet-123', mockToken),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('getSchemeTransactionDisableOutlet', () => {
        it('should call axios.post with full outlet and terminals', async () => {
            mockedOutlet.findOne.mockResolvedValueOnce({
                posIds: ['t1', 't2'],
            } as any);

            mockedAxios.post.mockResolvedValueOnce({ data: 'disabled' });

            const res = await service.getSchemeTransactionDisableOutlet(
                'outlet-abc',
                mockToken,
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'http://mock-service/disable',
                {
                    outletId: 'outlet-abc',
                    disableTerminalsOnly: true,
                    terminals: ['t1', 't2'],
                },
                {
                    headers: {
                        Authorization: mockToken.authorization,
                        'x-device-id': mockToken['x-device-id'],
                    },
                },
            );

            expect(res.data).toBe('disabled');
        });

        it('should handle missing posIds', async () => {
            mockedOutlet.findOne.mockResolvedValueOnce({
                posIds: undefined,
            } as any);

            mockedAxios.post.mockResolvedValueOnce({ data: 'disabled-empty' });

            const res = await service.getSchemeTransactionDisableOutlet(
                'outlet-xyz',
                mockToken,
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'http://mock-service/disable',
                {
                    outletId: 'outlet-xyz',
                    disableTerminalsOnly: false,
                    terminals: [],
                },
                expect.any(Object),
            );

            expect(res.data).toBe('disabled-empty');
        });

        it('should throw NotFoundException on error', async () => {
            mockedOutlet.findOne.mockResolvedValueOnce({
                posIds: ['t1'],
            } as any);

            mockedAxios.post.mockRejectedValueOnce(new Error('fail'));

            await expect(
                service.getSchemeTransactionDisableOutlet('outlet-error', mockToken),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('getSchemeTransactionEnableOutlet', () => {
        it('should call axios.post with enable params', async () => {
            mockedOutlet.findOne.mockResolvedValueOnce({
                posIds: ['p1'],
            } as any);

            mockedAxios.post.mockResolvedValueOnce({ data: 'enabled' });

            const res = await service.getSchemeTransactionEnableOutlet(
                'outlet-xyz',
                mockToken,
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'http://mock-service/enable',
                {
                    outletId: 'outlet-xyz',
                    enableTerminalsOnly: true,
                    terminals: ['p1'],
                },
                expect.any(Object),
            );

            expect(res.data).toBe('enabled');
        });

        it('should handle empty posIds', async () => {
            mockedOutlet.findOne.mockResolvedValueOnce({ posIds: undefined } as any);

            mockedAxios.post.mockResolvedValueOnce({ data: 'enabled-empty' });

            const res = await service.getSchemeTransactionEnableOutlet(
                'outlet-empty',
                mockToken,
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'http://mock-service/enable',
                {
                    outletId: 'outlet-empty',
                    enableTerminalsOnly: false,
                    terminals: [],
                },
                expect.any(Object),
            );

            expect(res.data).toBe('enabled-empty');
        });

        it('should throw NotFoundException on error', async () => {
            mockedOutlet.findOne.mockResolvedValueOnce({ posIds: ['p1'] } as any);
            mockedAxios.post.mockRejectedValueOnce(new Error('fail'));

            await expect(
                service.getSchemeTransactionEnableOutlet('outlet-crash', mockToken),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
