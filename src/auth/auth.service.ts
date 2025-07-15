import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "../user/user.service";
import { RegisterDto } from "../dto/register.dto";
import { LoginDto } from "../dto/login.dto";
import { User } from "../entities/user.entity";
import { KafkaService } from "../kafka/kafka.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly kafkaService: KafkaService,
  ) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<{ user: Omit<User, 'password'>; token: string }> {
    const user = await this.userService.create(registerDto);

    await this.kafkaService.sendUserEvent("user.registered", {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      timestamp: new Date().toISOString(),
    });

    const token = this.generateToken(user);
    
    const { ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  async login(loginDto: LoginDto): Promise<{ user: Omit<User, 'password'>; token: string }> {
    const user = await this.userService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await this.userService.validatePassword(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.kafkaService.sendUserEvent("user.logged_in", {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      timestamp: new Date().toISOString(),
    });

    const token = this.generateToken(user);
    
    const { ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    return this.jwtService.sign(payload);
  }
}
