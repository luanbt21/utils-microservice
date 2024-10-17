import { Inject, Injectable, Logger } from "@nestjs/common";
import { ENHANCED_PRISMA } from "@zenstackhq/server/nestjs";
import { PrismaService } from "../../prisma.service";
import { Prisma } from "@prisma/client";
import { promisify } from "node:util";
import { exec } from "node:child_process";
import { mkdir, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";
import {
	GetBackupRequest,
	GetBackupResponse,
	DumpRequest,
	BackupFile,
} from "../proto/backup";
@Injectable()
export class BackupService {
	private readonly logger = new Logger(BackupService.name);
	constructor(
		@Inject(ENHANCED_PRISMA) private readonly prismaService: PrismaService,
	) {}

	async findAll(data: GetBackupRequest): Promise<GetBackupResponse> {
		const { limit, offset, dbName, startDate, endDate } = data;
		console.log({ startDate, endDate });

		const where = {
			dbName,
			createdAt: {
				gte: startDate ? new Date(startDate) : undefined,
				lte: endDate ? new Date(endDate) : undefined,
			},
		} satisfies Prisma.BackupFindManyArgs["where"];

		const backups = await this.prismaService.backup.findMany({
			where,
			take: limit,
			skip: offset,
			orderBy: { createdAt: "desc" },
		});
		const total = await this.prismaService.backup.count({ where });

		const files = backups.map(({ createdAt, ...rest }) => ({
			...rest,
			createdAt: createdAt.toISOString(),
		}));

		return { files, total };
	}

	async findById(id: string): Promise<BackupFile> {
		const backup = await this.prismaService.backup.findUnique({
			where: { id },
		});
		const { createdAt, ...rest } = backup;
		return {
			...rest,
			createdAt: createdAt.toISOString(),
		};
	}

	async dump({
		username,
		password,
		host,
		port,
		dbName,
	}: DumpRequest): Promise<BackupFile> {
		const asyncExec = promisify(exec);
		const now = new Date().toISOString();

		if (!dbName) {
			return;
		}
		username = username ? `-u ${username}` : "";
		// -p${password} is correct
		password = password ? `-p${password}` : "";
		host = host ? `-h ${host}` : "";
		port = port ? `-P ${port}` : "";

		const fileName = `${dbName}-${now}.sql`;
		await mkdir(`../backup-db/${dbName}`, { recursive: true });

		const path = resolve(`../backup-db/${dbName}/${fileName}`);

		const command = `mysqldump ${username} ${password} ${host} ${port} ${dbName} > ${path}`;
		try {
			const { stdout, stderr } = await asyncExec(command);
			if (stderr) {
				this.logger.error(`stderr: ${stderr}`);
			}
			if (stdout) {
				this.logger.log(`stdout: ${stdout}`);
			}

			const stats = await stat(path);
			if (stats.size === 0) {
				await rm(path);
				this.logger.error(`Database ${dbName} dumped failed`);
				return;
			}

			const { createdAt, ...rest } = await this.prismaService.backup.create({
				data: { dbName, fileName, path: path, size: stats.size.toString() },
			});
			this.logger.log(`Database ${dbName} dumped successfully to ${fileName}`);

			return {
				...rest,
				createdAt: createdAt.toISOString(),
			};
		} catch (error) {
			this.logger.error(`error: ${error}`);
			await rm(path);
		}
	}
}
