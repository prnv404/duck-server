import { InputType, Field, Int } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import {
    IsNotEmpty,
    IsString,
    IsMobilePhone,
    IsOptional,
    IsBoolean,
    IsInt,
    IsUrl,
    IsUUID,
    Matches,
    IsNumberString,
    Min,
    Length,
} from 'class-validator';

@InputType()
export class CreateUserInput {
    @Field(() => String)
    @IsNotEmpty()
    @IsString()
    @Transform(({ value }) => value?.trim().toLowerCase())
    @Length(3, 30)
    @Matches(/^[a-z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' })
    username: string;

    @Field(() => String)
    @IsNotEmpty()
    @Transform(({ value }) => value?.replace(/\s+/g, ''))
    @IsMobilePhone(undefined, {}, { message: 'Invalid phone number format' })
    phone: string;

    @Field(() => String)
    @IsOptional()
    @IsNumberString({}, { message: 'OTP must contain only digits' })
    @Length(4, 6, { message: 'OTP must be between 4 and 6 digits' })
    otp?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    @Length(2, 100)
    fullName?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    targetExam?: string;
}

@InputType()
export class UpdateUserInput {
    @Field(() => String)
    @IsNotEmpty()
    @IsUUID('4', { message: 'Invalid User ID format' })
    id: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim().toLowerCase())
    @Length(3, 30)
    @Matches(/^[a-z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' })
    username?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    @Length(2, 100)
    fullName?: string | null;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsUrl({}, { message: 'Avatar must be a valid URL' })
    avatarUrl?: string | null;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    targetExam?: string | null;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    @IsNotEmpty({ message: 'FCM token cannot be empty' })
    fcmToken?: string | null;

    @Field(() => Boolean, { nullable: true })
    @IsOptional()
    @IsBoolean({ message: 'Notification enabled must be a boolean value' })
    notificationEnabled?: boolean;
}

@InputType()
export class UpdateUserStatsInput {
    @Field(() => String)
    @IsNotEmpty()
    @IsUUID('4', { message: 'Invalid User ID format' })
    id: string;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    @IsInt()
    @Min(0, { message: 'XP cannot be negative' })
    totalXp?: number;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    @IsInt()
    @Min(1, { message: 'Level must be at least 1' })
    level?: number;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    @IsInt()
    @Min(0, { message: 'XP required cannot be negative' })
    xpToNextLevel?: number;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    @IsInt()
    @Min(0, { message: 'Current streak cannot be negative' })
    currentStreak?: number;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    @IsInt()
    @Min(0, { message: 'Longest streak cannot be negative' })
    longestStreak?: number;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    @IsInt()
    @Min(0, { message: 'Total quizzes cannot be negative' })
    totalQuizzesCompleted?: number;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    @IsInt()
    @Min(0, { message: 'Total questions cannot be negative' })
    totalQuestionsAttempted?: number;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    @IsInt()
    @Min(0, { message: 'Correct answers cannot be negative' })
    totalCorrectAnswers?: number;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    @IsNumberString({}, { message: 'Accuracy must be a numeric string' })
    overallAccuracy?: string;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    @IsInt()
    @Min(0, { message: 'Practice time cannot be negative' })
    totalPracticeTimeMinutes?: number;
}
