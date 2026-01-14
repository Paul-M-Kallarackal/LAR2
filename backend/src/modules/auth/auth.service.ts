import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      email: registerDto.email,
      password: hashedPassword,
      name: registerDto.name,
      role: registerDto.role,
      avatarUrl: registerDto.avatarUrl,
    });

    const token = this.generateToken(user);
    return {
      user: this.sanitizeUser(user),
      accessToken: token,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    const token = this.generateToken(user);
    return {
      user: this.sanitizeUser(user),
      accessToken: token,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      console.error(`Login attempt failed: User not found for email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    
    if (!user.passwordHash) {
      console.error(`Login attempt failed: User ${email} has no password hash`);
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      console.error(`Login attempt failed: Invalid password for email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    
    return user;
  }

  private generateToken(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...result } = user;
    return result;
  }
}
