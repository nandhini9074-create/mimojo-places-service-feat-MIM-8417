import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { FindOptions, Transaction } from "sequelize";
import { BookmarkOutlet } from "../models/bookmark-outlet.model";

@Injectable()
export class BookmarkOutletService {
    constructor(@InjectModel(BookmarkOutlet)
    private readonly bookmarkOutletModel: typeof BookmarkOutlet) { }

    async markBookmark(userId: string, outletId: string, mark: boolean, transaction: Transaction) {
        if (mark)
            await this.insert(userId, outletId, transaction);
        else
            await this.deleteByUserIdOutletId(userId, outletId, transaction);
    }

    async insert(userId: string, outletId: string, transaction: Transaction) {
        const userOptions: FindOptions<BookmarkOutlet> = {
            where: {
                outletId: outletId,
                userId: userId
            }
        };
        const favorite = await this.bookmarkOutletModel.findOne(userOptions);
        if (favorite == null) {
            return await this.bookmarkOutletModel.create({
                userId: userId,
                outletId: outletId
            }, { transaction });
        }
    }

    async deleteByUserIdOutletId(userId: string, outletId: string, transaction: Transaction) {
        await this.bookmarkOutletModel.destroy({
            where: { userId: userId, outletId: outletId },
            transaction: transaction
        })
    }
}