import { Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import {QuestionGenerationService } from './question.service';
import { AnswerOptionsModel, QuestionModel } from './question.model';

// @Resolver()
export class QuestionResolver {
    // constructor(private readonly questionService: QuestionService) {}
    // @Query(() => [QuestionModel])
    // async generateQuestions() {
    // }
    // @ResolveField(() => [AnswerOptionsModel])
    // async answerOptions(@Parent() question: QuestionModel) {
    //     // return this.questionService.findAnswerOptions(question.id);
    // }
}
