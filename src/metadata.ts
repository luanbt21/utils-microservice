/* eslint-disable */
export default async () => {
    const t = {
        ["./grpc/prototype/backup"]: await import("./grpc/prototype/backup")
    };
    return { "@nestjs/swagger": { "models": [], "controllers": [[import("./app.controller"), { "AppController": { "health": { type: String } } }], [import("./grpc/backup/backup.controller"), { "BackupController": { "findAll": { type: t["./grpc/prototype/backup"].backup.GetBackupResponse }, "dump": { type: t["./grpc/prototype/backup"].backup.BackupFile } } }]] } };
};