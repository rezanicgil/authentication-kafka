import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { User } from '../entities/user.entity';
import { ConflictException, Logger } from '@nestjs/common';
import { mockRegisterDto, mockUsers, mockUser, mockSearchUsersDto, createMockRepository } from '../test/test-helpers';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('UserService', () => {
  let service: UserService;
  let userRepository: Repository<User>;
  let logger: Logger;

  const mockUserRepository = createMockRepository();

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    
    // Mock the logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation(mockLogger.log);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const hashedPassword = 'hashed-password';
      
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await service.create(mockRegisterDto);

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockRegisterDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(mockRegisterDto.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        ...mockRegisterDto,
        password: hashedPassword,
      });
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
    });

    it('should throw ConflictException if user already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.create(mockRegisterDto)).rejects.toThrow(
        ConflictException
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockRegisterDto.email },
      });
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should handle bcrypt hashing errors', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));

      await expect(service.create(mockRegisterDto)).rejects.toThrow(
        'Hashing failed'
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockRegisterDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should handle database save errors', async () => {
      const hashedPassword = 'hashed-password';
      
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockRejectedValue(new Error('Database save failed'));
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      await expect(service.create(mockRegisterDto)).rejects.toThrow(
        'Database save failed'
      );

      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email);

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
    });

    it('should handle database errors', async () => {
      mockUserRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.findByEmail(mockUser.email)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('nonexistent-id');

      expect(result).toBeNull();
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'nonexistent-id' },
      });
    });
  });

  describe('validatePassword', () => {
    it('should validate password correctly', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validatePassword('password123', 'hashed-password');

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
    });

    it('should return false for invalid password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validatePassword('wrongpassword', 'hashed-password');

      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashed-password');
    });

    it('should handle bcrypt comparison errors', async () => {
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Comparison failed'));

      await expect(service.validatePassword('password123', 'hashed-password')).rejects.toThrow(
        'Comparison failed'
      );
    });
  });

  describe('searchUsers', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
    };

    beforeEach(() => {
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should search users successfully', async () => {
      const expectedResult = {
        users: mockUsers,
        total: 3,
      };

      mockQueryBuilder.getCount.mockResolvedValue(3);
      mockQueryBuilder.getMany.mockResolvedValue(mockUsers);

      const result = await service.searchUsers(mockSearchUsersDto);

      expect(result).toEqual(expectedResult);
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Executing search with filters: ${JSON.stringify(mockSearchUsersDto)}`
      );
      expect(mockLogger.log).toHaveBeenCalledWith('Query returned 3 total results');
      expect(mockLogger.log).toHaveBeenCalledWith('Returning 3 users for page 1');
    });

    it('should handle empty search results', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.searchUsers(mockSearchUsersDto);

      expect(result).toEqual({
        users: [],
        total: 0,
      });
    });

    it('should handle pagination correctly', async () => {
      const searchDto = {
        ...mockSearchUsersDto,
        page: 2,
        limit: 5,
      };

      mockQueryBuilder.getCount.mockResolvedValue(15);
      mockQueryBuilder.getMany.mockResolvedValue(mockUsers.slice(0, 2));

      const result = await service.searchUsers(searchDto);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5); // (page - 1) * limit
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
      expect(result.total).toBe(15);
      expect(result.users.length).toBe(2);
    });

    it('should apply search filters correctly', async () => {
      const searchDto = {
        search: 'john',
        city: 'Istanbul',
        country: 'Turkey',
        gender: 'male',
        minAge: 25,
        maxAge: 35,
        interests: ['coding'],
        skills: ['javascript'],
        sortBy: 'firstName',
        sortOrder: 'ASC' as const,
        page: 1,
        limit: 10,
      };

      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockUser]);

      await service.searchUsers(searchDto);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.isActive = :isActive',
        { isActive: true }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: '%john%' }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.city ILIKE :city',
        { city: '%Istanbul%' }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.country ILIKE :country',
        { country: '%Turkey%' }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.gender = :gender',
        { gender: 'male' }
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.firstName', 'ASC');
    });

    it('should handle age range filters', async () => {
      const searchDto = {
        minAge: 25,
        maxAge: 35,
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC' as const,
      };

      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockUser]);

      await service.searchUsers(searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.dateOfBirth >= :minBirthDate',
        { minBirthDate: expect.any(Date) }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.dateOfBirth <= :maxBirthDate',
        { maxBirthDate: expect.any(Date) }
      );
    });

    it('should handle interests and skills filters', async () => {
      const searchDto = {
        interests: ['coding', 'music'],
        skills: ['javascript', 'typescript'],
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC' as const,
      };

      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockUser]);

      await service.searchUsers(searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.interests && :interests',
        { interests: ['coding', 'music'] }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.skills && :skills',
        { skills: ['javascript', 'typescript'] }
      );
    });

    it('should handle date range filters', async () => {
      const searchDto = {
        joinedAfter: '2023-01-01',
        joinedBefore: '2023-12-31',
        lastActiveAfter: '2023-06-01',
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC' as const,
      };

      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockUser]);

      await service.searchUsers(searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.createdAt >= :joinedAfter',
        { joinedAfter: new Date('2023-01-01') }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.createdAt <= :joinedBefore',
        { joinedBefore: new Date('2023-12-31') }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.lastLoginAt >= :lastActiveAfter',
        { lastActiveAfter: new Date('2023-06-01') }
      );
    });

    it('should handle database errors during search', async () => {
      mockQueryBuilder.getCount.mockRejectedValue(new Error('Database error'));

      await expect(service.searchUsers(mockSearchUsersDto)).rejects.toThrow(
        'Database error'
      );
    });

    it('should handle query builder errors', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(5);
      mockQueryBuilder.getMany.mockRejectedValue(new Error('Query execution failed'));

      await expect(service.searchUsers(mockSearchUsersDto)).rejects.toThrow(
        'Query execution failed'
      );
    });

    it('should handle empty filters correctly', async () => {
      const emptySearchDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC' as const,
      };

      mockQueryBuilder.getCount.mockResolvedValue(10);
      mockQueryBuilder.getMany.mockResolvedValue(mockUsers);

      const result = await service.searchUsers(emptySearchDto);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.isActive = :isActive',
        { isActive: true }
      );
      expect(result.users).toEqual(mockUsers);
      expect(result.total).toBe(10);
    });
  });

  describe('createSearchQuery', () => {
    it('should create query with only active users filter when no search params provided', async () => {
      const emptySearchDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC' as const,
      };

      // Call searchUsers to trigger createSearchQuery
      mockUserRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      });

      await service.searchUsers(emptySearchDto);

      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalledWith('user');
    });
  });
});