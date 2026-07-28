import { Module } from "@nestjs/common";
import { DistanceController } from "./distance.controller";
import { DistanceService } from "./services/distance.service";

@Module({
    controllers: [DistanceController],
    providers: [DistanceService],
    exports: [DistanceService]
})

export class DistanceModule { }