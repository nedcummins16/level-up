// ============================================================================
//  LEVEL UP: KITCHEN (gluten free)
//  Daily targets, the smoothie, the lunch library, the prep checklist and the
//  gluten-free safety card. Every recipe is written for 5 portions.
//  Rule: no ingredient that contains gluten (wheat, barley, rye, oats, malt,
//  couscous, regular soy sauce...). Anything packaged gets `check: true`, which
//  shows a "Check label: gluten free" tag. Edit freely; the tests in
//  lib/kitchen.test.ts will catch a gluten ingredient or a missing label tag.
// ============================================================================

import { PROGRAM } from './program'

export type ShopSection = 'veg' | 'meat' | 'deli' | 'dairy' | 'pantry' | 'freezer' | 'other'

export const SECTIONS: { id: ShopSection; name: string; emoji: string }[] = [
  { id: 'veg', name: 'Fruit & veg', emoji: '🥕' },
  { id: 'meat', name: 'Meat & seafood', emoji: '🍗' },
  { id: 'deli', name: 'Deli', emoji: '🥓' },
  { id: 'dairy', name: 'Dairy & eggs', emoji: '🧀' },
  { id: 'pantry', name: 'Pantry', emoji: '🥫' },
  { id: 'freezer', name: 'Freezer', emoji: '🧊' },
  { id: 'other', name: 'Other', emoji: '🛒' },
]

export interface Ingredient {
  name: string
  /** For 5 portions. null = no fixed amount. */
  amount: number | null
  /** 'g' | 'ml' | 'tbsp' | 'tsp' | 'tin' | 'jar' | 'pack' | 'bunch' | 'clove' | '' (a count) */
  unit: string
  section: ShopSection
  /** Packaged: shows "Check label: gluten free". */
  check?: boolean
  /** Pantry staple: listed under "Check you have", no quantity. */
  staple?: boolean
  note?: string
}

export interface Recipe {
  id: string
  name: string
  emoji: string
  /** Per portion, approximate. */
  kcal: number
  protein: number
  portions: number
  fridgeDays: number
  freezes: boolean
  /** How you eat it at lunch. */
  serve: 'microwave' | 'cold'
  ingredients: Ingredient[]
  steps: string[]
  tip?: string
}

export const KITCHEN = {
  targets: { kcal: 3000, protein: PROGRAM.body.protein, lunchKcal: 750, lunchProtein: [40, 50] as [number, number] },
  /** Lunch portions when you pick 1 or 2 lunches for the week. */
  split: { 1: [5], 2: [3, 2] } as Record<number, number[]>,
  maxLunches: 2,
}

export const SMOOTHIE = {
  name: 'Breakfast smoothie',
  kcal: 690,
  protein: 46,
  ingredients: [
    { name: 'Full-cream milk', amount: 400, unit: 'ml', section: 'dairy' },
    { name: 'Whey protein', amount: 1, unit: 'scoop', section: 'pantry', check: true },
    { name: 'Banana', amount: 1, unit: '', section: 'veg' },
    { name: 'Rice or quinoa flakes', amount: 30, unit: 'g', section: 'pantry', check: true },
    { name: 'Peanut butter', amount: 1, unit: 'tbsp', section: 'pantry' },
  ] as Ingredient[],
  note: "No oats: in Australia oats can't be labelled gluten free. Rice or quinoa flakes do the same job.",
}

const rice = (g: number): Ingredient => ({ name: 'White rice (uncooked)', amount: g, unit: 'g', section: 'pantry' })
const chicken = (g: number, note?: string): Ingredient => ({ name: 'Chicken thigh fillets', amount: g, unit: 'g', section: 'meat', note })
const oil: Ingredient = { name: 'Olive oil', amount: null, unit: '', section: 'pantry', staple: true }
const salt: Ingredient = { name: 'Salt + pepper', amount: null, unit: '', section: 'pantry', staple: true }
const spice = (name: string): Ingredient => ({ name, amount: null, unit: '', section: 'pantry', staple: true, note: 'single spice, not a blend' })
const tamari = (ml: number): Ingredient => ({ name: 'Tamari (or soy sauce labelled gluten free)', amount: ml, unit: 'ml', section: 'pantry', check: true })
const cornflour: Ingredient = { name: 'Cornflour (maize)', amount: 2, unit: 'tbsp', section: 'pantry', check: true, note: 'buy one that says maize (100% corn)' }

