import { getModelToken } from "@nestjs/sequelize";
import { Transaction } from "sequelize";
import { FindOptions } from "sequelize";
import { FavoriteOutletService } from "../favorite-outlet.service";

describe("FavoriteOutletService", () => {
    let service: FavoriteOutletService;
    let favoriteOutletModel: any;

    beforeEach(() => {
        favoriteOutletModel = {
            findOne: jest.fn(),
            create: jest.fn(),
            destroy: jest.fn(),
        };

        service = new FavoriteOutletService(favoriteOutletModel);
    });

    describe("markFavorite", () => {
        it("should call insert when mark is true", async () => {
            const insertSpy = jest.spyOn(service, "insert").mockResolvedValue(undefined);

            await service.markFavorite("user123", "outlet456", true, {} as Transaction);

            expect(insertSpy).toHaveBeenCalledWith("user123", "outlet456", expect.any(Object));
        });

        it("should call deleteByUserIdOutletId when mark is false", async () => {
            const deleteSpy = jest.spyOn(service, "deleteByUserIdOutletId").mockResolvedValue(undefined);

            await service.markFavorite("user123", "outlet456", false, {} as Transaction);

            expect(deleteSpy).toHaveBeenCalledWith("user123", "outlet456", expect.any(Object));
        });
    });

    describe("insert", () => {
        it("should create a new favorite outlet if not already existing", async () => {
            favoriteOutletModel.findOne.mockResolvedValue(null);
            favoriteOutletModel.create.mockResolvedValue({});

            await service.insert("user123", "outlet456", {} as Transaction);

            expect(favoriteOutletModel.findOne).toHaveBeenCalledWith({
                where: { outletId: "outlet456", userId: "user123" }
            });

            expect(favoriteOutletModel.create).toHaveBeenCalledWith({
                userId: "user123",
                outletId: "outlet456"
            }, { transaction: {} });
        });

        it("should not create a new favorite outlet if already existing", async () => {
            favoriteOutletModel.findOne.mockResolvedValue({ userId: "user123", outletId: "outlet456" });

            await service.insert("user123", "outlet456", {} as Transaction);

            expect(favoriteOutletModel.findOne).toHaveBeenCalled();
            expect(favoriteOutletModel.create).not.toHaveBeenCalled();
        });
    });

    describe("deleteByUserIdOutletId", () => {
        it("should delete favorite outlet entry", async () => {
            favoriteOutletModel.destroy.mockResolvedValue(1);

            await service.deleteByUserIdOutletId("user123", "outlet456", {} as Transaction);

            expect(favoriteOutletModel.destroy).toHaveBeenCalledWith({
                where: { userId: "user123", outletId: "outlet456" },
                transaction: {}
            });
        });
    });

    describe("findByUserIdOutletId", () => {
        it("should return favorite outlet if found", async () => {
            const mockFavorite = { userId: "user123", outletId: "outlet456" };
            favoriteOutletModel.findOne.mockResolvedValue(mockFavorite);

            const result = await service.findByUserIdOutletId("user123", "outlet456");

            expect(favoriteOutletModel.findOne).toHaveBeenCalledWith({
                where: { userId: "user123", outletId: "outlet456" }
            });
            expect(result).toEqual(mockFavorite);
        });

        it("should return null if favorite outlet is not found", async () => {
            favoriteOutletModel.findOne.mockResolvedValue(null);

            const result = await service.findByUserIdOutletId("user123", "outlet456");

            expect(favoriteOutletModel.findOne).toHaveBeenCalled();
            expect(result).toBeNull();
        });
    });
});
