import { bootstrap } from './bootstrap';

const container = document.getElementById('root');
if (!container) {
  throw new Error('root container not found');
}

bootstrap(container);
