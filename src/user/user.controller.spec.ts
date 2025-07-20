import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import {
  mockSearchUsersDto,
  mockUsers,
  mockUser,
  mockUpdateProfileDto,
} from '../test/test-helpers';

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;

  const mockUserService = {
    searchUsers: jest.fn(),
    updateProfile: jest.fn(),
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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

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
        `Search request received: ${JSON.stringify(mockSearchUsersDto)}`,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Search completed: Found 3 users, page 1/1',
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
        sortOrder: 'DESC' as const,
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
        new Error('Database connection failed'),
      );

      await expect(controller.searchUsers(mockSearchUsersDto)).rejects.toThrow(
        'Database connection failed',
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
        sortOrder: 'DESC' as const,
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

  describe('updateProfile', () => {
    const mockRequest = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      },
    };

    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, ...mockUpdateProfileDto };

      mockUserService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(
        mockRequest,
        mockUpdateProfileDto,
      );

      expect(result).toEqual({
        message: 'Profile updated successfully',
        user: updatedUser,
      });

      expect(userService.updateProfile).toHaveBeenCalledWith(
        mockRequest.user.id,
        mockUpdateProfileDto,
      );
      expect(userService.updateProfile).toHaveBeenCalledTimes(1);
    });

    it('should handle partial profile updates', async () => {
      const partialUpdate = { bio: 'New bio only' };
      const updatedUser = { ...mockUser, bio: 'New bio only' };

      mockUserService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(mockRequest, partialUpdate);

      expect(result).toEqual({
        message: 'Profile updated successfully',
        user: updatedUser,
      });

      expect(userService.updateProfile).toHaveBeenCalledWith(
        mockRequest.user.id,
        partialUpdate,
      );
    });

    it('should log profile update request and completion', async () => {
      const updatedUser = { ...mockUser, ...mockUpdateProfileDto };

      mockUserService.updateProfile.mockResolvedValue(updatedUser);

      await controller.updateProfile(mockRequest, mockUpdateProfileDto);

      expect(mockLogger.log).toHaveBeenCalledWith(
        `Profile update request for user ${mockRequest.user.id}: ${JSON.stringify(mockUpdateProfileDto)}`,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Profile updated successfully for user ${mockRequest.user.id}`,
      );
    });

    it('should handle service errors', async () => {
      mockUserService.updateProfile.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        controller.updateProfile(mockRequest, mockUpdateProfileDto),
      ).rejects.toThrow('Database connection failed');

      expect(userService.updateProfile).toHaveBeenCalledWith(
        mockRequest.user.id,
        mockUpdateProfileDto,
      );
    });

    it('should handle user not found errors', async () => {
      mockUserService.updateProfile.mockRejectedValue(
        new Error('User not found'),
      );

      await expect(
        controller.updateProfile(mockRequest, mockUpdateProfileDto),
      ).rejects.toThrow('User not found');
    });

    it('should handle validation errors', async () => {
      const invalidUpdateDto = {
        firstName: '', // Invalid empty string
        bio: 'a'.repeat(501), // Too long
      };

      const updatedUser = { ...mockUser, ...invalidUpdateDto };
      mockUserService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(
        mockRequest,
        invalidUpdateDto,
      );

      expect(result).toBeDefined();
      expect(userService.updateProfile).toHaveBeenCalledWith(
        mockRequest.user.id,
        invalidUpdateDto,
      );
    });

    it('should handle date of birth updates', async () => {
      const updateWithDate = {
        ...mockUpdateProfileDto,
        dateOfBirth: '1995-06-15',
      };
      const updatedUser = {
        ...mockUser,
        ...updateWithDate,
        dateOfBirth: new Date('1995-06-15'),
      };

      mockUserService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(
        mockRequest,
        updateWithDate,
      );

      expect(result.user.dateOfBirth).toEqual(new Date('1995-06-15'));
      expect(userService.updateProfile).toHaveBeenCalledWith(
        mockRequest.user.id,
        updateWithDate,
      );
    });

    it('should handle empty update requests', async () => {
      const emptyUpdate = {};
      const updatedUser = mockUser;

      mockUserService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(mockRequest, emptyUpdate);

      expect(result).toEqual({
        message: 'Profile updated successfully',
        user: updatedUser,
      });

      expect(userService.updateProfile).toHaveBeenCalledWith(
        mockRequest.user.id,
        emptyUpdate,
      );
    });

    it('should handle large data updates', async () => {
      const largeUpdate = {
        ...mockUpdateProfileDto,
        interests: Array(10).fill('interest'),
        skills: Array(20).fill('skill'),
      };
      const updatedUser = { ...mockUser, ...largeUpdate };

      mockUserService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(mockRequest, largeUpdate);

      expect(result.user.interests).toHaveLength(10);
      expect(result.user.skills).toHaveLength(20);
      expect(userService.updateProfile).toHaveBeenCalledWith(
        mockRequest.user.id,
        largeUpdate,
      );
    });
  });
});
