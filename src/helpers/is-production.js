import { select } from './select';

const productionSynonyms = ['prod', 'production'];

export function isProduction(serverless, options) {
  return productionSynonyms.includes(select(options.stage, serverless.service.provider.stage, 'dev')
    .toLowerCase());
}
