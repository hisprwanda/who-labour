/** A point in time: a `Date`, epoch milliseconds, or an ISO 8601 string with `Z` or an offset. */
export type Instant = Date | number | string;

/** Urine dipstick result: 0 is negative, 1 to 4 are plus signs. */
export type DipstickGrade = 0 | 1 | 2 | 3 | 4;

/** Membranes and liquor as charted: intact, ruptured, clear, meconium-stained, blood-stained or absent. */
export type AmnioticFluid = 'intact' | 'ruptured' | 'clear' | 'meconium' | 'blood' | 'absent';

/** Moulding of the fetal skull: 0 separated, 1 apposed, 2 overlapped reducible, 3 overlapped not reducible. */
export type MouldingGrade = 0 | 1 | 2 | 3;

/** Meconium staining of the liquor: 1 is +, 2 is ++, 3 is +++ (thick). */
export type MeconiumGrade = 1 | 2 | 3;

/** Caput succedaneum: 0 none, 1 is +, 2 is ++, 3 is +++. */
export type CaputGrade = 0 | 1 | 2 | 3;

/** Whether supportive care was given: `declined` means the woman did not want it. */
export type SupportiveCareAnswer = 'yes' | 'no' | 'declined' | 'unknown';

/** The woman's posture: lying supine or mobile (upright, walking or any position she chooses). */
export type Posture = 'supine' | 'mobile';

/** Fetal heart rate decelerations heard. */
export type DecelerationType = 'none' | 'early' | 'late' | 'variable';

/** Position of the fetal occiput: anterior, posterior or transverse. */
export type FetalPosition = 'anterior' | 'posterior' | 'transverse';

/** Fifths of the fetal head palpable above the pelvic brim, from 5 (not engaged) to 0. */
export type FifthsPalpable = 0 | 1 | 2 | 3 | 4 | 5;

/** Fields every reading has: when it was taken and an optional caller id carried into results. */
export interface ReadingBase {
  readonly at: Instant;
  readonly id?: string;
}

/** Fetal heart rate in beats per minute. */
export interface FetalHeartRateReading extends ReadingBase {
  readonly kind: 'fetal-heart-rate';
  readonly beatsPerMinute: number;
}

/** State of the membranes and colour of the liquor. */
export interface AmnioticFluidReading extends ReadingBase {
  readonly kind: 'amniotic-fluid';
  readonly state: AmnioticFluid;
  readonly meconiumGrade?: MeconiumGrade;
}

/** Moulding of the fetal skull bones. */
export interface MouldingReading extends ReadingBase {
  readonly kind: 'moulding';
  readonly grade: MouldingGrade;
}

/** Cervical dilatation from a vaginal examination. */
export interface CervixReading extends ReadingBase {
  readonly kind: 'cervix';
  readonly dilatationCm: number;
}

/** Descent of the fetal head by abdominal palpation. */
export interface DescentReading extends ReadingBase {
  readonly kind: 'descent';
  readonly fifthsPalpable: FifthsPalpable;
}

/** Uterine contractions counted over 10 minutes and how long each lasts. */
export interface ContractionsReading extends ReadingBase {
  readonly kind: 'contractions';
  readonly per10Minutes: number;
  readonly durationSeconds: number;
}

/** Oxytocin concentration and infusion rate. */
export interface OxytocinReading extends ReadingBase {
  readonly kind: 'oxytocin';
  readonly unitsPerLitre: number;
  readonly dropsPerMinute: number;
}

/** A medicine given. */
export interface DrugReading extends ReadingBase {
  readonly kind: 'drug';
  readonly name: string;
  readonly dose?: string;
}

/** An intravenous fluid given. */
export interface IvFluidReading extends ReadingBase {
  readonly kind: 'iv-fluid';
  readonly name: string;
  readonly volumeMl?: number;
}

/** Maternal pulse in beats per minute. */
export interface PulseReading extends ReadingBase {
  readonly kind: 'pulse';
  readonly beatsPerMinute: number;
}

/** Maternal blood pressure in mmHg. */
export interface BloodPressureReading extends ReadingBase {
  readonly kind: 'blood-pressure';
  readonly systolic: number;
  readonly diastolic: number;
}

/** Maternal temperature in degrees Celsius. */
export interface TemperatureReading extends ReadingBase {
  readonly kind: 'temperature';
  readonly celsius: number;
}

