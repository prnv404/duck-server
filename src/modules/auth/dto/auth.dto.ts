import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { UserModel } from '@/modules/user/user.model';

@ObjectType()
export class AuthResponse {
    @Field(() => UserModel)
    user: UserModel;

    @Field()
    accessToken: string;

    @Field()
    refreshToken: string;
}

@InputType()
export class RequestOtpInput {
    @Field()
    @IsNotEmpty()
    @IsString()
    phone: string;
}

@InputType()
export class VerifyOtpInput {
    @Field()
    @IsNotEmpty()
    @IsString()
    phone: string;

    @Field()
    @IsNotEmpty()
    @IsString()
    otp: string;
}

@ObjectType()
export class RefreshTokenResponse {
    @Field()
    accessToken: string;

    @Field()
    refreshToken: string;
}
