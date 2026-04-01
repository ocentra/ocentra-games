import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { MainAppPathResolver } from '@ocentra/logging-domain/core/adapters/mainAppPathResolver';

const pathResolver = new MainAppPathResolver({
  getFilePathFromUrl: (url: string) => url,
  getSourceFromFilePath: () => 'EventingDomainTest',
});
MainAppLogger.initLogger(null, pathResolver);