/** Urine passed: dipstick protein and acetone, and volume. */
export interface UrineReading extends ReadingBase {
  readonly kind: 'urine';
  readonly protein?: DipstickGrade;
  readonly acetone?: DipstickGrade;
  readonly volumeMl?: number;
}

/** Whether the woman has a labour companion with her. */
export interface CompanionReading extends ReadingBase {
  readonly kind: 'companion';
  readonly given: SupportiveCareAnswer;
}

/** Whether pain relief was offered. */
export interface PainReliefReading extends ReadingBase {
  readonly kind: 'pain-relief';
  readonly given: SupportiveCareAnswer;
}

/** Whether oral fluid was offered. */
export interface OralFluidReading extends ReadingBase {
  readonly kind: 'oral-fluid';
  readonly given: SupportiveCareAnswer;
}

/** The woman's posture. */
export interface PostureReading extends ReadingBase {
  readonly kind: 'posture';
  readonly position: Posture;
}

/** Fetal heart rate decelerations. */
export interface DecelerationsReading extends ReadingBase {
  readonly kind: 'decelerations';
  readonly type: DecelerationType;
}

/** Position of the fetal head. */
export interface FetalPositionReading extends ReadingBase {
  readonly kind: 'fetal-position';
  readonly position: FetalPosition;
}

/** Caput succedaneum on the fetal head. */
export interface CaputReading extends ReadingBase {
  readonly kind: 'caput';
  readonly grade: CaputGrade;
}

/** Any observation recorded during labour. */
export type Reading =
  | FetalHeartRateReading
  | AmnioticFluidReading
  | MouldingReading
  | CervixReading
  | DescentReading
  | ContractionsReading
  | OxytocinReading
  | DrugReading
  | IvFluidReading
  | PulseReading
  | BloodPressureReading
  | TemperatureReading
  | UrineReading
  | CompanionReading
  | PainReliefReading
  | OralFluidReading
  | PostureReading
  | DecelerationsReading
  | FetalPositionReading
  | CaputReading;

/** The `kind` of every reading. */
export type ReadingKind = Reading['kind'];

/** The reading type for one kind. */
export type ReadingOfKind<K extends ReadingKind> = Extract<Reading, { readonly kind: K }>;

/** `Omit` applied to each member of a union separately. */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** A validated reading with its time as an ISO string and epoch ms, and its position in the input. */
export type TimedReading<R extends Reading = Reading> = R extends Reading
  ? DistributiveOmit<R, 'at'> & {
      readonly at: string;
      readonly time: number;
      readonly index: number;
    }
  : never;

/** Why a reading was left out. */
export type ReadingIssueCode =
  'unknown-kind' | 'invalid-time' | 'invalid-value' | 'duplicate' | 'in-future' | 'before-start';

/** A reading that was left out, by its position in the input. */
export interface ReadingIssue {
  readonly index: number;
  readonly code: ReadingIssueCode;
  readonly id?: string;
}

/** How soon a finding needs attention: `watch` means reassess, `urgent` means act now. */
export type Severity = 'watch' | 'urgent';

/** Every finding code this package reports; apps translate them. */
export type FindingCode =
  | 'fetal-heart-rate-low'
  | 'fetal-heart-rate-high'
  | 'meconium-stained-liquor'
  | 'blood-stained-liquor'
  | 'liquor-absent'
  | 'moulding-severe'
  | 'contractions-inadequate'
  | 'contractions-excessive'
  | 'pulse-low'
  | 'pulse-high'
  | 'blood-pressure-low'
  | 'blood-pressure-high'
  | 'blood-pressure-severe'
  | 'temperature-low'
  | 'temperature-high'
  | 'proteinuria'
  | 'ketonuria'
  | 'alert-line-crossed'
  | 'action-line-crossed'
  | 'companion-absent'
  | 'pain-relief-absent'
  | 'oral-fluid-absent'
  | 'supine-posture'
  | 'late-decelerations'
  | 'fetal-position-abnormal'
  | 'caput-severe'
  | 'cervix-progress-delayed'
  | 'second-stage-prolonged';

/** A code and severity produced by a classifier. */
export interface Assessment {
  readonly code: FindingCode;
  readonly severity: Severity;
}

/** An assessment tied to the reading that triggered it. */
export interface Finding extends Assessment {
  readonly kind: ReadingKind;
  readonly at: string;
  readonly readingId?: string;
}
