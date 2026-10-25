// ============================================================================
//  LEVEL UP: GAME CONFIG
//  XP values, levels, titles, unlockables, quests, raids and achievements.
// ============================================================================

export const XP = {
  set: 10,
  session: 100,
  cardio: 60,
  mobility: 20,
  checkin: 50,
  pr: 150,
  dailyQuest: 10, // protein / steps / smoothie / 5 meals
  recovery: 20, // rest day + mobility done
  weeklyQuest: 25,
  raidChest: 200,
  achievement: 100,
  boss: 500,
  /** Gym/beach session XP only counts for this many sessions per week (no overtraining). */
  strengthCapPerWeek: 4,
}

/**
 * XP needed to go from level L to L+1. Tuned so a consistent (not perfect)
 * 12 weeks reaches Rim Rattler (level 22, ~38k XP) around the final boss.
 */
export function xpToNext(level: number) {
  return 300 + 150 * (level - 1)
}

export const TITLES = [
  'Couch Rookie',
  'Bench Warmer',
  'Gym Goblin',
  'Rep Recruit',
  'Plate Pusher',
  'Iron Apprentice',
  'Sweat Squire',
  'Barbell Bandit',
  'Squat Scout',
  'Protein Paladin',
  'Deadlift Druid',
  'Pull-up Pirate',
  'Box Jump Bard',
  'Hamstring Hero',
  'Calf Commander',
  'Sprint Sorcerer',
  'Iron Knight',
  'Hang Time Hunter',
  'Glass Cleaner',
  'Posterizer',
  'Dunk Contender',
  'Rim Rattler',
]

export function titleFor(level: number) {
  return TITLES[Math.min(level, TITLES.length) - 1]
}

export interface Unlockable {
  level: number
  kind: 'theme' | 'cosmetic' | 'gym' | 'celebration' | 'sound'
  id: string
  name: string
  slot?: 'head' | 'arms' | 'shoes' | 'shirt' | 'hand' | 'back' | 'aura'
}

export const THEMES: { id: string; name: string; level: number }[] = [
  { id: 'arcade', name: 'Ember', level: 1 },
  { id: 'lava', name: 'Lava', level: 3 },
  { id: 'ocean', name: 'Cyan', level: 6 },
  { id: 'forest', name: 'Toxic', level: 9 },
  { id: 'court', name: 'Court', level: 12 },
  { id: 'synth', name: 'Neon', level: 15 },
  { id: 'ice', name: 'Frost', level: 18 },
  { id: 'gold', name: 'Champion', level: 21 },
]

export const COSMETICS: Unlockable[] = [
  { level: 2, kind: 'cosmetic', id: 'headband-red', name: 'Red headband', slot: 'head' },
  { level: 4, kind: 'cosmetic', id: 'wristbands', name: 'Wristbands', slot: 'arms' },
  { level: 5, kind: 'cosmetic', id: 'hightops', name: 'High-tops', slot: 'shoes' },
  { level: 7, kind: 'cosmetic', id: 'jersey-blue', name: 'Blue jersey', slot: 'shirt' },
  { level: 8, kind: 'cosmetic', id: 'basketball', name: 'Basketball', slot: 'hand' },
  { level: 10, kind: 'cosmetic', id: 'cape', name: 'Hero cape', slot: 'back' },
  { level: 11, kind: 'cosmetic', id: 'gold-shoes', name: 'Gold sneakers', slot: 'shoes' },
  { level: 13, kind: 'cosmetic', id: 'jersey-red', name: 'Red jersey', slot: 'shirt' },
  { level: 14, kind: 'cosmetic', id: 'headband-gold', name: 'Gold headband', slot: 'head' },
  { level: 16, kind: 'cosmetic', id: 'aura-blue', name: 'Blue aura', slot: 'aura' },
  { level: 17, kind: 'cosmetic', id: 'jersey-black', name: 'Black jersey', slot: 'shirt' },
  { level: 19, kind: 'cosmetic', id: 'cap', name: 'Backwards cap', slot: 'head' },
  { level: 20, kind: 'cosmetic', id: 'aura-gold', name: 'Gold aura', slot: 'aura' },
  { level: 22, kind: 'cosmetic', id: 'crown', name: 'Rim Rattler crown', slot: 'head' },
]

