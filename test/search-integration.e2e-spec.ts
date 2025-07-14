import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/entities/user.entity';
import { Repository } from 'typeorm';
import { mockUsers } from '../src/test/test-helpers';

describe('Search Integration (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear database before each test
    await userRepository.clear();
    
    // Insert test users
    await userRepository.save(mockUsers);
  });

  describe('/users/search (GET)', () => {
    it('should return all active users with default pagination', () => {
      return request(app.getHttpServer())
        .get('/users/search')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(3);
          expect(res.body.pagination).toEqual({
            page: 1,
            limit: 10,
            total: 3,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          });
        });
    });

    it('should search users by name', () => {
      return request(app.getHttpServer())
        .get('/users/search?search=John')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(1);
          expect(res.body.users[0].firstName).toBe('John');
        });
    });

    it('should search users by email', () => {
      return request(app.getHttpServer())
        .get('/users/search?search=jane@example.com')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(1);
          expect(res.body.users[0].email).toBe('jane@example.com');
        });
    });

    it('should filter users by city', () => {
      return request(app.getHttpServer())
        .get('/users/search?city=Istanbul')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(1);
          expect(res.body.users[0].city).toBe('Istanbul');
        });
    });

    it('should filter users by country', () => {
      return request(app.getHttpServer())
        .get('/users/search?country=Turkey')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(3);
          res.body.users.forEach(user => {
            expect(user.country).toBe('Turkey');
          });
        });
    });

    it('should filter users by gender', () => {
      return request(app.getHttpServer())
        .get('/users/search?gender=male')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(3);
          res.body.users.forEach(user => {
            expect(user.gender).toBe('male');
          });
        });
    });

    it('should filter users by interests', () => {
      return request(app.getHttpServer())
        .get('/users/search?interests=coding')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(1);
          expect(res.body.users[0].interests).toContain('coding');
        });
    });

    it('should filter users by skills', () => {
      return request(app.getHttpServer())
        .get('/users/search?skills=javascript')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(1);
          expect(res.body.users[0].skills).toContain('javascript');
        });
    });

    it('should sort users by firstName ASC', () => {
      return request(app.getHttpServer())
        .get('/users/search?sortBy=firstName&sortOrder=ASC')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(3);
          expect(res.body.users[0].firstName).toBe('Jane');
          expect(res.body.users[1].firstName).toBe('John');
          expect(res.body.users[2].firstName).toBe('Test');
        });
    });

    it('should sort users by firstName DESC', () => {
      return request(app.getHttpServer())
        .get('/users/search?sortBy=firstName&sortOrder=DESC')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(3);
          expect(res.body.users[0].firstName).toBe('Test');
          expect(res.body.users[1].firstName).toBe('John');
          expect(res.body.users[2].firstName).toBe('Jane');
        });
    });

    it('should handle pagination correctly', () => {
      return request(app.getHttpServer())
        .get('/users/search?page=1&limit=2')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(2);
          expect(res.body.pagination).toEqual({
            page: 1,
            limit: 2,
            total: 3,
            totalPages: 2,
            hasNext: true,
            hasPrev: false,
          });
        });
    });

    it('should handle second page correctly', () => {
      return request(app.getHttpServer())
        .get('/users/search?page=2&limit=2')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(1);
          expect(res.body.pagination).toEqual({
            page: 2,
            limit: 2,
            total: 3,
            totalPages: 2,
            hasNext: false,
            hasPrev: true,
          });
        });
    });

    it('should combine multiple filters', () => {
      return request(app.getHttpServer())
        .get('/users/search?city=Istanbul&gender=male&interests=coding')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(1);
          expect(res.body.users[0].city).toBe('Istanbul');
          expect(res.body.users[0].gender).toBe('male');
          expect(res.body.users[0].interests).toContain('coding');
        });
    });

    it('should return empty results for non-matching filters', () => {
      return request(app.getHttpServer())
        .get('/users/search?city=NonExistentCity')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(0);
          expect(res.body.pagination.total).toBe(0);
        });
    });

    it('should handle invalid page numbers gracefully', () => {
      return request(app.getHttpServer())
        .get('/users/search?page=999')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(0);
          expect(res.body.pagination.page).toBe(999);
          expect(res.body.pagination.hasNext).toBe(false);
          expect(res.body.pagination.hasPrev).toBe(true);
        });
    });

    it('should handle case-insensitive search', () => {
      return request(app.getHttpServer())
        .get('/users/search?search=JOHN')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(1);
          expect(res.body.users[0].firstName).toBe('John');
        });
    });

    it('should handle partial name matching', () => {
      return request(app.getHttpServer())
        .get('/users/search?search=Jo')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(1);
          expect(res.body.users[0].firstName).toBe('John');
        });
    });

    it('should handle multiple interests filter', () => {
      return request(app.getHttpServer())
        .get('/users/search?interests=coding,music')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(1);
          expect(res.body.users[0].interests).toEqual(expect.arrayContaining(['coding', 'music']));
        });
    });

    it('should handle multiple skills filter', () => {
      return request(app.getHttpServer())
        .get('/users/search?skills=javascript,typescript')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(1);
          expect(res.body.users[0].skills).toEqual(expect.arrayContaining(['javascript', 'typescript']));
        });
    });

    it('should validate invalid gender values', () => {
      return request(app.getHttpServer())
        .get('/users/search?gender=invalid')
        .expect(400);
    });

    it('should validate invalid age values', () => {
      return request(app.getHttpServer())
        .get('/users/search?minAge=150')
        .expect(400);
    });

    it('should validate invalid sort fields', () => {
      return request(app.getHttpServer())
        .get('/users/search?sortBy=invalidField')
        .expect(400);
    });

    it('should validate invalid sort order', () => {
      return request(app.getHttpServer())
        .get('/users/search?sortOrder=INVALID')
        .expect(400);
    });

    it('should validate invalid page numbers', () => {
      return request(app.getHttpServer())
        .get('/users/search?page=0')
        .expect(400);
    });

    it('should validate invalid limit values', () => {
      return request(app.getHttpServer())
        .get('/users/search?limit=101')
        .expect(400);
    });

    it('should exclude password field from response', () => {
      return request(app.getHttpServer())
        .get('/users/search')
        .expect(200)
        .expect((res) => {
          res.body.users.forEach(user => {
            expect(user.password).toBeUndefined();
          });
        });
    });

    it('should only return active users', async () => {
      // Create inactive user
      const inactiveUser = {
        ...mockUsers[0],
        id: 'inactive-user-id',
        email: 'inactive@example.com',
        isActive: false,
      };
      await userRepository.save(inactiveUser);

      return request(app.getHttpServer())
        .get('/users/search')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(3); // Only active users
          res.body.users.forEach(user => {
            expect(user.isActive).toBe(true);
          });
        });
    });
  });

  describe('search performance', () => {
    it('should handle large result sets efficiently', async () => {
      // Create many users for performance testing
      const manyUsers = Array.from({ length: 100 }, (_, i) => ({
        ...mockUsers[0],
        id: `user-${i}`,
        email: `user${i}@example.com`,
        firstName: `User${i}`,
      }));
      
      await userRepository.save(manyUsers);

      const start = Date.now();
      
      await request(app.getHttpServer())
        .get('/users/search?limit=50')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(50);
          expect(res.body.pagination.total).toBe(103); // 100 + 3 original
        });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});