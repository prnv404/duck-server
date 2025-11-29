import { NewSubject, NewTopic } from '@/database/schema';
import { InputType, Field, Int } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, IsHexColor, Min, Max, Length, IsUUID } from 'class-validator';

@InputType()
export class CreateSubjectInput implements NewSubject {
    @Field(() => String)
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    @Length(2, 100)
    name: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsUrl()
    iconUrl: string | null;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsHexColor()
    colorCode: string | null;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    @IsInt()
    @Min(0)
    displayOrder: number | null;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    weightage: number | null;

    @Field(() => Boolean, { nullable: true })
    @IsOptional()
    @IsBoolean()
    is_active_in_random: boolean | null;
}

@InputType()
export class UpdateSubjectInput implements Partial<NewSubject> {
    @Field(() => String)
    @IsNotEmpty()
    @IsUUID('4')
    id: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    @Length(2, 100)
    name?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsUrl()
    iconUrl?: string | null;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsHexColor()
    colorCode?: string | null;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    @IsInt()
    @Min(0)
    displayOrder?: number | null;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    weightage?: number | null;

    @Field(() => Boolean, { nullable: true })
    @IsOptional()
    @IsBoolean()
    is_active_in_random?: boolean | null;
}

@InputType()
export class CreateTopicInput implements NewTopic {
    @Field(() => String)
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    @Length(2, 150)
    name: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    @Length(0, 500)
    description: string | null;

    @Field(() => String)
    @IsNotEmpty()
    @IsUUID('4')
    subjectId: string;
}

@InputType()
export class UpdateTopicInput implements Partial<NewTopic> {
    @Field(() => String)
    @IsNotEmpty()
    @IsUUID('4')
    id: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    @Length(2, 150)
    name?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    @Length(0, 500)
    description?: string | null;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsUUID('4')
    subjectId?: string;
}
