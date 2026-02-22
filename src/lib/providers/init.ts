// Import this module to ensure all providers are registered.
// Must be imported before using the registry in API routes.

import { registerProvider } from './registry';
import { asColourProvider } from './ascolour/adapter';
import { staticProvider } from './static/adapter';

registerProvider(asColourProvider);
registerProvider(staticProvider);
