import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/sequelize";
import { BookmarkOutlet } from "../../models/bookmark-outlet.model";
import { Transaction } from "sequelize";
import { BookmarkOutletService } from "../bookmark-outlet.service";

describe("BookmarkOutletService", () => {
    let service: BookmarkOutletService;
    let bookmarkOutletModel: typeof BookmarkOutlet;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BookmarkOutletService,
                {
                    provide: getModelToken(BookmarkOutlet),
                    useValue: {
                        findOne: jest.fn(),
                        create: jest.fn(),
                        destroy: jest.fn()
                    }
                }
            ]
        }).compile();

        service = module.get<BookmarkOutletService>(BookmarkOutletService);
        bookmarkOutletModel = module.get<typeof BookmarkOutlet>(getModelToken(BookmarkOutlet));
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("markBookmark", () => {
        it("should call insert when mark is true", async () => {
            const insertSpy = jest.spyOn(service, "insert").mockResolvedValue(undefined);
            await service.markBookmark("user1", "outlet1", true, {} as Transaction);
            expect(insertSpy).toHaveBeenCalledWith("user1", "outlet1", expect.any(Object));
        });

        it("should call deleteByUserIdOutletId when mark is false", async () => {
            const deleteSpy = jest.spyOn(service, "deleteByUserIdOutletId").mockResolvedValue(undefined);
            await service.markBookmark("user1", "outlet1", false, {} as Transaction);
            expect(deleteSpy).toHaveBeenCalledWith("user1", "outlet1", expect.any(Object));
        });
    });

    describe("insert", () => {
        it("should create a bookmark if it does not exist", async () => {
            jest.spyOn(bookmarkOutletModel, "findOne").mockResolvedValue(null);
            const createSpy = jest.spyOn(bookmarkOutletModel, "create").mockResolvedValue({} as BookmarkOutlet);
            await service.insert("user1", "outlet1", {} as Transaction);
            expect(createSpy).toHaveBeenCalledWith(
                { userId: "user1", outletId: "outlet1" },
                { transaction: expect.any(Object) }
            );
        });

        it("should not create a bookmark if it already exists", async () => {
            jest.spyOn(bookmarkOutletModel, "findOne").mockResolvedValue({} as BookmarkOutlet);
            const createSpy = jest.spyOn(bookmarkOutletModel, "create");
            await service.insert("user1", "outlet1", {} as Transaction);
            expect(createSpy).not.toHaveBeenCalled();
        });
    });

    describe("deleteByUserIdOutletId", () => {
        it("should call destroy with correct parameters", async () => {
            const destroySpy = jest.spyOn(bookmarkOutletModel, "destroy").mockResolvedValue(1);
            await service.deleteByUserIdOutletId("user1", "outlet1", {} as Transaction);
            expect(destroySpy).toHaveBeenCalledWith({
                where: { userId: "user1", outletId: "outlet1" },
                transaction: expect.any(Object)
            });
        });
    });
});
