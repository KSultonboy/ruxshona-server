import { IsString, MaxLength } from 'class-validator';

export class RemoveShiftPhotoDto {
  @IsString()
  @MaxLength(500)
  photo!: string;
}
