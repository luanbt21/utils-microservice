/* eslint-disable */
export default async () => {
    const t = {};
    return { "@nestjs/swagger": { "models": [], "controllers": [[import("./app.controller"), { "AppController": { "health": { type: String } } }], [import("./grpc/backup/backup.controller"), { "BackupController": {} }]] } };
};