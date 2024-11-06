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

	async dump({ provider, ...credentials }: DumpRequest): Promise<BackupFile> {
		const asyncExec = promisify(exec);
		const now = new Date().toISOString();

		const { dbName } = credentials;

		if (!dbName) {
			throw new Error("Database name is required");
		}

		const fileName = `${dbName}-${now}.sql`;
		await mkdir(`../backup-db/${dbName}`, { recursive: true });
		const path = resolve(`../backup-db/${dbName}/${fileName}`);

		let command: string;
		if (provider === Provider.POSTGRES) {
			command = this.pgDumpCommand(credentials, path);
		} else if (provider === Provider.MYSQL) {
			command = this.mysqlDumpCommand(credentials, path);
		} else if (provider === Provider.MONGODB) {
			command = this.mongoDumpCommand(credentials, path);
		} else {
			throw new Error("Unsupported provider");
		}

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

	private mysqlDumpCommand(
		{ username, password, host, port, dbName }: Omit<DumpRequest, "provider">,
		path: string,
	) {
		username = username ? `-u ${username}` : "";
		// -p${password} is correct
		password = password ? `-p${password}` : "";
		host = host ? `-h ${host}` : "";
		port = port ? `-P ${port}` : "";

		return `mysqldump ${username} ${password} ${host} ${port} ${dbName} > ${path}`;
	}

	private pgDumpCommand(
		{ username, password, host, port, dbName }: Omit<DumpRequest, "provider">,
		path: string,
	) {
		username = username ? `-U ${username}` : "";
		host = host ? `-h ${host}` : "";
		port = port ? `-p ${port}` : "";

		return `PGPASSWORD=${password} pg_dump ${username} ${host} ${port} -d ${dbName} -f ${path}`;
	}

	private mongoDumpCommand(
		{ username, password, host, port, dbName }: Omit<DumpRequest, "provider">,
		path: string,
	) {
		username = username ? `-u=${username}` : "";
		password = password ? `-p=${password}` : "";
		host = host ? `-h=${host}` : "";
		port = port ? `--port=${port}` : "";

		// return `mongodump 'mongodb://${username}:${password}@${host}:${port}/${dbName}?authSource=admin' --archive=${path}`;

		return `mongodump --authenticationDatabase=admin ${username} ${password} ${host} ${port} --db=${dbName} --archive=${path}`;
	}
}