/** Your home gym on the Hero screen: one new piece every other level. */
export const HOME_GYM: { level: number; id: string; name: string }[] = [
  { level: 2, id: 'mat', name: 'Gym mat' },
  { level: 4, id: 'dumbbells', name: 'Dumbbell rack' },
  { level: 6, id: 'bench', name: 'Bench' },
  { level: 8, id: 'kettlebells', name: 'Kettlebells' },
  { level: 10, id: 'rack', name: 'Squat rack' },
  { level: 12, id: 'pullupbar', name: 'Pull-up bar' },
  { level: 14, id: 'plates', name: 'Plate tree' },
  { level: 16, id: 'bike', name: 'Air bike' },
  { level: 18, id: 'poster', name: 'Wall poster' },
  { level: 20, id: 'lights', name: 'Lights + speaker' },
  { level: 22, id: 'hoop', name: 'Basketball hoop' },
]

export const UNLOCKABLES: Unlockable[] = [
  ...THEMES.filter((t) => t.level > 1).map((t) => ({ level: t.level, kind: 'theme' as const, id: t.id, name: `${t.name} theme` })),
  ...COSMETICS,
  ...HOME_GYM.map((g) => ({ level: g.level, kind: 'gym' as const, id: g.id, name: `Home gym: ${g.name}` })),
].sort((a, b) => a.level - b.level)

export const DAILY_QUESTS = [
  { id: 'mobility', name: 'Mobility routine', emoji: '🧘' },
  { id: 'protein', name: 'Protein 120 g+', emoji: '🥩' },
  { id: 'steps', name: 'Steps 8k+', emoji: '👟' },
  { id: 'smoothie', name: 'Smoothie', emoji: '🥤' },
  { id: 'meals', name: 'Eat 5 times (3 meals + 2 snacks)', emoji: '🍽️' },
] as const

export const WEEKLY_QUESTS = [
  { id: 'target', name: 'Hit your weekly session target' },
  { id: 'mobility6', name: 'Mobility on 6 of 7 days' },
  { id: 'steps5', name: 'Steps 8k+ on 5 days' },
  { id: 'weigh5', name: 'Weigh in on 5 days' },
  { id: 'checkin', name: 'Sunday check-in' },
] as const

/** Weekly raids rotate by program week. Each opens a bonus chest. */
export const RAIDS = [
  { id: 'allPlanned', name: 'Full Clear', desc: 'Complete every planned session this week' },
  { id: 'protein5', name: 'Protein Siege', desc: 'Protein 120 g+ on 5 of 7 days' },
  { id: 'onePR', name: 'Record Breaker', desc: 'Set at least one PR' },
  { id: 'mobility7', name: 'Bendy Dungeon', desc: 'Mobility all 7 days' },
  { id: 'smoothie5', name: 'Smoothie Run', desc: 'Smoothie on 5 of 7 days' },
  { id: 'meals5', name: 'Feast Mode', desc: 'Eat 5 times a day on 5 of 7 days' },
  { id: 'steps6', name: 'Step Quest', desc: 'Steps 8k+ on 6 of 7 days' },
  { id: 'allSets', name: 'No Set Left Behind', desc: 'Finish every set of every strength session' },
] as const

export const BEACH_RAID = { id: 'beachAll', name: 'Sand Dungeon', desc: 'Complete every beach session this week' } as const
export const TEST_RAID = { id: 'bosses', name: 'Boss Rush', desc: 'Defeat both bosses this week' } as const

export type RaidId = (typeof RAIDS)[number]['id'] | typeof BEACH_RAID.id | typeof TEST_RAID.id

export const ACHIEVEMENTS = [
  { id: 'firstSession', name: 'First Session', icon: '🎮', desc: 'Finish your first workout' },
  { id: 'firstPR', name: 'First PR', icon: '📈', desc: 'Set your first personal record' },
  { id: 'pullups5', name: '5 Pull-ups', icon: '🧗', desc: '5 strict pull-ups in one set' },
  { id: 'pullups10', name: '10 Pull-ups', icon: '🦍', desc: '10 strict pull-ups in one set' },
  { id: 'pushups30', name: '30 Push-ups', icon: '💪', desc: '30 push-ups in one set' },
  { id: 'bwBench', name: 'Bodyweight Bench', icon: '🏋️', desc: 'Bench your bodyweight' },
  { id: 'toes', name: 'Touch Your Toes', icon: '🦶', desc: 'Toe-touch test at 0 cm or better' },
  { id: 'club60', name: '60 kg Club', icon: '🥈', desc: '7-day average weight 60 kg+' },
  { id: 'club62', name: '62 kg Club', icon: '🥇', desc: '7-day average weight 62 kg+' },
  { id: 'ironWeek', name: 'Iron Week', icon: '🛡️', desc: 'All 6 planned sessions in one week' },
  { id: 'beachSurvivor', name: 'Beach Survivor', icon: '🏝️', desc: 'All 6 beach sessions' },
  { id: 'neverTwice', name: 'Never Missed Twice', icon: '🔁', desc: '4 weeks in a row without missing two planned days back to back' },
  { id: 'dunk', name: 'Dunk', icon: '🏀', desc: 'Throw one down! (unlock it yourself)' },
] as const

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id']

