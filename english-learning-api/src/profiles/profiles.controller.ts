import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/users/entities/user.entity';

@ApiTags('Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  @ApiOperation({ summary: '프로필 생성' })
  @ApiResponse({ status: 201, description: '프로필 생성 성공' })
  async create(@CurrentUser() user: User, @Body() dto: CreateProfileDto) {
    return this.profilesService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: '사용자의 모든 프로필 조회' })
  @ApiResponse({ status: 200, description: '프로필 목록 반환' })
  async findAll(@CurrentUser() user: User) {
    return this.profilesService.findAllByUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '프로필 단건 조회' })
  @ApiResponse({ status: 200, description: '프로필 반환' })
  @ApiResponse({ status: 404, description: '프로필 없음' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.profilesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '프로필 수정' })
  @ApiResponse({ status: 200, description: '프로필 수정 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profilesService.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '프로필 삭제' })
  @ApiResponse({ status: 204, description: '프로필 삭제 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.profilesService.remove(id, user.id);
  }
}
