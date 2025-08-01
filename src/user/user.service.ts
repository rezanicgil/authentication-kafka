import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { RegisterDto } from '../dto/register.dto';
import { SearchUsersDto } from '../dto/search-users.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { KafkaService } from '../kafka/kafka.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly kafkaService: KafkaService,
  ) {}

  async create(registerDto: RegisterDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
    });

    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async updateProfile(
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = this.userRepository.merge(user, {
      ...updateProfileDto,
      dateOfBirth: updateProfileDto.dateOfBirth
        ? new Date(updateProfileDto.dateOfBirth)
        : user.dateOfBirth,
    });

    const savedUser = await this.userRepository.save(updatedUser);

    await this.kafkaService.sendUserEvent('user.profile_updated', {
      userId: savedUser.id,
      email: savedUser.email,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      updatedFields: Object.keys(updateProfileDto),
      timestamp: new Date().toISOString(),
    });

    return savedUser;
  }

  async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async searchUsers(
    searchDto: SearchUsersDto,
  ): Promise<{ users: User[]; total: number }> {
    this.logger.log(
      `Executing search with filters: ${JSON.stringify(searchDto)}`,
    );

    const queryBuilder = this.createSearchQuery(searchDto);

    const total = await queryBuilder.getCount();
    this.logger.log(`Query returned ${total} total results`);

    const users = await queryBuilder
      .skip((searchDto.page - 1) * searchDto.limit)
      .take(searchDto.limit)
      .getMany();

    this.logger.log(
      `Returning ${users.length} users for page ${searchDto.page}`,
    );

    return { users, total };
  }

  private createSearchQuery(
    searchDto: SearchUsersDto,
  ): SelectQueryBuilder<User> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true });

    if (searchDto.search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${searchDto.search}%` },
      );
    }

    if (searchDto.city) {
      queryBuilder.andWhere('user.city ILIKE :city', {
        city: `%${searchDto.city}%`,
      });
    }

    if (searchDto.country) {
      queryBuilder.andWhere('user.country ILIKE :country', {
        country: `%${searchDto.country}%`,
      });
    }

    if (searchDto.gender) {
      queryBuilder.andWhere('user.gender = :gender', {
        gender: searchDto.gender,
      });
    }

    if (searchDto.minAge || searchDto.maxAge) {
      const currentDate = new Date();

      if (searchDto.maxAge) {
        const minBirthDate = new Date(
          currentDate.getFullYear() - searchDto.maxAge,
          currentDate.getMonth(),
          currentDate.getDate(),
        );
        queryBuilder.andWhere('user.dateOfBirth >= :minBirthDate', {
          minBirthDate,
        });
      }

      if (searchDto.minAge) {
        const maxBirthDate = new Date(
          currentDate.getFullYear() - searchDto.minAge,
          currentDate.getMonth(),
          currentDate.getDate(),
        );
        queryBuilder.andWhere('user.dateOfBirth <= :maxBirthDate', {
          maxBirthDate,
        });
      }
    }

    if (searchDto.interests && searchDto.interests.length > 0) {
      queryBuilder.andWhere('user.interests && :interests', {
        interests: searchDto.interests,
      });
    }

    if (searchDto.skills && searchDto.skills.length > 0) {
      queryBuilder.andWhere('user.skills && :skills', {
        skills: searchDto.skills,
      });
    }

    if (searchDto.joinedAfter) {
      queryBuilder.andWhere('user.createdAt >= :joinedAfter', {
        joinedAfter: new Date(searchDto.joinedAfter),
      });
    }

    if (searchDto.joinedBefore) {
      queryBuilder.andWhere('user.createdAt <= :joinedBefore', {
        joinedBefore: new Date(searchDto.joinedBefore),
      });
    }

    if (searchDto.lastActiveAfter) {
      queryBuilder.andWhere('user.lastLoginAt >= :lastActiveAfter', {
        lastActiveAfter: new Date(searchDto.lastActiveAfter),
      });
    }

    queryBuilder.orderBy(`user.${searchDto.sortBy}`, searchDto.sortOrder);

    return queryBuilder;
  }
}
