import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
// const enhancePrisma = enhance(prisma, { user: { id: "1" } });

async function main() {
	await prisma.backup.create({
		data: {
			dbName: "test",
			createdAt: new Date(),
			fileName: "test",
			path: "test",
			size: "test",
		},
	});
}

main();
