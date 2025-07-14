import { IsOptional, IsString, IsNumber, IsArray, IsDateString, IsIn, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SearchUsersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  @IsIn(['male', 'female', 'other'])
  gender?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(13)
  @Max(120)
  minAge?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(13)
  @Max(120)
  maxAge?: number;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => typeof value === 'string' ? value.split(',') : value)
  interests?: string[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => typeof value === 'string' ? value.split(',') : value)
  skills?: string[];

  @IsOptional()
  @IsDateString()
  joinedAfter?: string;

  @IsOptional()
  @IsDateString()
  joinedBefore?: string;

  @IsOptional()
  @IsDateString()
  lastActiveAfter?: string;

  @IsOptional()
  @IsString()
  @IsIn(['firstName', 'lastName', 'createdAt', 'lastLoginAt'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}