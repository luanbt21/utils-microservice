import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
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
	Provider,
	RestoreRequest,
	Status,
	FindByIdRequest,
} from "../proto/backup";
@Injectable()
export class BackupService {
	private readonly logger = new Logger(BackupService.name);
	constructor(private readonly prismaService: PrismaService) {}

	async findAll(data: GetBackupRequest): Promise<GetBackupResponse> {
		const {
			limit = 10,
			offset = 0,
			dbName,
			startDate,
			endDate,
			provider,
		} = data;

		const where = {
			provider,
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

	async dump({ provider, url }: DumpRequest): Promise<BackupFile> {
		const asyncExec = promisify(exec);
		const now = new Date().toISOString();

		if (!url) {
			throw new Error("url is required");
		}
		const uri = new URL(url);
		const dbName = uri.pathname.split("/")[1];

		if (!dbName) {
			throw new Error("database name is required");
		}

		const fileName = `${dbName}-${now}`;
		await mkdir(`../backup-db/${dbName}`, { recursive: true });
		const path = resolve(`../backup-db/${dbName}/${fileName}`);

		const command = this.dumpCommand({ provider, url }, dbName, path);

		try {
			const { stdout, stderr } = await asyncExec(command);
			if (stderr) {
				this.logger.error(`dump ${provider} stderr: ${stderr}`);
			}
			if (stdout) {
				this.logger.log(`dump ${provider} stdout: ${stdout}`);
			}

			const stats = await stat(path);
			if (stats.size === 0) {
				await rm(path);
				this.logger.error(`Database ${provider}:${dbName} dumped failed`);
				return;
			}

			const { createdAt, ...rest } = await this.prismaService.backup.create({
				data: { dbName, fileName, path, provider, size: stats.size.toString() },
			});
			this.logger.log(
				`Database ${provider}:${dbName} dumped successfully to ${fileName}`,
			);

			return {
				...rest,
				createdAt: createdAt.toISOString(),
			};
		} catch (error) {
			this.logger.error(`error: ${error}`);
			await rm(path);
		}
	}

	async restore({ provider, url, id }: RestoreRequest): Promise<Status> {
		if (!url) {
			throw new Error("url is required");
		}
		const uri = new URL(url);
		const dbName = uri.pathname.split("/")[1];

		if (!dbName) {
			throw new Error("database name is required");
		}

		const asyncExec = promisify(exec);
		const backup = await this.findById(id);
		const command = this.restoreCommand({ provider, url }, dbName, backup.path);

		try {
			const { stdout, stderr } = await asyncExec(command);
			if (stderr) {
				this.logger.error(`restore ${provider} stderr: ${stderr}`);
			}
			if (stdout) {
				this.logger.log(`restore ${provider} stdout: ${stdout}`);
			}

			return { message: "Restore successfully" };
		} catch (error) {
			this.logger.error(`error: ${error}`);
			return { message: "Restore failed" };
		}
	}

	async delete({ id }: FindByIdRequest): Promise<Status> {
		const result = await this.prismaService.backup.delete({ where: { id } });
		await rm(result.path);
		return { message: "Delete successfully" };
	}

	private dumpCommand(
		{ provider, url }: DumpRequest,
		dbName: string,
		path: string,
	) {
		switch (provider) {
			case Provider.POSTGRES:
				return `pg_dump --format=tar ${url} -f ${path}`;

			case Provider.MYSQL: {
				const dbUrl = new URL(url);
				const username = dbUrl.username ? `-u${dbUrl.username}` : "";
				const password = dbUrl.password ? `-p${dbUrl.password}` : "";
				const host = dbUrl.hostname ? `-h ${dbUrl.hostname}` : "";
				const port = dbUrl.port ? `-P ${dbUrl.port}` : "";
				return `mysqldump ${username} ${password} ${host} ${port} ${dbName} > ${path}`;
			}

			case Provider.MONGODB:
				return `mongodump ${url} --archive=${path}`;

			default:
				throw new Error("Unsupported provider");
		}
	}

	private restoreCommand(
		{ provider, url }: DumpRequest,
		dbName: string,
		path: string,
	) {
		switch (provider) {
			case Provider.POSTGRES: {
				const dbUrl = new URL(url);
				dbUrl.pathname = "/postgres";
				return `pg_restore -cC --dbname=${dbUrl} ${path}`;
			}

			case Provider.MYSQL: {
				const dbUrl = new URL(url);
				const username = dbUrl.username ? `-u${dbUrl.username}` : "";
				const password = dbUrl.password ? `-p${dbUrl.password}` : "";
				const host = dbUrl.hostname ? `-h ${dbUrl.hostname}` : "";
				const port = dbUrl.port ? `-P ${dbUrl.port}` : "";
				return `mysql ${username} ${password} ${host} ${port} ${dbName} < ${path}`;
			}

			case Provider.MONGODB:
				return `mongorestore ${url} --archive=${path}`;

			default:
				throw new Error("Unsupported provider");
		}
	}
}
