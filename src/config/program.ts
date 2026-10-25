// ============================================================================
//  LEVEL UP — PROGRAM CONFIG
//  Everything about the 12-week plan lives in this one file. Edit freely:
//  dates, phases, sessions, sets/reps/rest, mobility, warm-up and tests.
//  Rest times are in seconds. Dates are "YYYY-MM-DD" (Melbourne local).
// ============================================================================

import type { ExerciseInfo, PhaseDef, SessionTemplate, StrengthSlot, TestDay, TestItemId } from './types'

export const PROGRAM = {
  start: '2026-11-16', // Mon, Week 1
  end: '2027-02-07', // Sun, end of Week 12
  testWeekStart: '2027-02-08',
  testWeekEnd: '2027-02-13',
  /** Week 1 = 2 sets of every exercise. */
  week1Sets: 2,
  /** Default weekday (1 = Mon ... 7 = Sun) for each gym session. Changeable in Settings. */
  trainingDays: { LA: 1, UA: 2, LB: 4, UB: 5 } as Record<'LA' | 'UA' | 'LB' | 'UB', number>,
  cardioDay: 3,
  saturdayDay: 6,
  tennisTime: '1pm',
  christmas: { date: '2026-12-25', session: 'UB' as StrengthSlot, moveTo: '2026-12-26' },
  beach: {
    start: '2026-12-30',
    end: '2027-01-13',
    sessionDays: [1, 3, 5], // Mon / Wed / Fri, alternating A/B
    firstSession: 'BA' as StrengthSlot, // A on Wed 30 Dec
    restDays: [4, 7], // Thu / Sun
    travelDays: ['2027-01-13'],
  },
  push: {
    start: '2027-01-14', // Thu: first session back = Lower B
    /** Weights in the first part-week back are this % of your last weights... */
    returnPercent: 0.9,
    /** ...and are back to full from this program week. */
    fullFromWeek: 10,
  },
  /** Repeat-Push option after the plan: this many weeks, then a test week. */
  repeatWeeks: 4,
  defaultMachineStep: 5,
  body: { startKg: 58, goalKg: 63, protein: 120, steps: '8-10k' },
}

export const PHASES: PhaseDef[] = [
  {
    id: 'foundation',
    name: 'Foundation',
    start: '2026-11-16',
    end: '2026-12-06',
    rir: 'RIR 3',
    blurb: 'Learn the lifts. Leave 3 reps in the tank every set. Week 1 is 2 sets of everything.',
  },
  {
    id: 'build',
    name: 'Build',
    start: '2026-12-07',
    end: '2026-12-29',
    rir: 'RIR 2',
    lastSetRir: 'RIR 1',
    blurb: 'Push a little harder: 2 reps in reserve, 1 on the last set.',
  },
  {
    id: 'beach',
    name: 'Beach Block',
    start: '2026-12-30',
    end: '2027-01-13',
    rir: 'RIR 2',
    blurb: 'No gym. Bodyweight + backpack sessions on the sand. Keep the streak alive.',
  },
  {
    id: 'push',
    name: 'Push',
    start: '2027-01-14',
    end: '2027-02-07',
    rir: 'RIR 1-2',
    lastSetRir: 'RIR 1',
    lastSetRirLight: 'RIR 0 ok',
    blurb: 'Hard sets. Last set can go to RIR 0 on machines, dumbbells and bodyweight (never squat/deadlift).',
  },
  {
    id: 'test',
    name: 'Test & Move',
    start: '2027-02-08',
    end: '2027-02-13',
    rir: '-',
    blurb: 'Boss fights on Mon 8 and Wed 10 Feb. Then rest and pack.',
  },
]

/** Phase used for "Repeat Push" cycles after the plan ends. */
export const REPEAT_PHASE: Omit<PhaseDef, 'start' | 'end'> = {
  id: 'repeat',
  name: 'Push (Repeat)',
  rir: 'RIR 1-2',
  lastSetRir: 'RIR 1',
  lastSetRirLight: 'RIR 0 ok',
  blurb: 'Run it back with your current weights.',
}

