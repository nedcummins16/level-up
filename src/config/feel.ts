// ============================================================================
//  LEVEL UP: "FEEL IT HERE" CARDS
//  For every exercise: the main muscles (lit up on the body map), where you
//  should feel it, and what it means if you feel it somewhere else + the fix.
//  Keys match the exercise ids in program.ts. Edit freely.
// ============================================================================

import type { FeelCard } from './types'

export const FEEL: Record<string, FeelCard> = {
  // ---------------------------------------------------------------- Lower A
  boxJump: {
    primary: ['quads', 'glutes', 'calves'],
    secondary: ['hamstrings'],
    feel: 'A fast, springy push through the whole leg. You should land quietly, not feel crushed.',
    wrong: [
      { at: 'knees', means: 'Landing stiff-legged or knees caving in.', fix: 'Land soft like a ninja: hips back, knees out over toes. Pick a lower box.' },
      { at: 'shins', means: 'Landing on your toes and jarring.', fix: 'Land with the whole foot flat, then step (don\'t jump) down.' },
    ],
  },
  backSquat: {
    primary: ['quads', 'glutes'],
    secondary: ['adductors', 'lowerBack', 'abs'],
    feel: 'Front of the thighs and glutes working hard out of the bottom. Your trunk feels tight like a brace, not strained.',
    wrong: [
      { at: 'lowerBack', means: 'Chest dropping and hips shooting up first ("good-morning squat").', fix: 'Big breath and brace before each rep, push your back up into the bar, lead with the chest.' },
      { at: 'knees', means: 'Knees caving in or the weight on your toes.', fix: 'Spread the floor with your feet, knees track over toes, weight over mid-foot.' },
      { at: 'wrists', means: 'Holding the bar with bent-back wrists.', fix: 'Grip a bit wider, keep wrists straight and squeeze your shoulder blades so your back holds the bar.' },
    ],
  },
  gobletSquat: {
    primary: ['quads', 'glutes'],
    secondary: ['adductors', 'abs', 'upperBack'],
    feel: 'Thighs and glutes, with your upper back working to keep you upright.',
    wrong: [
      { at: 'lowerBack', means: 'Leaning forward and rounding at the bottom.', fix: 'Hold the dumbbell tight to your chest, elbows down, sit between your heels.' },
      { at: 'knees', means: 'Knees collapsing in.', fix: 'Push knees out; elbows can nudge them out at the bottom.' },
      { at: 'forearms', means: 'Arms doing all the work holding the weight.', fix: 'Normal, but rest the bell on your chest instead of holding it out.' },
    ],
  },
  rdl: {
    primary: ['hamstrings', 'glutes'],
    secondary: ['lowerBack', 'upperBack', 'forearms'],
    feel: 'A big stretch down the back of the thighs as you lower, then glutes squeezing to stand.',
    wrong: [
      { at: 'lowerBack', means: 'Bending at the waist or rounding instead of hinging.', fix: 'Push your hips further back like shutting a car door with your butt; keep the bar against your legs and stop when the stretch peaks.' },
      { at: 'knees', means: 'Turning it into a squat.', fix: 'Soft knees that stay put; only the hips move back.' },
    ],
  },
  dbWalkingLunge: {
    primary: ['quads', 'glutes'],
    secondary: ['adductors', 'hamstrings'],
    feel: 'Front thigh and glute of the front leg, plus balance work.',
    wrong: [
      { at: 'knees', means: 'Steps too short so the front knee shoots forward.', fix: 'Take longer steps and drop the back knee straight down.' },
      { at: 'hipFlexors', means: 'Back leg doing too much.', fix: 'Push through the front heel; the back leg is just for balance.' },
      { at: 'lowerBack', means: 'Leaning back or arching.', fix: 'Stay tall, ribs down, slight forward lean is fine.' },
    ],
  },
  legCurl: {
    primary: ['hamstrings'],
    secondary: ['calves'],
    feel: 'Back of the thighs, strongest squeeze at the top.',
    wrong: [
      { at: 'lowerBack', means: 'Hips lifting off the pad (lying) or arching.', fix: 'Press hips into the pad, lighter weight, slow 3-second lowering.' },
      { at: 'calves', means: 'Pointing toes and using calves.', fix: 'Pull toes up towards your shins.' },
    ],
  },
  standingCalfRaise: {
    primary: ['calves'],
    feel: 'Burn in the calves, deep stretch at the bottom.',
    wrong: [
      { at: 'knees', means: 'Bending the knees to bounce the weight.', fix: 'Straight legs, pause 1 second at the bottom stretch and top squeeze.' },
      { at: 'shins', means: 'Rocking forward onto your toes.', fix: 'Go straight up over the big toe, full range.' },
    ],
  },
  deadBug: {
    primary: ['abs'],
    secondary: ['obliques', 'hipFlexors'],
    feel: 'Deep abs working to keep your lower back glued to the floor.',
    wrong: [
      { at: 'lowerBack', means: 'Back arching off the floor as the leg goes out.', fix: 'Exhale fully, flatten your back first, and only lower the leg as far as you can keep it flat.' },
      { at: 'neck', means: 'Straining the head up.', fix: 'Head down and relaxed.' },
      { at: 'hipFlexors', means: 'Legs too far away.', fix: 'Keep knees bent, smaller range.' },
    ],
  },

  // ---------------------------------------------------------------- Upper A
  benchPress: {
    primary: ['chest'],
    secondary: ['triceps', 'frontDelts'],
    feel: 'Chest doing most of the work, triceps finishing the lockout.',
    wrong: [
      { at: 'shoulderJoint', means: 'Elbows flared out wide and shoulders rolled forward.', fix: 'Squeeze shoulder blades together and down, tuck elbows to about 45°, touch lower chest.' },
      { at: 'wrists', means: 'Bar sitting in the fingers, wrists bent back.', fix: 'Bar low in the palm, over the forearm, wrists stacked.' },
      { at: 'lowerBack', means: 'Butt lifting or huge arch.', fix: 'Keep glutes on the bench, feet planted, small natural arch only.' },
    ],
  },
  chestSupportedRow: {
    primary: ['upperBack', 'lats'],
    secondary: ['rearDelts', 'biceps'],
    feel: 'Between and under the shoulder blades as you squeeze them together.',
    wrong: [
      { at: 'biceps', means: 'Pulling with your hands.', fix: 'Lead with the elbows, think "hands are just hooks", squeeze shoulder blades at the top.' },
      { at: 'traps', means: 'Shrugging up to your ears.', fix: 'Shoulders down and back, pull towards your hips.' },
      { at: 'lowerBack', means: 'Lifting your chest off the pad to cheat.', fix: 'Chest stays on the pad; lighter weight.' },
    ],
  },
  seatedDbPress: {
    primary: ['frontDelts', 'sideDelts'],
    secondary: ['triceps', 'traps'],
    feel: 'Shoulders (top and side), triceps helping at the top.',
    wrong: [
      { at: 'lowerBack', means: 'Arching back to turn it into an incline press.', fix: 'Back against the pad, ribs down, brace your abs.' },
      { at: 'neck', means: 'Shrugging as you press.', fix: 'Keep shoulders down; stop just short of lockout.' },
      { at: 'shoulderJoint', means: 'Elbows flared straight out to the sides.', fix: 'Bring elbows slightly forward (about 30° in front of your body).' },
    ],
  },
  latPulldown: {
    primary: ['lats'],
    secondary: ['biceps', 'upperBack'],
    feel: 'Sides of your back under the armpits, like you\'re pulling your elbows into your back pockets.',
    wrong: [
      { at: 'biceps', means: 'Arms doing the pulling.', fix: 'Lead with the elbows, thumbs over the bar, drive elbows down to your sides.' },
      { at: 'lowerBack', means: 'Leaning way back and swinging.', fix: 'Slight lean only, thighs locked under the pad, lighter weight.' },
      { at: 'traps', means: 'Shoulders shrugging up.', fix: 'Pull shoulders down first, then the elbows.' },
    ],
  },
  dbLateralRaise: {
    primary: ['sideDelts'],
    secondary: ['traps'],
    feel: 'The side of your shoulders, burning by the last reps.',
    wrong: [
      { at: 'traps', means: 'Shrugging the weight up.', fix: 'Lighter dumbbells, lead with the elbows, stop at shoulder height, "pour the jug" slightly.' },
      { at: 'frontDelts', means: 'Raising in front of you.', fix: 'Lift out to the sides, slightly in front of your body.' },
    ],
  },
  dbCurl: {
    primary: ['biceps'],
    secondary: ['forearms'],
    feel: 'Front of the upper arm, squeeze at the top.',
    wrong: [
      { at: 'frontDelts', means: 'Elbows drifting forward.', fix: 'Pin elbows to your sides.' },
      { at: 'lowerBack', means: 'Swinging the weight up.', fix: 'Stand tall, lighter weight, 2-second lower.' },
    ],
  },
  tricepsPushdown: {
    primary: ['triceps'],
    feel: 'Back of the upper arm, especially at the lockout.',
    wrong: [
      { at: 'chest', means: 'Leaning over and pushing with your body.', fix: 'Stand tall, elbows pinned to your sides, only the forearms move.' },
      { at: 'elbows', means: 'Snapping into lockout.', fix: 'Controlled reps, squeeze at the bottom, don\'t slam.' },
    ],
  },
  pallofPress: {
    primary: ['obliques', 'abs'],
    secondary: ['glutes'],
    feel: 'Sides of your waist fighting the cable trying to twist you.',
    wrong: [
      { at: 'shoulderJoint', means: 'Arms doing the work.', fix: 'Press straight out from the chest and hold 1-2 seconds; the challenge is not rotating.' },
      { at: 'lowerBack', means: 'Twisting or leaning away.', fix: 'Feet shoulder-width, squeeze glutes, ribs down, step closer to the stack.' },
    ],
  },

  // ---------------------------------------------------------------- Lower B
  broadJump: {
    primary: ['glutes', 'quads', 'hamstrings'],
    secondary: ['calves'],
    feel: 'An explosive hip snap, like you\'re being launched forward.',
    wrong: [
      { at: 'knees', means: 'Stiff landing.', fix: 'Land with soft knees and hips back, stick it for a second.' },
      { at: 'lowerBack', means: 'Arching to reach further.', fix: 'Swing arms, drive hips forward, land balanced. Quality over distance.' },
    ],
  },
  trapBarDeadlift: {
    primary: ['glutes', 'quads', 'hamstrings'],
    secondary: ['lowerBack', 'upperBack', 'forearms', 'traps'],
    feel: 'Legs pushing the floor away, glutes locking you out. Back stays tight but not sore.',
    wrong: [
      { at: 'lowerBack', means: 'Back rounding or hips rising first.', fix: 'Chest up, "bend the handles" to lock your lats, push the floor away with your legs.' },
      { at: 'forearms', means: 'Grip giving out first.', fix: 'Normal at first. Squeeze hard, use chalk; it gets better.' },
    ],
  },
  conventionalDeadlift: {
    primary: ['glutes', 'hamstrings'],
    secondary: ['lowerBack', 'upperBack', 'quads', 'forearms'],
    feel: 'Back of the legs and glutes, with your back braced like a plank.',
    wrong: [
      { at: 'lowerBack', means: 'Rounding or bar drifting away from your legs.', fix: 'Bar over mid-foot, drag it up your shins, big brace, "protect your armpits".' },
      { at: 'shins', means: 'Bar scraping hard.', fix: 'Normal-ish (wear long socks) but don\'t let knees push the bar forward.' },
    ],
  },
  legPress: {
    primary: ['quads', 'glutes'],
    secondary: ['adductors'],
    feel: 'Thighs and glutes, pushing through the whole foot.',
    wrong: [
      { at: 'lowerBack', means: 'Going too deep so your hips peel off the seat.', fix: 'Only lower as far as your butt stays down.' },
      { at: 'knees', means: 'Locking out hard or knees caving.', fix: 'Stop just short of lockout, push knees out over toes.' },
    ],
  },
  bulgarianSplitSquat: {
    primary: ['quads', 'glutes'],
    secondary: ['adductors', 'hamstrings'],
    feel: 'Front leg\'s thigh and glute; a stretch in the back leg\'s hip.',
    wrong: [
      { at: 'knees', means: 'Front foot too close to the bench.', fix: 'Step the front foot further out; drop straight down.' },
      { at: 'hipFlexors', means: 'Back leg pushing.', fix: 'Normal stretch, but 90% of the weight is on the front foot.' },
      { at: 'lowerBack', means: 'Arching to stay upright.', fix: 'Lean your chest slightly forward for more glute.' },
    ],
  },
  hipThrust: {
    primary: ['glutes'],
    secondary: ['hamstrings', 'quads'],
    feel: 'Glutes burning and squeezing hard at the top.',
    wrong: [
      { at: 'lowerBack', means: 'Arching your back to lift instead of your hips.', fix: 'Chin tucked, ribs down, tilt your pelvis under at the top.' },
      { at: 'hamstrings', means: 'Feet too far away.', fix: 'Bring feet closer so shins are vertical at the top.' },
      { at: 'quads', means: 'Feet too close.', fix: 'Move feet slightly further out.' },
    ],
  },
  singleLegCalfRaise: {
    primary: ['calves'],
    feel: 'Calf of the working leg, full stretch and full squeeze.',
    wrong: [
      { at: 'knees', means: 'Bouncing with a bent knee.', fix: 'Straight leg, slow, pause at the bottom.' },
      { at: 'forearms', means: 'Gripping the rail hard.', fix: 'Fingertips only for balance.' },
    ],
  },
  hangingKneeRaise: {
    primary: ['abs'],
    secondary: ['hipFlexors', 'forearms', 'lats'],
    feel: 'Lower abs curling your pelvis up at the top.',
    wrong: [
      { at: 'hipFlexors', means: 'Just lifting your knees.', fix: 'Curl your tailbone up at the top; slow down, no swinging.' },
      { at: 'forearms', means: 'Grip failing first.', fix: 'Use ab straps or the captain\'s chair.' },
    ],
  },

  // ---------------------------------------------------------------- Upper B
  pullUp: {
    primary: ['lats'],
    secondary: ['biceps', 'upperBack', 'forearms'],
    feel: 'Sides of your back pulling your elbows down to your ribs.',
    wrong: [
      { at: 'biceps', means: 'Arm-pulling.', fix: 'Start each rep by pulling shoulders down, then drive elbows to your back pockets.' },
      { at: 'neck', means: 'Craning the chin over the bar.', fix: 'Chest to the bar, neck neutral. Stop a little lower if needed.' },
      { at: 'elbows', means: 'Dropping fast at the bottom.', fix: 'Control the lowering, 2 seconds down.' },
    ],
  },
  inclineDbPress: {
    primary: ['chest'],
    secondary: ['frontDelts', 'triceps'],
    feel: 'Upper chest under the collarbones.',
    wrong: [
      { at: 'frontDelts', means: 'Bench too steep.', fix: 'Set the bench to about 30°, keep shoulder blades pinned back.' },
      { at: 'shoulderJoint', means: 'Lowering too deep with elbows flared.', fix: 'Elbows 45°, stop when dumbbells reach chest level.' },
    ],
  },
  oneArmDbRow: {
    primary: ['lats', 'upperBack'],
    secondary: ['rearDelts', 'biceps'],
    feel: 'The side of your back on the working side.',
    wrong: [
      { at: 'biceps', means: 'Curling the weight up.', fix: 'Lead with the elbow, pull towards your hip like starting a lawnmower slowly.' },
      { at: 'lowerBack', means: 'Twisting your torso to lift.', fix: 'Square shoulders and hips, brace, lighter weight.' },
    ],
  },
  pushUp: {
    primary: ['chest'],
    secondary: ['triceps', 'frontDelts', 'abs'],
    feel: 'Chest and triceps, with your whole body tight as a plank.',
    wrong: [
      { at: 'lowerBack', means: 'Hips sagging.', fix: 'Squeeze glutes and abs; body in one straight line.' },
      { at: 'wrists', means: 'Hands too far forward.', fix: 'Hands under shoulders, fingers spread; use push-up handles or fists if needed.' },
      { at: 'shoulderJoint', means: 'Elbows flared to a "T".', fix: 'Elbows at 45°, like an arrow, not a T.' },
    ],
  },
  facePull: {
    primary: ['rearDelts', 'upperBack'],
    secondary: ['traps'],
    feel: 'Back of the shoulders and between the shoulder blades.',
    wrong: [
      { at: 'traps', means: 'Shrugging the rope up.', fix: 'Rope at forehead height, pull towards your eyes, elbows high and wide, shoulders down.' },
      { at: 'lowerBack', means: 'Leaning back to pull more weight.', fix: 'Lighter weight, stand tall, pause 1 second.' },
    ],
  },
  hammerCurl: {
    primary: ['biceps', 'forearms'],
    feel: 'Front of the upper arm and top of the forearm.',
    wrong: [
      { at: 'frontDelts', means: 'Elbows swinging forward.', fix: 'Elbows pinned, palms facing each other.' },
      { at: 'wrists', means: 'Wrists bending.', fix: 'Keep wrists straight, lighter weight.' },
    ],
  },
  overheadTricepsExt: {
    primary: ['triceps'],
    feel: 'A long stretch in the back of the arm, then a squeeze at the top.',
    wrong: [
      { at: 'elbows', means: 'Going too heavy or elbows flaring.', fix: 'Lighter weight, elbows point forward, slow stretch at the bottom.' },
      { at: 'lowerBack', means: 'Arching as you press up.', fix: 'Sit down or brace your abs, ribs down.' },
    ],
  },
  sidePlank: {
    primary: ['obliques'],
    secondary: ['abs', 'glutes', 'sideDelts'],
    feel: 'The side of your waist that\'s facing the floor.',
    wrong: [
      { at: 'shoulderJoint', means: 'Sinking into the shoulder.', fix: 'Elbow right under the shoulder, push the floor away.' },
      { at: 'lowerBack', means: 'Hips dropping or bending forward.', fix: 'Hips high, body straight from head to heels, squeeze glutes. Knees down if needed.' },
    ],
  },

  // ---------------------------------------------------------------- Swaps
  hackSquat: {
    primary: ['quads'],
    secondary: ['glutes'],
    feel: 'Front of the thighs, deep stretch at the bottom.',
    wrong: [
      { at: 'knees', means: 'Feet too low on the plate for your mobility.', fix: 'Move feet a bit higher, control the bottom.' },
      { at: 'lowerBack', means: 'Hips peeling off the pad.', fix: 'Stop the depth before your back leaves the pad.' },
    ],
  },
  dbRdl: {
    primary: ['hamstrings', 'glutes'],
    secondary: ['lowerBack', 'forearms'],
    feel: 'Stretch down the back of the thighs, glutes to stand.',
    wrong: [{ at: 'lowerBack', means: 'Bending instead of hinging.', fix: 'Push your hips back, dumbbells slide down your thighs, stop at the stretch.' }],
  },
  backExtension: {
    primary: ['glutes', 'hamstrings'],
    secondary: ['lowerBack'],
    feel: 'Glutes and hamstrings, with your lower back gently working. Back-friendly when done right.',
    wrong: [{ at: 'lowerBack', means: 'Hyper-extending at the top.', fix: 'Stop when your body is straight; hinge from the hips, squeeze glutes.' }],
  },
  reverseLungeDb: {
    primary: ['quads', 'glutes'],
    secondary: ['hamstrings', 'adductors'],
    feel: 'Front thigh and glute. Kinder on the knees than forward lunges.',
    wrong: [{ at: 'knees', means: 'Knee caving in.', fix: 'Front knee tracks over toes, step back far enough.' }],
  },
  dbBench: {
    primary: ['chest'],
    secondary: ['triceps', 'frontDelts'],
    feel: 'Chest stretch at the bottom, squeeze at the top.',
    wrong: [{ at: 'shoulderJoint', means: 'Flared elbows, shoulders rolled forward.', fix: 'Pin shoulder blades back, elbows 45°.' }],
  },
  machineChestPress: {
    primary: ['chest'],
    secondary: ['triceps', 'frontDelts'],
    feel: 'Chest. Handles at mid-chest height.',
    wrong: [{ at: 'shoulderJoint', means: 'Seat too low/high or shoulders rolling forward.', fix: 'Adjust seat so handles line up with mid-chest, chest up.' }],
  },
  seatedCableRow: {
    primary: ['upperBack', 'lats'],
    secondary: ['biceps', 'rearDelts'],
    feel: 'Middle of the back, squeezing shoulder blades together.',
    wrong: [
      { at: 'lowerBack', means: 'Rocking back and forth.', fix: 'Sit tall, torso still, pull to your belly button.' },
      { at: 'biceps', means: 'Pulling with arms.', fix: 'Lead with the elbows.' },
    ],
  },
  machineShoulderPress: {
    primary: ['frontDelts', 'sideDelts'],
    secondary: ['triceps'],
    feel: 'Shoulders and triceps.',
    wrong: [{ at: 'neck', means: 'Shrugging.', fix: 'Shoulders down, back on the pad.' }],
  },
  cableLateralRaise: {
    primary: ['sideDelts'],
    feel: 'Side of the shoulder, constant tension.',
    wrong: [{ at: 'traps', means: 'Shrugging.', fix: 'Lighter, lead with the elbow, stop at shoulder height.' }],
  },
  cableCurl: {
    primary: ['biceps'],
    secondary: ['forearms'],
    feel: 'Biceps, constant tension through the whole rep.',
    wrong: [{ at: 'frontDelts', means: 'Elbows drifting forward.', fix: 'Elbows by your sides.' }],
  },
  gluteBridgeMachine: {
    primary: ['glutes'],
    secondary: ['hamstrings'],
    feel: 'Glutes squeezing at the top.',
    wrong: [{ at: 'lowerBack', means: 'Arching.', fix: 'Tuck your pelvis at the top, chin down.' }],
  },
  bandPullApart: {
    primary: ['rearDelts', 'upperBack'],
    feel: 'Back of the shoulders and between the shoulder blades.',
    wrong: [{ at: 'traps', means: 'Shrugging.', fix: 'Arms straight, shoulders down, pull the band to your chest.' }],
  },
  bandPallof: {
    primary: ['obliques', 'abs'],
    feel: 'Sides of your waist resisting the twist.',
    wrong: [{ at: 'shoulderJoint', means: 'Arms doing the work.', fix: 'Press out from the chest and hold; stay square.' }],
  },

  // ---------------------------------------------------------------- Beach
  bssBackpack: {
    primary: ['quads', 'glutes'],
    secondary: ['adductors'],
    feel: 'Front leg burning: thigh and glute. Back foot on a rock, bench or step.',
    wrong: [
      { at: 'knees', means: 'Front foot too close.', fix: 'Step further out; drop straight down.' },
      { at: 'lowerBack', means: 'Backpack pulling you back.', fix: 'Straps tight, lean slightly forward.' },
    ],
  },
  bandRow: {
    primary: ['upperBack', 'lats'],
    secondary: ['biceps', 'rearDelts'],
    feel: 'Between the shoulder blades.',
    wrong: [{ at: 'biceps', means: 'Arm-pulling.', fix: 'Elbows lead, squeeze shoulder blades, pause 1 second.' }],
  },
  pullUpBeach: {
    primary: ['lats'],
    secondary: ['biceps', 'upperBack', 'forearms'],
    feel: 'Sides of your back. Any bar, tree branch or playground will do.',
    wrong: [
      { at: 'biceps', means: 'Arm-pulling.', fix: 'Shoulders down first, elbows to your ribs.' },
      { at: 'forearms', means: 'Grip on a thick branch.', fix: 'Normal; rest more or swap to band rows.' },
    ],
  },
  pikePushUp: {
    primary: ['frontDelts', 'sideDelts'],
    secondary: ['triceps', 'traps'],
    feel: 'Shoulders, like an upside-down shoulder press.',
    wrong: [
      { at: 'neck', means: 'Head hitting the ground first.', fix: 'Head goes in front of your hands, forming a triangle.' },
      { at: 'wrists', means: 'Weight too far over the hands on sand.', fix: 'Spread fingers, use a flat spot or towel.' },
    ],
  },
  slRdlBackpack: {
    primary: ['hamstrings', 'glutes'],
    secondary: ['lowerBack', 'calves'],
    feel: 'Hamstring stretch on the standing leg, plus balance.',
    wrong: [
      { at: 'lowerBack', means: 'Rounding to reach down.', fix: 'Hips back, back flat, back leg in line with your body. Only go as low as stays flat.' },
      { at: 'knees', means: 'Locked standing knee.', fix: 'Keep a soft bend.' },
    ],
  },
  slCalfRaiseBeach: {
    primary: ['calves'],
    feel: 'Calf of the working leg. Use a step or rock for full range.',
    wrong: [{ at: 'knees', means: 'Bouncing.', fix: 'Straight leg, slow, full range.' }],
  },
  plank: {
    primary: ['abs'],
    secondary: ['obliques', 'glutes', 'frontDelts'],
    feel: 'Whole front of your trunk, shaking by the end.',
    wrong: [
      { at: 'lowerBack', means: 'Hips sagging.', fix: 'Squeeze glutes, tuck your pelvis, ribs down.' },
      { at: 'shoulderJoint', means: 'Sinking between the shoulders.', fix: 'Push the ground away, elbows under shoulders.' },
    ],
  },
  squatJump: {
    primary: ['quads', 'glutes', 'calves'],
    feel: 'Explosive legs; quiet landings.',
    wrong: [{ at: 'knees', means: 'Hard landings or knees caving.', fix: 'Land soft into the next squat, knees out. Sand helps.' }],
  },
  backpackGobletSquat: {
    primary: ['quads', 'glutes'],
    secondary: ['abs', 'upperBack'],
    feel: 'Thighs burning thanks to the slow 3-second lowering.',
    wrong: [
      { at: 'lowerBack', means: 'Leaning forward.', fix: 'Hug the pack tight to your chest, sit between your heels.' },
      { at: 'knees', means: 'Knees caving.', fix: 'Knees out over toes.' },
    ],
  },
  diamondPushUp: {
    primary: ['triceps', 'chest'],
    secondary: ['frontDelts'],
    feel: 'Triceps and inner chest.',
    wrong: [
      { at: 'wrists', means: 'Hands too far forward.', fix: 'Hands under your chest; widen slightly if wrists hurt.' },
      { at: 'elbows', means: 'Elbows flaring out.', fix: 'Keep elbows close to your ribs.' },
    ],
  },
  bandRowOrPullApart: {
    primary: ['upperBack', 'rearDelts'],
    secondary: ['lats'],
    feel: 'Between and behind the shoulder blades.',
    wrong: [{ at: 'traps', means: 'Shrugging.', fix: 'Shoulders down, squeeze the blades, pause.' }],
  },
  reverseLunge: {
    primary: ['quads', 'glutes'],
    secondary: ['hamstrings'],
    feel: 'Front leg\'s thigh and glute.',
    wrong: [{ at: 'knees', means: 'Short step.', fix: 'Step back further, drop the back knee straight down.' }],
  },
  slGluteBridge: {
    primary: ['glutes'],
    secondary: ['hamstrings'],
    feel: 'Glute of the planted leg squeezing hard at the top.',
    wrong: [
      { at: 'hamstrings', means: 'Hamstring cramping.', fix: 'Bring the foot closer to your butt, push through the heel.' },
      { at: 'lowerBack', means: 'Arching up.', fix: 'Ribs down, tuck pelvis, hold 1 second.' },
    ],
  },
  bandCurlPushdown: {
    primary: ['biceps', 'triceps'],
    secondary: ['forearms'],
    feel: 'Biceps on the curls, triceps on the pushdowns.',
    wrong: [{ at: 'frontDelts', means: 'Elbows moving.', fix: 'Pin elbows to your sides for both.' }],
  },
}
