import { ObjectType, Field, ID } from '@nestjs/graphql';
import { UserStats } from './user.stats.model';
import { UserPracticePreferenceModel } from '@/modules/practice/models/practice.quiz.preference';
import { UserBadge } from '@/modules/gamification/models/user.badges.model';
import { UserTopicProgress } from '@/modules/curriculum/model.ts/user.topicProgress.model';
import { StreakCalendar } from '@/modules/gamification/models/streak.calendar.model';
import { LeaderboardEntry } from '@/modules/gamification/models/leaderboard.model';
import { UserQuestionHistory } from '@/modules/question/models/user.question.history.model';
import { NotificationQueue } from '@/modules/notification/models/notification.queue.model';
import { PracticeSession } from '@/modules/practice/models/practice.session.model';

@ObjectType()
export class User {
    @Field(() => ID)
    id: string;

    @Field()
    username: string;

    @Field()
    phone: string;

    @Field({ nullable: true })
    fullName?: string;

    @Field({ nullable: true })
    avatarUrl?: string;

    @Field({ nullable: true })
    targetExam?: string;

    @Field({ nullable: true })
    fcmToken?: string;

    @Field()
    notificationEnabled: boolean;

    @Field({ nullable: true })
    otp?: string;

    @Field({ nullable: true })
    refreshToken?: string;

    @Field()
    createdAt: Date;

    @Field({ nullable: true })
    lastActiveAt?: Date;

    // Relations
    @Field(() => UserStats)
    userStats: UserStats;

    @Field(() => UserPracticePreferenceModel)
    userQuizPreferences: UserPracticePreferenceModel;

    @Field(() => [UserBadge!]!)
    userBadges: UserBadge[];

    @Field(() => [UserTopicProgress!]!)
    userTopicProgress: UserTopicProgress[];

    @Field(() => [StreakCalendar!]!)
    streakCalendar: StreakCalendar[];

    @Field(() => [LeaderboardEntry!]!)
    leaderboardEntries: LeaderboardEntry[];

    @Field(() => [UserQuestionHistory!]!)
    userQuestionHistory: UserQuestionHistory[];

    @Field(() => [NotificationQueue!]!)
    notificationQueue: NotificationQueue[];

    @Field(() => [PracticeSession!]!)
    quizSessions: PracticeSession[];
}
