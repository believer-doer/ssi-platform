import "reflect-metadata";
import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class CreateRevocationListDto {
  @IsString()
  issuerDid!: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  statusListUri?: string;
}

export class RevokeCredentialDto {
  @IsString()
  credentialId!: string;
}

export class ListIdParamsDto {
  @IsString()
  listId!: string;
}

export class ListRevocationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
