import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UserModule } from "../user/user.module";
import { KafkaModule } from "../kafka/kafka.module";

@Module({
  imports: [UserModule, KafkaModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