// ---------------------------------------------------------------------------
//  Exercise library (names, equipment, swap options)
// ---------------------------------------------------------------------------
export const EXERCISES: Record<string, ExerciseInfo> = {
  // Lower A
  boxJump: { name: 'Box jump', equipment: 'plyo', alts: ['squatJump'], cue: 'Land soft, step down' },
  backSquat: { name: 'Back squat', equipment: 'barbell-lower', lift: 'squat', alts: ['gobletSquat', 'legPress', 'hackSquat'] },
  gobletSquat: { name: 'Goblet squat', equipment: 'dumbbell', lift: 'squat', alts: ['legPress'] },
  rdl: { name: 'Romanian deadlift', equipment: 'barbell-lower', alts: ['dbRdl', 'backExtension'] },
  dbWalkingLunge: { name: 'DB walking lunge', equipment: 'dumbbell', perSide: true, alts: ['reverseLungeDb', 'bulgarianSplitSquat'] },
  legCurl: { name: 'Leg curl', equipment: 'machine', alts: ['dbRdl'] },
  standingCalfRaise: { name: 'Standing calf raise', equipment: 'machine', alts: ['singleLegCalfRaise'] },
  deadBug: { name: 'Dead bug', equipment: 'bodyweight', perSide: true },
  // Upper A
  benchPress: { name: 'Barbell bench', equipment: 'barbell-upper', lift: 'bench', alts: ['dbBench', 'machineChestPress'] },
  chestSupportedRow: { name: 'Chest-supported / cable row', equipment: 'machine', alts: ['oneArmDbRow', 'seatedCableRow'] },
  seatedDbPress: { name: 'Seated DB shoulder press', equipment: 'dumbbell', alts: ['machineShoulderPress'] },
  latPulldown: { name: 'Lat pulldown', equipment: 'machine', alts: ['pullUp', 'seatedCableRow'] },
  dbLateralRaise: { name: 'DB lateral raise', equipment: 'dumbbell', alts: ['cableLateralRaise'] },
  dbCurl: { name: 'DB curl', equipment: 'dumbbell', alts: ['cableCurl', 'hammerCurl'] },
  tricepsPushdown: { name: 'Cable triceps pushdown', equipment: 'machine', alts: ['overheadTricepsExt'] },
  pallofPress: { name: 'Pallof press', equipment: 'machine', perSide: true, alts: ['bandPallof', 'deadBug'], cue: 'Stand side-on to the cable. Press out, don\'t let it twist you.' },
  // Lower B
  broadJump: { name: 'Broad jump', equipment: 'plyo', alts: ['boxJump'] },
  trapBarDeadlift: { name: 'Trap-bar deadlift', equipment: 'barbell-lower', lift: 'deadlift', alts: ['conventionalDeadlift'] },
  conventionalDeadlift: { name: 'Conventional deadlift', equipment: 'barbell-lower', lift: 'deadlift', alts: ['trapBarDeadlift'] },
  legPress: { name: 'Leg press', equipment: 'machine', alts: ['hackSquat', 'gobletSquat'] },
  bulgarianSplitSquat: { name: 'Bulgarian split squat', equipment: 'dumbbell', perSide: true, alts: ['reverseLungeDb'] },
  hipThrust: { name: 'Barbell hip thrust', equipment: 'barbell-lower', alts: ['gluteBridgeMachine'] },
  singleLegCalfRaise: { name: 'Single-leg calf raise', equipment: 'dumbbell', perSide: true, alts: ['standingCalfRaise'] },
  hangingKneeRaise: { name: 'Hanging knee raise', equipment: 'bodyweight', alts: ['deadBug'] },
  // Upper B
  pullUp: { name: 'Pull-up', equipment: 'assisted', lift: 'pullup', alts: ['latPulldown'], cue: 'Assisted is fine. Log assistance kg.' },
  inclineDbPress: { name: 'Incline DB press', equipment: 'dumbbell', alts: ['machineChestPress', 'dbBench'] },
  oneArmDbRow: { name: 'One-arm DB row', equipment: 'dumbbell', perSide: true, alts: ['chestSupportedRow', 'seatedCableRow'] },
  pushUp: { name: 'Push-up', equipment: 'bodyweight', alts: ['dbBench'] },
  facePull: { name: 'Face pull', equipment: 'machine', alts: ['bandPullApart'] },
  hammerCurl: { name: 'Hammer curl', equipment: 'dumbbell', alts: ['dbCurl', 'cableCurl'] },
  overheadTricepsExt: { name: 'Overhead triceps extension', equipment: 'dumbbell', alts: ['tricepsPushdown'] },
  // Swap options
  hackSquat: { name: 'Hack squat', equipment: 'machine', alts: ['legPress'] },
  dbRdl: { name: 'DB Romanian deadlift', equipment: 'dumbbell' },
  backExtension: { name: 'Back extension', equipment: 'bodyweight' },
  reverseLungeDb: { name: 'DB reverse lunge', equipment: 'dumbbell', perSide: true },
  dbBench: { name: 'DB bench press', equipment: 'dumbbell' },
  machineChestPress: { name: 'Machine chest press', equipment: 'machine' },
  seatedCableRow: { name: 'Seated cable row', equipment: 'machine' },
  machineShoulderPress: { name: 'Machine shoulder press', equipment: 'machine' },
  cableLateralRaise: { name: 'Cable lateral raise', equipment: 'machine' },
  cableCurl: { name: 'Cable curl', equipment: 'machine' },
  gluteBridgeMachine: { name: 'Glute bridge machine', equipment: 'machine' },
  bandPullApart: { name: 'Band pull-apart', equipment: 'bodyweight' },
  bandPallof: { name: 'Band Pallof press', equipment: 'bodyweight', perSide: true },
  // Beach
  bssBackpack: { name: 'Bulgarian split squat (backpack)', equipment: 'bodyweight', perSide: true },
  bandRow: { name: 'Band row', equipment: 'bodyweight' },
  pullUpBeach: { name: 'Pull-up (or band row 4x15)', equipment: 'bodyweight', lift: 'pullup', alts: ['bandRow'] },
  pikePushUp: { name: 'Pike push-up', equipment: 'bodyweight' },
  slRdlBackpack: { name: 'Single-leg RDL (backpack)', equipment: 'bodyweight', perSide: true },
  slCalfRaiseBeach: { name: 'Single-leg calf raise', equipment: 'bodyweight', perSide: true },
  plank: { name: 'Plank', equipment: 'timed' },
  squatJump: { name: 'Squat jump', equipment: 'plyo' },
  backpackGobletSquat: { name: 'Backpack goblet squat (3s down)', equipment: 'bodyweight' },
  diamondPushUp: { name: 'Diamond push-up', equipment: 'bodyweight', alts: ['pushUp'] },
  bandRowOrPullApart: { name: 'Band row or pull-apart', equipment: 'bodyweight' },
  reverseLunge: { name: 'Reverse lunge', equipment: 'bodyweight', perSide: true },
  slGluteBridge: { name: 'Single-leg glute bridge', equipment: 'bodyweight', perSide: true },
  bandCurlPushdown: { name: 'Band curl + band pushdown', equipment: 'bodyweight', cue: '15 of each' },
  sidePlank: { name: 'Side plank', equipment: 'timed', perSide: true },
}

