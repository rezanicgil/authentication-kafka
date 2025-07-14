import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { KafkaService } from '../kafka/kafka.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { mockRegisterDto, mockLoginDto, mockUser, createTestingModule } from '../test/test-helpers';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let jwtService: JwtService;
  let kafkaService: KafkaService;

  const mockUserService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    validatePassword: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockKafkaService = {
    sendUserEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: KafkaService,
          useValue: mockKafkaService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
    kafkaService = module.get<KafkaService>(KafkaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const token = 'jwt-token';
      const userWithoutPassword = { ...mockUser };
      delete userWithoutPassword.password;

      mockUserService.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue(token);
      mockKafkaService.sendUserEvent.mockResolvedValue(undefined);

      const result = await service.register(mockRegisterDto);

      expect(result).toEqual({
        user: userWithoutPassword,
        token,
      });

      expect(userService.create).toHaveBeenCalledWith(mockRegisterDto);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      });
      expect(kafkaService.sendUserEvent).toHaveBeenCalledWith('user.registered', {
        userId: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        timestamp: expect.any(String),
      });
    });

    it('should throw ConflictException when user already exists', async () => {
      mockUserService.create.mockRejectedValue(
        new ConflictException('User with this email already exists')
      );

      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        ConflictException
      );

      expect(userService.create).toHaveBeenCalledWith(mockRegisterDto);
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(kafkaService.sendUserEvent).not.toHaveBeenCalled();
    });

    it('should handle database errors during registration', async () => {
      mockUserService.create.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        'Database connection failed'
      );

      expect(userService.create).toHaveBeenCalledWith(mockRegisterDto);
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(kafkaService.sendUserEvent).not.toHaveBeenCalled();
    });

    it('should handle JWT signing errors', async () => {
      mockUserService.create.mockResolvedValue(mockUser);
      mockKafkaService.sendUserEvent.mockResolvedValue(undefined);
      mockJwtService.sign.mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        'JWT signing failed'
      );

      expect(userService.create).toHaveBeenCalledWith(mockRegisterDto);
      expect(kafkaService.sendUserEvent).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should handle Kafka service errors gracefully', async () => {
      const token = 'jwt-token';
      const userWithoutPassword = { ...mockUser };
      delete userWithoutPassword.password;

      mockUserService.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue(token);
      mockKafkaService.sendUserEvent.mockRejectedValue(
        new Error('Kafka unavailable')
      );

      // Should throw error if Kafka fails (based on current implementation)
      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        'Kafka unavailable'
      );
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const token = 'jwt-token';
      const userWithoutPassword = { ...mockUser };
      delete userWithoutPassword.password;

      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockUserService.validatePassword.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(token);
      mockKafkaService.sendUserEvent.mockResolvedValue(undefined);

      const result = await service.login(mockLoginDto);

      expect(result).toEqual({
        user: userWithoutPassword,
        token,
      });

      expect(userService.findByEmail).toHaveBeenCalledWith(mockLoginDto.email);
      expect(userService.validatePassword).toHaveBeenCalledWith(
        mockLoginDto.password,
        mockUser.password
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      });
      expect(kafkaService.sendUserEvent).toHaveBeenCalledWith('user.logged_in', {
        userId: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        timestamp: expect.any(String),
      });
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException
      );

      expect(userService.findByEmail).toHaveBeenCalledWith(mockLoginDto.email);
      expect(userService.validatePassword).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(kafkaService.sendUserEvent).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockUserService.validatePassword.mockResolvedValue(false);

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException
      );

      expect(userService.findByEmail).toHaveBeenCalledWith(mockLoginDto.email);
      expect(userService.validatePassword).toHaveBeenCalledWith(
        mockLoginDto.password,
        mockUser.password
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(kafkaService.sendUserEvent).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserService.findByEmail.mockResolvedValue(inactiveUser);
      mockUserService.validatePassword.mockResolvedValue(true);

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException
      );

      expect(userService.findByEmail).toHaveBeenCalledWith(mockLoginDto.email);
      expect(userService.validatePassword).toHaveBeenCalledWith(
        mockLoginDto.password,
        inactiveUser.password
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(kafkaService.sendUserEvent).not.toHaveBeenCalled();
    });

    it('should handle database errors during login', async () => {
      mockUserService.findByEmail.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        'Database connection failed'
      );

      expect(userService.findByEmail).toHaveBeenCalledWith(mockLoginDto.email);
      expect(userService.validatePassword).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(kafkaService.sendUserEvent).not.toHaveBeenCalled();
    });

    it('should handle JWT signing errors during login', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockUserService.validatePassword.mockResolvedValue(true);
      mockKafkaService.sendUserEvent.mockResolvedValue(undefined);
      mockJwtService.sign.mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        'JWT signing failed'
      );

      expect(userService.findByEmail).toHaveBeenCalledWith(mockLoginDto.email);
      expect(userService.validatePassword).toHaveBeenCalledWith(
        mockLoginDto.password,
        mockUser.password
      );
      expect(kafkaService.sendUserEvent).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should handle Kafka service errors during login gracefully', async () => {
      const token = 'jwt-token';
      const userWithoutPassword = { ...mockUser };
      delete userWithoutPassword.password;

      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockUserService.validatePassword.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(token);
      mockKafkaService.sendUserEvent.mockRejectedValue(
        new Error('Kafka unavailable')
      );

      // Should throw error if Kafka fails (based on current implementation)
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        'Kafka unavailable'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty user object from database', async () => {
      mockUserService.findByEmail.mockResolvedValue({});

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should handle malformed user data', async () => {
      const malformedUser = { ...mockUser, id: null };
      mockUserService.findByEmail.mockResolvedValue(malformedUser);
      mockUserService.validatePassword.mockResolvedValue(true);

      await expect(service.login(mockLoginDto)).rejects.toThrow();
    });
  });
});