export const RECIPES: Recipe[] = [
  {
    id: 'burrito',
    name: 'Burrito bowl',
    emoji: '🌯',
    kcal: 760,
    protein: 46,
    portions: 5,
    fridgeDays: 3,
    freezes: true,
    serve: 'microwave',
    ingredients: [
      chicken(900),
      rice(300),
      { name: 'Black beans, 400 g tin', amount: 1, unit: 'tin', section: 'pantry' },
      { name: 'Corn kernels, 420 g tin', amount: 1, unit: 'tin', section: 'pantry' },
      { name: 'Grated cheddar', amount: 100, unit: 'g', section: 'dairy' },
      { name: 'Tomato salsa', amount: 1, unit: 'jar', section: 'pantry', check: true },
      { name: 'Avocado', amount: 1, unit: '', section: 'veg' },
      spice('Smoked paprika'),
      spice('Ground cumin'),
      spice('Garlic powder'),
      spice('Dried oregano'),
      oil,
      salt,
    ],
    steps: [
      'Spice mix: 2 tsp smoked paprika, 2 tsp cumin, 1 tsp garlic powder, 1 tsp oregano, 1 tsp salt. (Taco seasoning packets often contain wheat.)',
      'Toss the chicken in the spice mix and 1 tbsp olive oil.',
      'Bake at 200°C for 25 min (or pan-fry 6 min a side) until cooked through. Rest 5 min, then slice.',
      'Cook the rice. Drain and rinse the beans and corn.',
      'Portion rice, chicken, beans and corn into 5 containers. Top with cheese.',
      'Salsa and avocado go on fresh on the day (avocado browns).',
    ],
    tip: 'Freeze without the salsa and avocado.',
  },
  {
    id: 'teriyaki',
    name: 'Teriyaki chicken or salmon bowl',
    emoji: '🍣',
    kcal: 720,
    protein: 48,
    portions: 5,
    fridgeDays: 3,
    freezes: true,
    serve: 'microwave',
    ingredients: [
      chicken(900, 'or 750 g salmon fillets'),
      rice(350),
      { name: 'Frozen shelled edamame', amount: 300, unit: 'g', section: 'freezer' },
      { name: 'Carrots', amount: 3, unit: '', section: 'veg' },
      { name: 'Garlic', amount: 3, unit: 'clove', section: 'veg' },
      { name: 'Fresh ginger', amount: 1, unit: '', section: 'veg', note: 'a thumb-sized piece' },
      tamari(80),
      { name: 'Honey', amount: null, unit: '', section: 'pantry', staple: true },
      { ...cornflour, amount: 1 },
      { name: 'Sesame seeds', amount: null, unit: '', section: 'pantry', staple: true },
      { name: 'Sesame oil', amount: null, unit: '', section: 'pantry', staple: true },
    ],
    steps: [
      'Sauce: 80 ml tamari, 3 tbsp honey, 3 crushed garlic cloves, 1 tbsp grated ginger, 1 tbsp cornflour mixed in 3 tbsp water.',
      'Cut the chicken into bite-size pieces. Fry in 1 tbsp sesame oil for 8-10 min until cooked (salmon: bake whole fillets at 200°C for 12 min).',
      'Pour in the sauce and simmer 2 min until sticky.',
      'Cook the rice. Boil the edamame for 3 min. Grate or slice the carrots.',
      'Portion rice, teriyaki, edamame and carrot. Sprinkle with sesame seeds.',
    ],
    tip: 'Regular soy sauce is made with wheat. Use tamari or one labelled gluten free.',
  },
  {
    id: 'friedrice',
    name: 'Fried rice',
    emoji: '🍳',
    kcal: 770,
    protein: 47,
    portions: 5,
    fridgeDays: 3,
    freezes: true,
    serve: 'microwave',
    ingredients: [
      { ...rice(400), note: 'cook the day before and chill' },
      { name: 'Eggs', amount: 15, unit: '', section: 'dairy', note: '3 per portion' },
      chicken(500, 'or 400 g ham labelled gluten free'),
      { name: 'Frozen peas and corn', amount: 400, unit: 'g', section: 'freezer' },
      { name: 'Spring onions', amount: 1, unit: 'bunch', section: 'veg' },
      tamari(60),
      oil,
    ],
    steps: [
      'Use day-old rice from the fridge (fresh rice goes mushy).',
      'Dice the chicken and fry in 1 tbsp oil for 6-8 min until cooked. Set aside.',
      'Scramble the 15 eggs in batches in a little oil. Set aside.',
      'Fry the rice in 1 tbsp oil on high for 5 min. Add peas and corn for 3 min.',
      'Stir through the chicken, eggs, sliced spring onion and 60 ml tamari.',
      'Spread out to cool, then portion and fridge within an hour.',
    ],
  },
  {
    id: 'butterchicken',
    name: 'Butter chicken',
    emoji: '🍛',
    kcal: 780,
    protein: 47,
    portions: 5,
    fridgeDays: 3,
    freezes: true,
    serve: 'microwave',
    ingredients: [
      chicken(1000),
      { name: 'Mild butter chicken simmer sauce, ~485 g jar', amount: 2, unit: 'jar', section: 'pantry', check: true, note: 'or a paste: follow the jar' },
      rice(350),
      { name: 'Frozen peas', amount: 250, unit: 'g', section: 'freezer' },
      oil,
    ],
    steps: [
      'Cut the chicken into chunks. Brown in 1 tbsp oil for 5 min.',
      'Add the sauce (if using paste, follow the jar). Simmer 15 min until the chicken is cooked through.',
      'Stir in the peas for the last 3 min.',
      'Cook the rice. Portion rice and curry into 5 containers.',
    ],
    tip: 'Freezes really well: freeze 2 portions for later.',
  },
  {
    id: 'cottagepie',
    name: 'Cottage pie',
    emoji: '🥧',
    kcal: 770,
    protein: 47,
    portions: 5,
    fridgeDays: 3,
    freezes: true,
    serve: 'microwave',
    ingredients: [
      { name: 'Beef mince', amount: 900, unit: 'g', section: 'meat' },
      { name: 'Potatoes', amount: 1200, unit: 'g', section: 'veg' },
      { name: 'Onion', amount: 1, unit: '', section: 'veg' },
      { name: 'Carrots', amount: 2, unit: '', section: 'veg' },
      { name: 'Frozen peas', amount: 200, unit: 'g', section: 'freezer' },
      { name: 'Beef stock (liquid or cube)', amount: 250, unit: 'ml', section: 'pantry', check: true },
      { name: 'Tomato paste', amount: 2, unit: 'tbsp', section: 'pantry', check: true },
      cornflour,
      { name: 'Butter', amount: 40, unit: 'g', section: 'dairy' },
      { name: 'Milk (for the mash)', amount: 100, unit: 'ml', section: 'dairy' },
      { name: 'Grated cheddar', amount: 100, unit: 'g', section: 'dairy' },
      oil,
      salt,
    ],
    steps: [
      'Peel and boil the potatoes for 15-20 min until soft. Mash with the butter and milk.',
      'Fry the diced onion and carrot in 1 tbsp oil for 5 min. Add the mince and brown it.',
      'Add tomato paste, the stock and the peas. Simmer 10 min.',
      'Thicken: mix 2 tbsp cornflour with 3 tbsp cold water, stir in and simmer 2 min.',
      'Spoon into a baking dish, top with mash and cheese. Bake at 200°C for 20 min until golden.',
      'Cool, then cut into 5 portions.',
    ],
    tip: 'Most Worcestershire sauce contains malt vinegar, so leave it out. Freezes really well.',
  },
  {
    id: 'traybake',
    name: 'Chicken and potato traybake',
    emoji: '🍗',
    kcal: 710,
    protein: 47,
    portions: 5,
    fridgeDays: 3,
    freezes: true,
    serve: 'microwave',
    ingredients: [
      chicken(1000),
      { name: 'Potatoes', amount: 1500, unit: 'g', section: 'veg' },
      { name: 'Capsicums', amount: 2, unit: '', section: 'veg' },
      { name: 'Red onions', amount: 2, unit: '', section: 'veg' },
      { name: 'Tzatziki', amount: 250, unit: 'g', section: 'dairy', check: true, note: 'or Greek yoghurt + grated cucumber + garlic' },
      spice('Smoked paprika'),
      spice('Garlic powder'),
      oil,
      salt,
    ],
    steps: [
      'Heat the oven to 220°C. Cut the potatoes into chunks, the capsicum and onion into wedges.',
      'Toss everything with 3 tbsp olive oil, 2 tsp paprika, 1 tsp garlic powder, salt and pepper.',
      'Spread over 2 trays (crowded trays steam instead of roast).',
      'Roast 35-40 min, turning once, until the chicken is cooked and the potatoes are golden.',
      'Portion into 5 containers. Tzatziki in a small pot on the side.',
    ],
    tip: 'Freeze without the tzatziki. The potatoes go a little softer after freezing.',
  },
  {
    id: 'pastabake',
    name: 'Gluten-free pasta bake',
    emoji: '🍝',
    kcal: 755,
    protein: 47,
    portions: 5,
    fridgeDays: 3,
    freezes: true,
    serve: 'microwave',
    ingredients: [
      { name: 'Gluten-free pasta', amount: 450, unit: 'g', section: 'pantry', check: true },
      { name: 'Lean beef mince', amount: 750, unit: 'g', section: 'meat', note: 'or diced chicken' },
      { name: 'Tomato pasta sauce or passata', amount: 700, unit: 'g', section: 'pantry', check: true },
      { name: 'Onion', amount: 1, unit: '', section: 'veg' },
      { name: 'Garlic', amount: 2, unit: 'clove', section: 'veg' },
      { name: 'Baby spinach', amount: 100, unit: 'g', section: 'veg' },
      { name: 'Grated mozzarella', amount: 150, unit: 'g', section: 'dairy' },
      oil,
    ],
    steps: [
      'Boil the GF pasta for 2 minutes LESS than the packet says (it finishes in the oven). Drain.',
      'Fry the diced onion and garlic in 1 tbsp oil, then brown the mince.',
      'Add the sauce and simmer 5 min. Stir through the spinach.',
      'Mix in the pasta, tip into a baking dish, top with cheese.',
      'Bake at 200°C for 15-20 min until bubbling. Cool and cut into 5.',
    ],
    tip: 'Use a clean colander for GF pasta, never one that just drained wheat pasta.',
  },
  {
    id: 'tunasalad',
    name: 'Tuna rice salad (no reheat)',
    emoji: '🥗',
    kcal: 710,
    protein: 47,
    portions: 5,
    fridgeDays: 3,
    freezes: false,
    serve: 'cold',
    ingredients: [
      rice(450),
      { name: 'Tuna in springwater, 185 g tin', amount: 5, unit: 'tin', section: 'pantry', check: true, note: 'plain, not flavoured' },
      { name: 'Corn kernels, 420 g tin', amount: 1, unit: 'tin', section: 'pantry' },
      { name: 'Cucumbers', amount: 2, unit: '', section: 'veg' },
      { name: 'Cheddar (block)', amount: 150, unit: 'g', section: 'dairy' },
      { name: 'Whole-egg mayonnaise', amount: 3, unit: 'tbsp', section: 'pantry', check: true, note: 'or 3 tbsp olive oil + lemon' },
    ],
    steps: [
      'Cook the rice (or quinoa). Spread it out to cool, then fridge within an hour.',
      'Drain the tuna and corn. Dice the cucumber and cheese.',
      'Portion the rice, then top each with 1 tin of tuna, corn, cucumber and cheese.',
      'Add mayo or olive oil on the day.',
    ],
    tip: 'Your backup for days with no microwave. Eat it cold.',
  },
  {
    id: 'snackbox',
    name: 'Snack box (no cook)',
    emoji: '🍱',
    kcal: 785,
    protein: 46,
    portions: 5,
    fridgeDays: 3,
    freezes: false,
    serve: 'cold',
    ingredients: [
      { name: 'Eggs', amount: 15, unit: '', section: 'dairy', note: '3 per box' },
      { name: 'Cheese (block or slices)', amount: 200, unit: 'g', section: 'dairy' },
      { name: 'Ham', amount: 250, unit: 'g', section: 'deli', check: true },
      { name: 'Rice crackers', amount: 2, unit: 'pack', section: 'pantry', check: true },
      { name: 'Fruit (apple, mandarin, grapes)', amount: 5, unit: '', section: 'veg' },
      { name: 'Mixed nuts', amount: 150, unit: 'g', section: 'pantry', check: true, note: 'plain or salted, not flavoured' },
    ],
    steps: [
      'Hard-boil the eggs: 10 min in boiling water, then into cold water. Peel.',
      'Box up 3 eggs, 40 g cheese, 50 g ham, a handful of rice crackers, 1 piece of fruit and 30 g nuts.',
      'Keep the crackers in a separate bag so they stay crunchy.',
    ],
    tip: 'Zero cooking: perfect for a busy week.',
  },
  {
    id: 'leftovers',
    name: 'Dinner leftovers + extra rice or potato',
    emoji: '🍽️',
    kcal: 750,
    protein: 45,
    portions: 5,
    fridgeDays: 3,
    freezes: false,
    serve: 'microwave',
    ingredients: [{ ...rice(350), note: 'or 1.2 kg potatoes' }],
    steps: [
      'Ask for a bigger batch of the family dinner (an extra 1-2 serves).',
      'Cook extra rice or potatoes for the week.',
      'Portion a palm-and-a-half of the meat plus the rice or potato into containers. Fridge straight after dinner.',
    ],
    tip: 'Only if dinner was gluten free all the way through: check sauces, stock and gravy. Numbers depend on the dinner.',
  },
]

