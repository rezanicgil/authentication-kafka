import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { mockRegisterDto, mockLoginDto, mockUser } from '../test/test-helpers';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const expectedResult = {
        message: 'User registered successfully',
        user: mockUser,
        token: 'jwt-token',
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(mockRegisterDto);

      expect(result).toEqual(expectedResult);
      expect(authService.register).toHaveBeenCalledWith(mockRegisterDto);
      expect(authService.register).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if user already exists', async () => {
      mockAuthService.register.mockRejectedValue(
        new ConflictException('User with this email already exists')
      );

      await expect(controller.register(mockRegisterDto)).rejects.toThrow(
        ConflictException
      );
      expect(authService.register).toHaveBeenCalledWith(mockRegisterDto);
    });

    it('should handle validation errors', async () => {
      const invalidDto = {
        ...mockRegisterDto,
        email: 'invalid-email',
      };

      mockAuthService.register.mockRejectedValue(
        new Error('Validation failed')
      );

      await expect(controller.register(invalidDto)).rejects.toThrow();
      expect(authService.register).toHaveBeenCalledWith(invalidDto);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const expectedResult = {
        message: 'Login successful',
        user: mockUser,
        token: 'jwt-token',
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(mockLoginDto);

      expect(result).toEqual(expectedResult);
      expect(authService.login).toHaveBeenCalledWith(mockLoginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials')
      );

      await expect(controller.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException
      );
      expect(authService.login).toHaveBeenCalledWith(mockLoginDto);
    });

    it('should handle non-existent user', async () => {
      const nonExistentUserDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials')
      );

      await expect(controller.login(nonExistentUserDto)).rejects.toThrow(
        UnauthorizedException
      );
      expect(authService.login).toHaveBeenCalledWith(nonExistentUserDto);
    });

    it('should handle wrong password', async () => {
      const wrongPasswordDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials')
      );

      await expect(controller.login(wrongPasswordDto)).rejects.toThrow(
        UnauthorizedException
      );
      expect(authService.login).toHaveBeenCalledWith(wrongPasswordDto);
    });
  });

  describe('edge cases', () => {
    it('should handle empty request body for register', async () => {
      const emptyDto = {} as any;

      mockAuthService.register.mockRejectedValue(
        new Error('Validation failed')
      );

      await expect(controller.register(emptyDto)).rejects.toThrow();
      expect(authService.register).toHaveBeenCalledWith(emptyDto);
    });

    it('should handle empty request body for login', async () => {
      const emptyDto = {} as any;

      mockAuthService.login.mockRejectedValue(
        new Error('Validation failed')
      );

      await expect(controller.login(emptyDto)).rejects.toThrow();
      expect(authService.login).toHaveBeenCalledWith(emptyDto);
    });
  });
});