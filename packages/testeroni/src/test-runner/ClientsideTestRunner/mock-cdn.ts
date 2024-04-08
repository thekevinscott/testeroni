import type {
  HttpServer,
} from '../../http-server/HttpServer.js';

export type MockCDN = (server: HttpServer, model: string, pathToModel: string) => string;
export const mockCdn: MockCDN = (server, packageName, pathToModel) => {
  if (!server.url) {
    throw new Error('No URL was available on fixtures server');
  }
  const pathToAsset = [
    server.url,
    packageName,
    pathToModel,
  ].join('/');
  return pathToAsset;
};
