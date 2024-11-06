import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { BackupService } from "../src/grpc/backup/backup.service";
import {
	DumpRequest,
	Provider,
	RestoreRequest,
} from "../src/grpc/proto/backup";

describe("BackupService (e2e)", () => {
	let app: INestApplication;
	let backupService: BackupService;

	beforeEach(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		await app.init();
		backupService = moduleFixture.get<BackupService>(BackupService);
	});

	afterEach(async () => {
		await app.close();
	});

	it("should dump a PostgreSQL database", async () => {
		const dbName = "test";
		const dumpRequest: DumpRequest = {
			provider: Provider.POSTGRES,
			url: "postgresql://test:test@postgres:5432/test",
		};

		const dumpResponse = await backupService.dump(dumpRequest);

		expect(dumpResponse).toBeDefined();
		expect(dumpResponse.provider).toBe(Provider.POSTGRES);
		expect(dumpResponse.dbName).toBe(dbName);
		expect(dumpResponse.fileName).toBeDefined();
		expect(dumpResponse.path).toBeDefined();
		expect(dumpResponse.size).toBeDefined();
		expect(dumpResponse.createdAt).toBeDefined();

		const restoreRequest: RestoreRequest = {
			...dumpRequest,
			id: dumpResponse.id,
		};

		const { message } = await backupService.restore(restoreRequest);
		expect(message).toBe("Restore successfully");
	});

	it("should dump a MySQL database", async () => {
		const dbName = "test";
		const dumpRequest = {
			provider: Provider.MYSQL,
			url: "mysql://root:test@mysql:3306/test",
		};

		const dumpResponse = await backupService.dump(dumpRequest);

		expect(dumpResponse).toBeDefined();
		expect(dumpResponse.provider).toBe(Provider.MYSQL);
		expect(dumpResponse.dbName).toBe(dbName);
		expect(dumpResponse.fileName).toBeDefined();
		expect(dumpResponse.path).toBeDefined();
		expect(dumpResponse.size).toBeDefined();
		expect(dumpResponse.createdAt).toBeDefined();

		const restoreRequest: RestoreRequest = {
			...dumpRequest,
			id: dumpResponse.id,
		};

		const { message } = await backupService.restore(restoreRequest);
		expect(message).toBe("Restore successfully");
	});

	it("should dump a MongoDB database", async () => {
		const dbName = "test";
		const dumpRequest = {
			provider: Provider.MONGODB,
			url: "mongodb://root:test@mongo:27017/test?authSource=admin",
		};

		const dumpResponse = await backupService.dump(dumpRequest);

		expect(dumpResponse).toBeDefined();
		expect(dumpResponse.provider).toBe(Provider.MONGODB);
		expect(dumpResponse.dbName).toBe(dbName);
		expect(dumpResponse.fileName).toBeDefined();
		expect(dumpResponse.path).toBeDefined();
		expect(dumpResponse.size).toBeDefined();
		expect(dumpResponse.createdAt).toBeDefined();

		const restoreRequest: RestoreRequest = {
			...dumpRequest,
			id: dumpResponse.id,
		};

		const { message } = await backupService.restore(restoreRequest);
		expect(message).toBe("Restore successfully");
	});
});
