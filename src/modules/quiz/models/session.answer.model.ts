// ============================================
// SessionAnswer GraphQL Type

import { ObjectType, ID, Int, Field } from '@nestjs/graphql';
import { QuizSession } from './quiz.session.model';
import { QuestionModel } from '@/modules/question/models/question.model';
import { AnswerOption } from '@/modules/question/models/answer.options.model';

// ============================================
@ObjectType()
export class SessionAnswer {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    sessionId: string;

    @Field(() => ID)
    questionId: string;

    @Field(() => ID, { nullable: true })
    selectedOptionId?: string;

    @Field()
    isCorrect: boolean;

    @Field(() => Int, { nullable: true })
    timeSpentSeconds?: number;

    @Field()
    answeredAt: Date;

    // Relations
    @Field(() => QuizSession)
    session: QuizSession;

    @Field(() => QuestionModel)
    question: QuestionModel;

    @Field(() => AnswerOption, { nullable: true })
    selectedOption?: AnswerOption;
}
