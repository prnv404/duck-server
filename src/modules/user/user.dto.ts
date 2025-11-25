import { InputType, Field, Int } from "@nestjs/graphql";
import { IsNotEmpty, IsString, MinLength, IsMobilePhone, MaxLength, IsOptional, IsBoolean, IsNumber, IsUrl } from "class-validator";

@InputType({ description: 'Input data for creating a new user' })
export class CreateUserInput {

    // Unique username, required for sign-up
    @Field(() => String, { description: 'User username' })
    @IsNotEmpty()
    @IsString()
    @MinLength(3)
    username: string;

    // Phone is required and validated
    @Field(() => String, { description: 'User phone number' })
    @IsNotEmpty()
    // Use a specific locale if needed, e.g., 'en-IN'
    @IsMobilePhone() 
    phone: string; 

    // OTP is required during the creation/verification process
    @Field(() => String, { description: 'One-time password for verification' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(6)
    otp: string; 

    // Full name is optional during initial creation
    @Field(() => String, { description: 'User full name', nullable: true })
    @IsOptional()
    @IsString()
    fullName?: string;
    
    // Target Exam is optional
    @Field(() => String, { description: 'User target exam', nullable: true })
    @IsOptional()
    @IsString()
    targetExam?: string;
}

@InputType({ description: 'Input data for updating an existing user' })
export class UpdateUserInput {

    // ID is used to identify which record to update.
    // Use Int if your primary key is a number, or ID/String otherwise.
    @Field(() => String, { description: 'The ID of the user to update' })
    @IsString()
    @IsNotEmpty()
    id: string; 

    // All fields below are optional for an update
    
    @Field(() => String, { description: 'User username', nullable: true })
    @IsOptional()
    @IsString()
    @MinLength(3)
    username?: string;
    
    @Field(() => String, { description: 'User full name', nullable: true })
    @IsOptional()
    @IsString()
    fullName?: string | null;

    @Field(() => String, { description: 'User avatar url', nullable: true })
    @IsOptional()
    @IsUrl() // Use IsUrl for URL validation
    avatarUrl?: string | null;

    @Field(() => String, { description: 'User target exam', nullable: true })
    @IsOptional()
    @IsString()
    targetExam?: string | null;
    
    // Note: FCM Token and notification settings are often updated separately, 
    // but they can be included here if needed.
    @Field(() => String, { description: 'User fcm token', nullable: true })
    @IsOptional()
    @IsString()
    fcmToken?: string | null;
    
    @Field(() => Boolean, { description: 'User notification enabled', nullable: true })
    @IsOptional()
    @IsBoolean()
    notificationEnabled?: boolean;
}