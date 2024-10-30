import { NestFactory } from "@nestjs/core";
import {} from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";

async function bootstrap() {
	const app = await NestFactory.createMicroservice<MicroserviceOptions>(
		AppModule,
		{
			transport: Transport.GRPC,
			options: {
				url: "0.0.0.0:50051",
				package: ["backup"],
				protoPath: ["./proto/backup.proto"],
			},
		},
	);
	app.enableShutdownHooks();

	await app.listen();
}
bootstrap();
