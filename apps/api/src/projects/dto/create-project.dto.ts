import { IsString, IsNumber, IsOptional, IsArray, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectType, ProjectStatus } from '@prisma/client';

export class CreateProjectDto {
  @IsString()                                   name:              string;
  @IsEnum(ProjectType)                          type:              ProjectType;
  @IsString()                                   subtype:           string;
  @IsString()                                   ruptlCode:         string;
  @IsEnum(ProjectStatus)                        status:            ProjectStatus;
  @IsOptional() @IsString()                     codTargetRUPTL?:   string;
  @IsOptional() @IsString()                     codKontraktual?:   string;
  @IsOptional() @IsString()                     codEstimasi?:      string;
  @IsOptional() @IsString()                     issueType?:        string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100)  progressPlan?:      number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100)  progressRealisasi?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-100) @Max(100) deviasi?:         number;
  @IsOptional() @Type(() => Number) @IsNumber() lat?:              number;
  @IsOptional() @Type(() => Number) @IsNumber() lng?:              number;
  @IsString()                                   island:            string;
  @IsString()                                   province:          string;
  @IsString()                                   gridSystem:        string;
  @IsOptional() @Type(() => Number) @IsNumber() capacity?:         number;
  @IsOptional() @IsString()                     capacityUnit?:     string;
  @IsOptional() @Type(() => Number) @IsNumber() circuitLength?:    number;
  @IsOptional() @IsString()                     voltageLevel?:     string;
  @IsOptional() @IsString()                     lineFromId?:       string;
  @IsOptional() @IsString()                     lineToId?:         string;
  @IsOptional() @IsString()                     detail?:           string;
  @IsOptional() @IsArray() @IsString({ each: true }) urgencyCategory?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) relatedProjects?: string[];
}
