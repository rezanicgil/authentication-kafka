import {
  Controller,
  Get,
  Put,
  Query,
  Body,
  Request,
  ClassSerializerInterceptor,
  UseInterceptors,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { UserService } from './user.service';
import { SearchUsersDto } from '../dto/search-users.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Get('search')
  async searchUsers(@Query() searchDto: SearchUsersDto) {
    this.logger.log(`Search request received: ${JSON.stringify(searchDto)}`);

    const result = await this.userService.searchUsers(searchDto);

    this.logger.log(
      `Search completed: Found ${result.total} users, page ${searchDto.page}/${Math.ceil(result.total / searchDto.limit)}`,
    );

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

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Request() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    this.logger.log(
      `Profile update request for user ${req.user.id}: ${JSON.stringify(updateProfileDto)}`,
    );

    const updatedUser = await this.userService.updateProfile(
      req.user.id,
      updateProfileDto,
    );

    this.logger.log(`Profile updated successfully for user ${req.user.id}`);

    return {
      message: 'Profile updated successfully',
      user: updatedUser,
    };
  }
}