/** Swaps applied by Life Happens > Sore back. Includes Romanian deadlift (it's a deadlift). */
export const SORE_BACK_SWAPS: Record<string, string> = {
  backSquat: 'legPress',
  gobletSquat: 'legPress',
  trapBarDeadlift: 'backExtension',
  conventionalDeadlift: 'backExtension',
  rdl: 'backExtension',
}

// ---------------------------------------------------------------------------
//  Sessions
// ---------------------------------------------------------------------------
export const SESSIONS: Record<StrengthSlot, SessionTemplate> = {
  LA: {
    name: 'Lower A',
    short: 'LA',
    kind: 'gym',
    lower: true,
    warmup: 'lower',
    exercises: [
      { ex: 'boxJump', sets: 3, reps: [3, 3], rest: 90 },
      { ex: 'backSquat', sets: 3, reps: [6, 8], rest: 180, rampUp: true, weekSwap: { weeks: [1, 2], ex: 'gobletSquat' } },
      { ex: 'rdl', sets: 3, reps: [8, 10], rest: 120 },
      { ex: 'dbWalkingLunge', sets: 2, reps: [10, 10], rest: 90 },
      { ex: 'legCurl', sets: 3, reps: [10, 12], rest: 90 },
      { ex: 'standingCalfRaise', sets: 3, reps: [10, 15], rest: 60 },
      { ex: 'deadBug', sets: 3, reps: [8, 8], rest: 60 },
    ],
  },
  UA: {
    name: 'Upper A',
    short: 'UA',
    kind: 'gym',
    lower: false,
    warmup: 'upper',
    exercises: [
      { ex: 'benchPress', sets: 3, reps: [6, 8], rest: 180, rampUp: true },
      { ex: 'chestSupportedRow', sets: 3, reps: [8, 10], rest: 120 },
      { ex: 'seatedDbPress', sets: 3, reps: [8, 10], rest: 120 },
      { ex: 'latPulldown', sets: 3, reps: [8, 12], rest: 90 },
      { ex: 'dbLateralRaise', sets: 3, reps: [12, 15], rest: 60 },
      { ex: 'dbCurl', sets: 2, reps: [10, 12], rest: 60 },
      { ex: 'tricepsPushdown', sets: 2, reps: [10, 12], rest: 60 },
      { ex: 'pallofPress', sets: 3, reps: [10, 10], rest: 60 },
    ],
  },
  LB: {
    name: 'Lower B',
    short: 'LB',
    kind: 'gym',
    lower: true,
    warmup: 'lower',
    exercises: [
      { ex: 'broadJump', sets: 3, reps: [3, 3], rest: 90 },
      { ex: 'trapBarDeadlift', sets: 3, reps: [5, 6], rest: 180, rampUp: true },
      { ex: 'legPress', sets: 3, reps: [10, 12], rest: 120 },
      { ex: 'bulgarianSplitSquat', sets: 2, reps: [8, 10], rest: 90 },
      { ex: 'hipThrust', sets: 3, reps: [8, 12], rest: 90 },
      { ex: 'singleLegCalfRaise', sets: 3, reps: [12, 15], rest: 60 },
      { ex: 'hangingKneeRaise', sets: 3, reps: [10, 12], rest: 60 },
    ],
  },
  UB: {
    name: 'Upper B',
    short: 'UB',
    kind: 'gym',
    lower: false,
    warmup: 'upper',
    exercises: [
      { ex: 'pullUp', sets: 3, reps: [5, 8], rest: 180, rampUp: true },
      { ex: 'inclineDbPress', sets: 3, reps: [8, 10], rest: 120 },
      { ex: 'oneArmDbRow', sets: 3, reps: [10, 10], rest: 90 },
      { ex: 'pushUp', sets: 3, reps: 'max-2', rest: 90 },
      { ex: 'facePull', sets: 3, reps: [12, 15], rest: 60 },
      { ex: 'hammerCurl', sets: 2, reps: [10, 12], rest: 60 },
      { ex: 'overheadTricepsExt', sets: 2, reps: [10, 12], rest: 60 },
      { ex: 'sidePlank', sets: 3, reps: [30, 45], rest: 60 },
    ],
  },
  // Busy week: first 2 exercises of Lower B + first 2 of Upper B. Counts as lower.
  COMBO: {
    name: 'Combo (LB + UB)',
    short: 'CB',
    kind: 'gym',
    lower: true,
    warmup: 'lower',
    exercises: [
      { ex: 'broadJump', sets: 3, reps: [3, 3], rest: 90 },
      { ex: 'trapBarDeadlift', sets: 3, reps: [5, 6], rest: 180, rampUp: true },
      { ex: 'pullUp', sets: 3, reps: [5, 8], rest: 180 },
      { ex: 'inclineDbPress', sets: 3, reps: [8, 10], rest: 120 },
    ],
  },
  BA: {
    name: 'Beach A',
    short: 'BA',
    kind: 'beach',
    lower: false,
    warmup: 'beach',
    exercises: [
      { ex: 'pushUp', sets: 4, reps: 'max-2', rest: 75 },
      { ex: 'bssBackpack', sets: 4, reps: [12, 15], rest: 75 },
      { ex: 'pullUpBeach', sets: 4, reps: [5, 8], rest: 90 },
      { ex: 'pikePushUp', sets: 3, reps: [8, 12], rest: 60 },
      { ex: 'slRdlBackpack', sets: 3, reps: [10, 12], rest: 60 },
      { ex: 'slCalfRaiseBeach', sets: 3, reps: [20, 20], rest: 45 },
      { ex: 'plank', sets: 3, reps: [45, 45], rest: 45 },
    ],
  },
  BB: {
    name: 'Beach B',
    short: 'BB',
    kind: 'beach',
    lower: false,
    warmup: 'beach',
    exercises: [
      { ex: 'squatJump', sets: 4, reps: [5, 5], rest: 75 },
      { ex: 'backpackGobletSquat', sets: 4, reps: [15, 20], rest: 75 },
      { ex: 'diamondPushUp', sets: 4, reps: 'max-2', rest: 75 },
      { ex: 'bandRowOrPullApart', sets: 4, reps: [15, 20], rest: 60 },
      { ex: 'reverseLunge', sets: 3, reps: [12, 12], rest: 60 },
      { ex: 'slGluteBridge', sets: 3, reps: [15, 15], rest: 45 },
      { ex: 'bandCurlPushdown', sets: 3, reps: [15, 15], rest: 45 },
      { ex: 'sidePlank', sets: 3, reps: [30, 30], rest: 45 },
    ],
  },
}

