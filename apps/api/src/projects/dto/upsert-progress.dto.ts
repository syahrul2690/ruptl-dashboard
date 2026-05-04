import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class ProgressRowDto {
  @IsString()
  yearMonth: string; // "YYYY-MM"

  @IsNumber()
  @Min(0)
  @Max(100)
  plan: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  actual?: number | null;
}

export class UpsertProgressDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgressRowDto)
  rows: ProgressRowDto[];
}
