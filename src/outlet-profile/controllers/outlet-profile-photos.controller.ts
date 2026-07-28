import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { OutletProfilePhotosService } from "../services/outlet-profile-photos.service";
import { baseResponseHelper } from "src/helpers/base-response.helper";
import { ChangeImageOrderDto } from "src/images/dtos/change-image-order-dto";
import { ApiEndpoint } from "src/common/decorators/api-swagger";

@Controller('outlet-profile-photos')
export class OutletProfilePhotosController{
    constructor(private readonly outletProfilePhotoService:OutletProfilePhotosService,
           
    ){}

    @Get(':outletProfileId')
    @ApiEndpoint({
      summary: 'Get outlet profile photos',
      description: 'Retrieve all photos for a given outlet profile.',
      pathParams: [
        { name: 'outletProfileId', description: 'UUID of the outlet profile', type: 'string' }
      ],
    })
   async  GetOutletProfilePhotos(@Param('outletProfileId') outletProfileId:string){
       const res  = await this.outletProfilePhotoService.getOutletProfilePhotos(outletProfileId)
       return baseResponseHelper(res)
    }

    @Delete(':id')
    @ApiEndpoint({
        summary: 'Delete outlet profile photo',
        description: 'Deletes a photo by its ID from the outlet profile.',
        pathParams: [{ name: 'id', description: 'UUID of the photo to delete', type: 'string' }]
    })
    async deleteOutletProfilePhoto(@Param('id') outletProfilePhotoId:string){
    const res = await this.outletProfilePhotoService.deleteOutletProfilePhoto(outletProfilePhotoId)
    return baseResponseHelper(res)
    }

    @HttpCode(HttpStatus.OK)
    @Post('change-image-order')
    @ApiEndpoint({
        summary: 'Change image order',
        description: 'Rearrange the display order of outlet profile photos.',
        bodyType: ChangeImageOrderDto
    })
    async changeImageOrder(@Body() request: ChangeImageOrderDto) {
        const res = await this.outletProfilePhotoService.changeImageOrder(request)
        return res
    }


}