/** Sequence used when shifting missed sessions. */
export const GYM_SEQUENCE: StrengthSlot[] = ['LA', 'UA', 'LB', 'UB']

// ---------------------------------------------------------------------------
//  Warm-up, cardio, intervals, mobility
// ---------------------------------------------------------------------------
export const WARMUP = {
  common: ['4 min easy bike or row'],
  lower: ['Leg swings 10 each way'],
  upper: ['Band pull-aparts x15'],
  beach: ['3 min easy jog on the sand', 'Arm circles 10 each way'],
  after: ['10 bodyweight squats + 10 glute bridges'],
  rampUp: [
    { pct: 0.5, reps: 5 },
    { pct: 0.75, reps: 3 },
  ],
}

export const CARDIO = {
  minutes: [30, 40] as [number, number],
  odd: { mode: 'run', label: 'Easy run (zone 2)' },
  even: { mode: 'swim', label: 'Easy swim (zone 2)' },
  beachRun: { label: 'Easy 30 min run or ocean swim', minutes: 30 },
  sprints: { label: 'Sand sprints 8 x 15s', minutes: 20 },
}

/** Saturday intervals when tennis is off. Rotates through this list. */
export const INTERVALS = [
  'Hill sprints 8 x 15s (walk back down)',
  'Bike or row 8 x 30s hard + 90s easy',
  'Swim 8 x 50m + 30s rest',
]

