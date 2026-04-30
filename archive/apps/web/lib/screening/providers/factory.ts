import { ScreeningProvider } from './interface';
import { SmartMoveProvider } from './smartmove';

export function getScreeningProvider(providerName: string): ScreeningProvider {
  switch (providerName.toLowerCase()) {
    case 'smartmove':
      return new SmartMoveProvider();
    // Future: add Checkr, other providers
    default:
      throw new Error(`Unknown screening provider: ${providerName}`);
  }
}
