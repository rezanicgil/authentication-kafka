import { Controller, Get, Query, ClassSerializerInterceptor, UseInterceptors, Logger } from '@nestjs/common';
import { UserService } from './user.service';
import { SearchUsersDto } from '../dto/search-users.dto';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  private readonly logger = new Logger(UserController.name);
  
  constructor(private readonly userService: UserService) {}

  @Get('search')
  async searchUsers(@Query() searchDto: SearchUsersDto) {
    this.logger.log(`Search request received: ${JSON.stringify(searchDto)}`);
    
    const result = await this.userService.searchUsers(searchDto);
    
    this.logger.log(`Search completed: Found ${result.total} users, page ${searchDto.page}/${Math.ceil(result.total / searchDto.limit)}`);
    
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