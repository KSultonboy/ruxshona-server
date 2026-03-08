import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateTelegramMembershipDto {
  @IsBoolean()
  verifiedMember: boolean;

  @IsOptional()
  @IsString()
  lastMembershipStatus?: string;
}
