import type { Assessment, Posture, SupportiveCareAnswer } from './types.js';

/** A supportive care row of the Labour Care Guide. */
export type SupportiveCareKind = 'companion' | 'pain-relief' | 'oral-fluid';

const ABSENT = {
  companion: 'companion-absent',
  'pain-relief': 'pain-relief-absent',
  'oral-fluid': 'oral-fluid-absent',
} as const;

/** Flags supportive care that was not given; `declined` and `unknown` are not flagged. */
export function classifySupportiveCare(
  kind: SupportiveCareKind,
  given: SupportiveCareAnswer,
): Assessment | null {
  return given === 'no' ? { code: ABSENT[kind], severity: 'watch' } : null;
}

/** Flags a woman lying supine. */
export function classifyPosture(position: Posture): Assessment | null {
  return position === 'supine' ? { code: 'supine-posture', severity: 'watch' } : null;
}
