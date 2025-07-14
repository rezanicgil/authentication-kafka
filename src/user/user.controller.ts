import { Controller, Get, Query, ClassSerializerInterceptor, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { SearchUsersDto } from '../dto/search-users.dto';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('search')
  async searchUsers(@Query() searchDto: SearchUsersDto) {
    const result = await this.userService.searchUsers(searchDto);
    
    return {
      users: result.users,
      pagination: {
        page: searchDto.page,
        limit: searchDto.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / searchDto.limit),
        hasNext: searchDto.page < Math.ceil(result.total / searchDto.limit),
        hasPrev: searchDto.page > 1,
      },
    };
  }
}