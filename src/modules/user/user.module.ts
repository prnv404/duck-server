import { Module } from '@nestjs/common';
import { UsersResolver } from './user.resolver';
import { UserService } from './user.service';
import { DatabaseModule } from '@/database/db.module';

@Module({
    imports: [DatabaseModule],
    providers: [UsersResolver, UserService],
    exports: [UserService],
})
export class UserModule {}
