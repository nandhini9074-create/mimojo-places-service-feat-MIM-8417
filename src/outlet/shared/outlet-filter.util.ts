import { WhereOptions, Op } from 'sequelize';
import { GetOutletDto } from '../dtos/get-outlet-dto';
import { GetOutletSortEnum } from '../enums/outlet-sort-enum';

export const applyOutletFilter = (getOutletRequestDto: GetOutletDto, where: WhereOptions) => {
  if (getOutletRequestDto.search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${getOutletRequestDto.search}%` } },
      { outletNo: { [Op.iLike]: `%${getOutletRequestDto.search}%` } },
    ];
  }

  if (getOutletRequestDto.status) {
    where[Op.and] = [{ status: { [Op.eq]: getOutletRequestDto.status.toString() } }];
  }
};

export const applyOutletSorting = (getOutletRequestDto: GetOutletDto, order: [string, string][]) => {
  if (getOutletRequestDto.sort) {
    if (getOutletRequestDto.sort.sortBy === GetOutletSortEnum.status) {
      order.push(['status', getOutletRequestDto.sort.sortDirection.toString()]);
    } else if (getOutletRequestDto.sort.sortBy === GetOutletSortEnum.fastPaymentStatus) {
      order.push([GetOutletSortEnum.fastPaymentStatus, getOutletRequestDto.sort.sortDirection.toString()]);
    } else if (getOutletRequestDto.sort.sortOn === GetOutletSortEnum.outletNo) {
      order.push([GetOutletSortEnum.outletNo, getOutletRequestDto.sort.sortDirection.toString()]);
    } else {
      order.push(['created_at', 'DESC']);
    }
  }
};