export const MOBILITY: { id: string; name: string; gymDaysOnly?: boolean }[] = [
  { id: 'catcow', name: 'Cat-cow x10' },
  { id: 'couch', name: 'Couch stretch 45s / side' },
  { id: 'wgs', name: "World's greatest stretch 5 / side" },
  { id: 'hamstring', name: 'Lying hamstring stretch 2 x 45s / side' },
  { id: 'elephant', name: 'Elephant walks x20' },
  { id: 'ninety', name: '90/90 hip switches 8 / side' },
  { id: 'hang', name: 'Dead hang 2 x 20-30s', gymDaysOnly: true },
]

export const PRESTART_CHECKLIST: { id: string; text: string }[] = [
  { id: 'install', text: 'Install Level Up on your Home Screen' },
  { id: 'backup', text: 'Do a test backup (Settings > Export)' },
  { id: 'gym', text: 'Check your gym has a trap bar, leg press, cables and a box' },
  { id: 'weights', text: 'Enter starting weights for Week 1 (Settings)' },
  { id: 'band', text: 'Get a resistance band (needed for beach block)' },
  { id: 'backpack', text: 'Pick a backpack you can load for beach sessions' },
  { id: 'scale', text: 'Bathroom scale ready for daily weigh-ins' },
  { id: 'tape', text: 'Tape measure for arm / chest / waist' },
  { id: 'route', text: 'Plan a flat 5 km route for Wed 18 Nov' },
  { id: 'jump', text: 'Find a wall to test jump reach' },
  { id: 'tennis', text: 'Confirm Saturday tennis at 1pm' },
]

