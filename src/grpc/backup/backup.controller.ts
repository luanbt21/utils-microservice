import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { BackupService } from "./backup.service";
import { backup } from "../prototype/backup";

@Controller()
export class BackupController {
	constructor(private readonly backupService: BackupService) {}

	@GrpcMethod("Backup", "FindAll")
	async findAll(
		data: backup.GetBackupRequest,
	): Promise<backup.GetBackupResponse> {
		return this.backupService.findAll(data);
	}

	@GrpcMethod("Backup", "Dump")
	async dump(data: backup.DumpRequest): Promise<backup.BackupFile> {
		return this.backupService.dump(data);
	}
}
