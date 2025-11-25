import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsOptional, Min, Max } from 'class-validator';

@ArgsType()
export class PaginationArgs {
    @Field(() => Int, { defaultValue: 0 })
    @IsOptional()
    @Min(0)
    skip?: number = 0;

    @Field(() => Int, { defaultValue: 25 })
    @IsOptional()
    @Min(1)
    @Max(100)
    take?: number = 25;
}
