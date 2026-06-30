// Public API for the QUIOBA email design system.
// Add new templates under templates/ following the welcome.ts pattern.
export { Wrap, Header, Footer, Button, HelpBlock, MissionCard } from './components';
export type { MissionCardData } from './components';
export { BetaLayout } from './layouts';
export { buildWelcomeEmail } from './templates/welcome';
export type { WelcomeEmailData } from './templates/welcome';