/**
 * Comeback quest: the first session after a missed GYM day earns a bonus (once a week).
 * Quitting usually happens right after one miss, so coming back is the moment to reward.
 * It's smaller than what a skipped session is worth, so skipping on purpose never pays.
 */
export const COMEBACK = { bonus: 50, lookbackDays: 7 }

/** Bulking made simple: tick off 5 eating moments a day. Edit the ideas freely. */
export const FOOD = {
  slots: [
    { id: 'breakfast', name: 'Brekky', emoji: '🍳' },
    { id: 'lunch', name: 'Lunch', emoji: '🥪' },
    { id: 'dinner', name: 'Dinner', emoji: '🍝' },
    { id: 'snack1', name: 'Snack', emoji: '🍌' },
    { id: 'snack2', name: 'Snack', emoji: '🥜' },
  ],
  ideas: [
    { name: 'Bulk smoothie', kcal: 800, protein: 40, what: '400 ml milk, banana, 50 g oats, 2 tbsp peanut butter, 1 scoop whey' },
    { name: 'Spag bol + cheese', kcal: 800, protein: 40, what: 'Big bowl of pasta, beef mince sauce, grated cheese' },
    { name: 'Mince & rice bowl', kcal: 750, protein: 40, what: 'Rice, beef mince, frozen veg, drizzle of olive oil' },
    { name: 'Chicken wraps ×2', kcal: 650, protein: 45, what: 'Wraps, chicken, cheese, avocado, salad' },
    { name: 'Toasties ×2', kcal: 600, protein: 30, what: 'Ham & cheese toasted sandwiches + a glass of milk' },
    { name: 'Eggs on toast', kcal: 600, protein: 30, what: '3 eggs, 2 slices toast with butter, avocado' },
    { name: 'Tuna pasta', kcal: 700, protein: 40, what: 'Pasta, tin of tuna, cheese, sweetcorn, mayo' },
    { name: 'Yoghurt bowl', kcal: 450, protein: 25, what: 'Greek yoghurt, muesli, honey, berries' },
    { name: 'Trail mix + milk', kcal: 450, protein: 18, what: 'Big handful nuts & dried fruit + 300 ml milk' },
    { name: 'PB banana toast', kcal: 400, protein: 14, what: '2 toast, peanut butter, sliced banana' },
  ],
  tips: [
    'Drink milk with meals instead of water: easy 150+ kcal.',
    'Add olive oil, cheese or peanut butter to meals you already eat.',
    'Eat before bed: yoghurt, milk or a toastie.',
    'Never skip breakfast: even a smoothie on the way counts.',
    'Struggling to gain? The app tells you after 2 slow weeks: add ~250 kcal (1 snack).',
  ],
}

/** Streak freezes: earn 1 per 3 complete weeks, store max 2. */
export const FREEZE = { everyWeeks: 3, max: 2 }

// RPG stat formulas (0-99). Tweak to taste.
export const STATS = {
  /** STR from (squat + bench + deadlift + pull-up e1RM) / bodyweight. */
  strRatio: { zero: 1.5, full: 8 },
  /** END: cardio minutes (up to 50 pts) + 5 km time (35:00 = 0 → 20:00 = 49). */
  endMinutesFor50: 1000,
  endFiveK: { slowSec: 35 * 60, fastSec: 20 * 60 },
  /** MOB: toe-touch cm (−20 → 0 pts, +15 → 70) + mobility streak (up to 29). */
  mobToe: { min: -20, max: 15 },
  /** JMP: jump reach cm (20 → 0, 75 → 99). */
  jmp: { min: 20, max: 75 },
}

