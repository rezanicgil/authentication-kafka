import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { databaseConfig } from "./config/database.config";
import { AuthModule } from "./auth/auth.module";
import { UserModule } from "./user/user.module";
import { KafkaModule } from "./kafka/kafka.module";

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    PassportModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || "your-jwt-secret-key",
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
    }),
    AuthModule,
    UserModule,
    KafkaModule,
  ],
})
export class AppModule {}
