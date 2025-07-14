import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { Logger } from '@nestjs/common';
import { mockSearchUsersDto, mockUsers } from '../test/test-helpers';

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;
  let logger: Logger;

  const mockUserService = {
    searchUsers: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
    
    // Mock the logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation(mockLogger.log);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchUsers', () => {
    it('should return users with pagination metadata', async () => {
      const serviceResult = {
        users: mockUsers,
        total: 3,
      };

      mockUserService.searchUsers.mockResolvedValue(serviceResult);

      const result = await controller.searchUsers(mockSearchUsersDto);

      expect(result).toEqual({
        users: mockUsers,
        pagination: {
          page: 1,
          limit: 10,
          total: 3,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });

      expect(userService.searchUsers).toHaveBeenCalledWith(mockSearchUsersDto);
      expect(userService.searchUsers).toHaveBeenCalledTimes(1);
    });

    it('should handle empty search results', async () => {
      const serviceResult = {
        users: [],
        total: 0,
      };

      mockUserService.searchUsers.mockResolvedValue(serviceResult);

      const result = await controller.searchUsers(mockSearchUsersDto);

      expect(result).toEqual({
        users: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('should calculate pagination correctly for multiple pages', async () => {
      const serviceResult = {
        users: mockUsers.slice(0, 2),
        total: 25,
      };

      const searchDto = {
        ...mockSearchUsersDto,
        page: 2,
        limit: 2,
      };

      mockUserService.searchUsers.mockResolvedValue(serviceResult);

      const result = await controller.searchUsers(searchDto);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 2,
        total: 25,
        totalPages: 13,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('should handle last page correctly', async () => {
      const serviceResult = {
        users: [mockUsers[0]],
        total: 21,
      };

      const searchDto = {
        ...mockSearchUsersDto,
        page: 3,
        limit: 10,
      };

      mockUserService.searchUsers.mockResolvedValue(serviceResult);

      const result = await controller.searchUsers(searchDto);

      expect(result.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 21,
        totalPages: 3,
        hasNext: false,
        hasPrev: true,
      });
    });

    it('should handle first page correctly', async () => {
      const serviceResult = {
        users: mockUsers,
        total: 25,
      };

      const searchDto = {
        ...mockSearchUsersDto,
        page: 1,
        limit: 10,
      };

      mockUserService.searchUsers.mockResolvedValue(serviceResult);

      const result = await controller.searchUsers(searchDto);

      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('should log search request and completion', async () => {
      const serviceResult = {
        users: mockUsers,
        total: 3,
      };

      mockUserService.searchUsers.mockResolvedValue(serviceResult);

      await controller.searchUsers(mockSearchUsersDto);

      expect(mockLogger.log).toHaveBeenCalledWith(
        `Search request received: ${JSON.stringify(mockSearchUsersDto)}`
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Search completed: Found 3 users, page 1/1'
      );
    });

    it('should handle different search filters', async () => {
      const customSearchDto = {
        search: 'john',
        city: 'Ankara',
        minAge: 20,
        maxAge: 30,
        page: 1,
        limit: 5,
        sortBy: 'lastName',
        sortOrder: 'DESC' as 'DESC',
      };

      const serviceResult = {
        users: [mockUsers[1]],
        total: 1,
      };

      mockUserService.searchUsers.mockResolvedValue(serviceResult);

      const result = await controller.searchUsers(customSearchDto);

      expect(result.pagination).toEqual({
        page: 1,
        limit: 5,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      expect(userService.searchUsers).toHaveBeenCalledWith(customSearchDto);
    });

    it('should handle service errors', async () => {
      mockUserService.searchUsers.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(controller.searchUsers(mockSearchUsersDto)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle edge case with single result on last page', async () => {
      const serviceResult = {
        users: [mockUsers[0]],
        total: 11,
      };

      const searchDto = {
        ...mockSearchUsersDto,
        page: 2,
        limit: 10,
      };

      mockUserService.searchUsers.mockResolvedValue(serviceResult);

      const result = await controller.searchUsers(searchDto);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 11,
        totalPages: 2,
        hasNext: false,
        hasPrev: true,
      });
    });

    it('should handle default values correctly', async () => {
      const minimalSearchDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC' as 'DESC',
      };

      const serviceResult = {
        users: mockUsers,
        total: 3,
      };

      mockUserService.searchUsers.mockResolvedValue(serviceResult);

      const result = await controller.searchUsers(minimalSearchDto as any);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(userService.searchUsers).toHaveBeenCalledWith(minimalSearchDto);
    });
  });
});