export const PREP_STEPS = [
  { id: 'carbs', text: 'Cook the rice or potatoes' },
  { id: 'protein', text: 'Cook the protein' },
  { id: 'portion', text: 'Portion into 4-5 containers' },
  { id: 'store', text: "Fridge 3 days' worth, freeze the rest (write the date on the lid)" },
]

export const PREP_REMINDER = 'Get cooked rice into the fridge within an hour: spread it on a tray so it cools fast. Reheat until steaming hot, and only once.'

/** The safety card (always one tap away on the Kitchen tab). */
export const SAFETY = {
  hidden: [
    'Soy sauce (use tamari or one labelled gluten free)',
    'Stock cubes and stock powder',
    'Gravy and gravy powder',
    'Spice mixes and seasoning packets (taco, chicken salt...)',
    'Marinades',
    'Sausages',
    'Some processed meats (ham, salami, chicken loaf)',
    'Oyster sauce',
    'Malt vinegar (and Worcestershire sauce, which usually contains it)',
    'Cornflour made from wheat ("wheaten cornflour")',
  ],
  notGF: ['Couscous', 'Barley', 'Rye', 'Spelt', 'Semolina', 'Oats (cannot be labelled gluten free in Australia)'],
  labels: [
    'Look for "gluten free" on the pack, or the Coeliac Australia Endorsement Logo (the crossed-grain symbol).',
    'In Australia "gluten free" means no detectable gluten, and no oats or malt.',
    'Read the ingredients list every time: recipes change, even on products you buy every week.',
    '"May contain gluten" or "made on equipment with wheat": skip it.',
  ],
  sharedKitchen: [
    'Your own toaster, or toaster bags',
    'Your own spread jars (butter, peanut butter, jam): no crumbs',
    'Clean chopping boards and colander',
    'Cook the gluten-free food first, with clean utensils',
  ],
}