/**
 * Your hero's body follows your REAL numbers, not your level.
 * Bulk tiers: reached when your 7-day average weight passes these points on the way
 * from start to goal weight. Strength tiers: reached at these STR stat values.
 * You only shrink back after `dropAfterDays` below a tier (one light weigh-in won't undo him).
 */
export const PHYSIQUE = {
  bulkSteps: [0.15, 0.4, 0.65, 0.9],
  strSteps: [25, 35, 45, 60],
  dropAfterDays: 14,
  bulkNames: ['Twig', 'Lean', 'Filling out', 'Solid', 'Built'],
  strNames: ['Noodle arms', 'Getting there', 'Strong', 'Powerful', 'Beast'],
}

/** Dunk meter: your best jump TOUCH height (cm) climbing toward the 3.05 m rim. */
export const DUNK = {
  rimCm: 305,
  milestones: [
    { id: 'net', name: 'Touch the net', cm: 260 },
    { id: 'board', name: 'Touch the backboard', cm: 290 },
    { id: 'rim', name: 'Touch the rim', cm: 305 },
    { id: 'dunk', name: 'Dunk height', cm: 320 },
  ],
}

/** Boss trophies: share of results that beat your last test. */
export const TROPHY = { gold: 0.75, silver: 0.5 }

/**
 * Gear you can't get by levelling: earned with streaks (best streak ever) or by
 * completing a loot collection set.
 */
export const SPECIAL_GEAR: { id: string; name: string; slot: NonNullable<Unlockable['slot']>; streak?: number; set?: string }[] = [
  { id: 'wristbands-streak', name: 'Streak sweatbands', slot: 'arms', streak: 2 },
  { id: 'flame-shoes', name: 'Flame high-tops', slot: 'shoes', streak: 4 },
  { id: 'headband-inferno', name: 'Inferno headband', slot: 'head', streak: 8 },
  { id: 'jacket-champ', name: 'Championship jacket', slot: 'shirt', streak: 12 },
  { id: 'backpack', name: 'Gym backpack', slot: 'back', set: 'gymbag' },
  { id: 'jersey-court', name: 'Court jersey', slot: 'shirt', set: 'court' },
  { id: 'aura-iron', name: 'Iron aura', slot: 'aura', set: 'iron' },
  { id: 'aura-legend', name: 'Legend aura', slot: 'aura', set: 'legends' },
]

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

/** Loot: a drop after every planned session that earns XP (max 6 a week), plus the raid chest. */
export const LOOT = {
  odds: { common: 0.6, rare: 0.28, epic: 0.1, legendary: 0.02 } as Record<Rarity, number>,
  /** A rare-or-better drop is guaranteed after this many commons in a row. */
  pity: 3,
  maxPerWeek: 6,
  /** Raid chest odds (always rare or better). */
  chestOdds: { common: 0, rare: 0.62, epic: 0.3, legendary: 0.08 } as Record<Rarity, number>,
  duplicateXP: 25,
  sets: [
    { id: 'gymbag', name: 'Gym Bag', rarity: 'common' as Rarity },
    { id: 'court', name: 'Court Kings', rarity: 'rare' as Rarity },
    { id: 'iron', name: 'Iron Vault', rarity: 'epic' as Rarity },
    { id: 'legends', name: 'Legends', rarity: 'legendary' as Rarity },
  ],
  items: [
    { id: 'shaker', name: 'Protein shaker', set: 'gymbag', icon: '🥤' },
    { id: 'towel', name: 'Gym towel', set: 'gymbag', icon: '🧻' },
    { id: 'bottle', name: 'Water bottle', set: 'gymbag', icon: '💧' },
    { id: 'chalk', name: 'Chalk ball', set: 'gymbag', icon: '🥚' },
    { id: 'straps', name: 'Lifting straps', set: 'gymbag', icon: '🎗️' },
    { id: 'signedball', name: 'Signed ball', set: 'court', icon: '🏀' },
    { id: 'whistle', name: 'Coach whistle', set: 'court', icon: '📯' },
    { id: 'kicks', name: 'Retro kicks', set: 'court', icon: '👟' },
    { id: 'net', name: 'Game-winner net', set: 'court', icon: '🥅' },
    { id: 'scoreboard', name: 'Mini scoreboard', set: 'court', icon: '📟' },
    { id: 'golddb', name: 'Gold dumbbell', set: 'iron', icon: '🏋️' },
    { id: 'luckyplate', name: 'Lucky plate', set: 'iron', icon: '💿' },
    { id: 'chain', name: 'Iron chain', set: 'iron', icon: '⛓️' },
    { id: 'belt', name: 'Champion belt', set: 'iron', icon: '🥋' },
    { id: 'kettle', name: 'Golden kettlebell', set: 'iron', icon: '🔔' },
    { id: 'mvp', name: 'MVP trophy', set: 'legends', icon: '🏆' },
    { id: 'ring', name: 'Championship ring', set: 'legends', icon: '💍' },
    { id: 'goldhoop', name: 'Golden hoop', set: 'legends', icon: '⭕' },
    { id: 'crownjewel', name: 'Crown jewel', set: 'legends', icon: '💎' },
  ],
}

