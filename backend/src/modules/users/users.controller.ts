import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Request() req) {
    return req.user;
  }

  @Patch('profile')
  async updateProfile(@Request() req, @Body() updateData: { name?: string; avatarUrl?: string }) {
    return this.usersService.update(req.user.id, updateData);
  }
}