// ---------------------------------------------------------------------------
//  Tests (boss battles)
// ---------------------------------------------------------------------------
export const TEST_ITEMS: Record<
  TestItemId,
  { name: string; unit: string; better: 'higher' | 'lower' | 'none'; hint?: string }
> = {
  bodyweight: { name: 'Bodyweight (7-day avg)', unit: 'kg', better: 'higher', hint: 'Filled from your weigh-ins if you have them' },
  arm: { name: 'Arm', unit: 'cm', better: 'higher', hint: 'Flexed, widest point' },
  chest: { name: 'Chest', unit: 'cm', better: 'higher', hint: 'Under armpits, relaxed' },
  waist: { name: 'Waist', unit: 'cm', better: 'none', hint: 'At belly button' },
  photos: { name: 'Progress photos', unit: '', better: 'none', hint: 'Optional: front, side, back' },
  pushups: { name: 'Max push-ups', unit: 'reps', better: 'higher', hint: 'Chest to fist height, no rest at top' },
  pullups: { name: 'Max strict pull-ups', unit: 'reps', better: 'higher', hint: 'Dead hang, chin over bar' },
  toeTouch: { name: 'Toe touch', unit: 'cm', better: 'higher', hint: 'Fingertips past toes = +, short = −' },
  jumpReach: { name: 'Jump reach', unit: 'cm', better: 'higher', hint: 'Jump touch minus standing reach' },
  fiveK: { name: '5 km time', unit: 'min', better: 'lower', hint: 'mm:ss' },
  restingHr: { name: 'Resting HR', unit: 'bpm', better: 'lower', hint: 'From your Garmin' },
  lifts: { name: 'Best sets (squat / bench / deadlift)', unit: 'kg', better: 'higher', hint: 'Pulled from your logged sets this week' },
}

const BODY_SKILLS: TestItemId[] = ['bodyweight', 'arm', 'chest', 'waist', 'photos', 'pushups', 'pullups', 'toeTouch', 'jumpReach', 'restingHr', 'lifts']

export const TEST_DAYS: TestDay[] = [
  { id: 'T1A', date: '2026-11-16', boss: 'The Baseline Golem', bossEmoji: '🗿', items: BODY_SKILLS },
  { id: 'T1B', date: '2026-11-18', boss: 'The 5K Wraith', bossEmoji: '👻', items: ['fiveK'] },
  { id: 'T2', date: '2026-12-23', boss: 'The Christmas Krampus', bossEmoji: '👹', items: [...BODY_SKILLS, 'fiveK'] },
  { id: 'T3A', date: '2027-02-08', boss: 'The Final Titan', bossEmoji: '🐉', items: BODY_SKILLS },
  { id: 'T3B', date: '2027-02-10', boss: 'The 5K Phantom', bossEmoji: '💀', items: ['fiveK'] },
]

/** Test items used for repeat-Push cycles (day A = Monday, day B = Wednesday). */
export const REPEAT_TEST_ITEMS = { A: BODY_SKILLS, B: ['fiveK'] as TestItemId[] }
