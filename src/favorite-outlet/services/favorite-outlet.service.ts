import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { FindOptions, Transaction } from "sequelize";
import { FavoriteOutlet } from "../models/favorite-outlet.model";

@Injectable()
export class FavoriteOutletService {
    constructor(@InjectModel(FavoriteOutlet)
    private readonly favoriteOutletModel: typeof FavoriteOutlet) { }

    async markFavorite(userId: string, outletId: string, mark: boolean, transaction: Transaction) {
        if (mark)
            await this.insert(userId, outletId, transaction);
        else
            await this.deleteByUserIdOutletId(userId, outletId, transaction);
    }

    async insert(userId: string, outletId: string, transaction: Transaction) {
        const userOptions: FindOptions<FavoriteOutlet> = {
            where: {
                outletId: outletId,
                userId: userId
            }
        };
        const favorite = await this.favoriteOutletModel.findOne(userOptions);
        if (favorite == null) {
            return await this.favoriteOutletModel.create({
                userId: userId,
                outletId: outletId
            }, { transaction });
        }
    }

    async deleteByUserIdOutletId(userId: string, outletId: string, transaction: Transaction) {
        await this.favoriteOutletModel.destroy({
            where: { userId: userId, outletId: outletId },
            transaction: transaction
        })
    }

    async findByUserIdOutletId(userId: string, outletId: string) {
        return await this.favoriteOutletModel.findOne({
            where: { userId: userId, outletId: outletId }
        })
    }
}