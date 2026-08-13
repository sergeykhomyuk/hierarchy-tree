import { createConfiguration, readEnvironment } from '@platform/configuration';
import { bootstrap } from './bootstrap';

const container = document.getElementById('root');
if (!container) {
  throw new Error('root container not found');
}

const rawEnvironment = readEnvironment();
const configurationResult = createConfiguration(rawEnvironment);

bootstrap(container, configurationResult);
