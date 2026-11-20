import type { ZoronTheme } from '../../../lib/theme.ts';

/** The props every Studio tab section takes. */
export interface SectionProps {
  /** The raw draft: colour fields may hold half typed text. */
  draft: ZoronTheme;
  /** The last valid normalized draft, which the drawings and checks use. */
  valid: ZoronTheme;
  set: (patch: Partial<ZoronTheme>) => void;
}
