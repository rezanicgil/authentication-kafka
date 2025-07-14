import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { User } from "../entities/user.entity";

export const databaseConfig: TypeOrmModuleOptions = {
  type: "postgres",
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT) || 5432,
  username: process.env.DATABASE_USERNAME || "postgres",
  password: process.env.DATABASE_PASSWORD || "password",
  database: process.env.DATABASE_NAME || "userdb",
  entities: [User],
  synchronize: true,
  logging: false,
  retryAttempts: 5,
  retryDelay: 3000,
};