/** Start a gym session within this many minutes of the time you planned = on-time bonus. */
export const ON_TIME = { windowMin: 30, xp: 25 }

/**
 * Skill tree: 1 skill point per level (from level 2). Skills are NEW tools only.
 * Core features (Life Happens, progression, warm-up, last-time numbers) are never locked.
 */
export const SKILLS: { id: string; name: string; desc: string; cost: number; branch: 'coach' | 'rival' | 'resilience'; requires: string[] }[] = [
  { id: 'plates', name: 'Plate calculator', desc: 'Shows which plates go on each side of the bar.', cost: 1, branch: 'coach', requires: [] },
  { id: 'warmups', name: 'Ramp-up every lift', desc: 'Ramp-up sets for every barbell lift, not just the first.', cost: 1, branch: 'coach', requires: ['plates'] },
  { id: 'restPresets', name: 'Rest presets', desc: 'One-tap 60 / 90 / 120 / 180 s buttons on the rest timer.', cost: 1, branch: 'coach', requires: ['warmups'] },
  { id: 'ghost', name: 'Ghost race', desc: "Last session's numbers on every set. Beat your ghost.", cost: 1, branch: 'rival', requires: [] },
  { id: 'prPredict', name: 'PR predictor', desc: 'Shows exactly what counts as a PR on each exercise.', cost: 2, branch: 'rival', requires: ['ghost'] },
  { id: 'trend', name: 'Strength trend', desc: 'Your estimated 1RM trend (kg per week) on each lift.', cost: 2, branch: 'rival', requires: ['prPredict'] },
  { id: 'stretchTimer', name: 'Stretch timer', desc: 'Tap-to-start 45 s timers on timed mobility stretches.', cost: 1, branch: 'resilience', requires: [] },
  { id: 'freeze3', name: 'Deep freezer', desc: 'Store up to 3 streak freezes instead of 2.', cost: 3, branch: 'resilience', requires: ['stretchTimer'] },
]

export const SKILL_BRANCHES = [
  { id: 'coach', name: 'Coach', desc: 'Smarter loading' },
  { id: 'rival', name: 'Rival', desc: 'Beat your past self' },
  { id: 'resilience', name: 'Resilience', desc: 'Stay in the game' },
] as const

/** PR celebrations level up with you. */
export const CELEBRATION_TIERS = [
  { level: 1, id: 'confetti', name: 'Confetti' },
  { level: 8, id: 'fireworks', name: 'Fireworks' },
  { level: 16, id: 'dunk', name: 'Slam dunk' },
]

/** Sound packs for sets, PRs and level-ups (the rest-timer alarm is always the loud one). */
export const SOUND_PACKS = [
  { id: 'arcade', name: 'Arcade', level: 1 },
  { id: 'court', name: 'Court', level: 5 },
  { id: 'synth', name: 'Synth', level: 10 },
  { id: 'boss', name: '8-bit Boss', level: 15 },
]

// Celebration styles + sound packs also show up as level unlocks.
UNLOCKABLES.push(
  ...CELEBRATION_TIERS.filter((c) => c.level > 1).map((c) => ({ level: c.level, kind: 'celebration' as const, id: c.id, name: `${c.name} PR celebration` })),
  ...SOUND_PACKS.filter((p) => p.level > 1).map((p) => ({ level: p.level, kind: 'sound' as const, id: p.id, name: `${p.name} sound pack` })),
)
UNLOCKABLES.sort((a, b) => a.level - b.level)
