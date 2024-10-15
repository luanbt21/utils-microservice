import { Module } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { enhance } from "@zenstackhq/runtime";
import { ZenStackModule } from "@zenstackhq/server/nestjs";
import { Request } from "express";

import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { PrismaService } from "./prisma.service";
import { BackupModule } from "./grpc/backup/backup.module";

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		ZenStackModule.registerAsync({
			useFactory: (request: Request, prisma: PrismaService) => {
				return {
					getEnhancedPrisma: () => enhance(prisma, { user: request.user }),
				};
			},
			inject: [REQUEST, PrismaService],
			extraProviders: [PrismaService],
			global: true,
		}),
		BackupModule,
	],
	controllers: [AppController],
	providers: [PrismaService],
})
export class AppModule {}
