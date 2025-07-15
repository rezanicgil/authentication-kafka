import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { KafkaService } from '../kafka/kafka.service';

export const createMockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  merge: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getMany: jest.fn(),
  })),
});

export const createMockJwtService = () => ({
  sign: jest.fn(),
  verify: jest.fn(),
});

export const createMockKafkaService = () => ({
  sendUserEvent: jest.fn(),
});

export const createMockLogger = () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

export const createTestingModule = async (providers: any[] = []) => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ...providers,
      {
        provide: getRepositoryToken(User),
        useValue: createMockRepository(),
      },
      {
        provide: JwtService,
        useValue: createMockJwtService(),
      },
      {
        provide: KafkaService,
        useValue: createMockKafkaService(),
      },
    ],
  }).compile();

  return module;
};

export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  password: 'hashed-password',
  dateOfBirth: new Date('1990-01-01'),
  gender: 'male',
  city: 'Istanbul',
  country: 'Turkey',
  bio: 'Test bio',
  interests: ['coding', 'music'],
  skills: ['javascript', 'typescript'],
  lastLoginAt: new Date(),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockUsers = [
  mockUser,
  {
    ...mockUser,
    id: 'test-user-id-2',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    city: 'Ankara',
    interests: ['reading', 'travel'],
    skills: ['python', 'java'],
  },
  {
    ...mockUser,
    id: 'test-user-id-3',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Smith',
    city: 'Izmir',
    interests: ['sports', 'gaming'],
    skills: ['c++', 'rust'],
  },
];

export const mockRegisterDto = {
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  password: 'password123',
};

export const mockLoginDto = {
  email: 'test@example.com',
  password: 'password123',
};

export const mockSearchUsersDto = {
  search: 'test',
  city: 'Istanbul',
  country: 'Turkey',
  gender: 'male',
  minAge: 25,
  maxAge: 35,
  interests: ['coding'],
  skills: ['javascript'],
  sortBy: 'firstName',
  sortOrder: 'ASC' as 'ASC' | 'DESC',
  page: 1,
  limit: 10,
};

export const mockUpdateProfileDto = {
  firstName: 'Updated',
  lastName: 'User',
  bio: 'Updated bio',
  city: 'Ankara',
  country: 'Turkey',
  interests: ['reading', 'travel'],
  skills: ['python', 'java'],
};