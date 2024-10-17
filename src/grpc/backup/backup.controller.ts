import { Controller } from "@nestjs/common";
import { BackupService } from "./backup.service";
import {
	BackupControllerMethods,
	BackupFile,
	DumpRequest,
	GetBackupRequest,
	GetBackupResponse,
} from "../proto/backup";

@Controller()
@BackupControllerMethods()
export class BackupController {
	constructor(private readonly backupService: BackupService) {}

	async findAll(data: GetBackupRequest): Promise<GetBackupResponse> {
		return this.backupService.findAll(data);
	}

	async dump(data: DumpRequest): Promise<BackupFile> {
		return this.backupService.dump(data);
	}
}
