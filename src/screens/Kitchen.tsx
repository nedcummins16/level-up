// Kitchen tab: gluten-free lunches, the weekly planner + shopping list, Sunday prep,
// and the gluten-free safety card. No calorie counting, no food logging.

import { useMemo, useState } from 'react'
import { Badge, Btn, Check, H, NumField, Panel, Sheet, Toggle } from '../components/ui'
import { XP } from '../config/game'
import { KITCHEN, PREP_REMINDER, PREP_STEPS, SAFETY, SMOOTHIE, type Ingredient, type Recipe } from '../config/kitchen'
import { PROGRAM } from '../config/program'
import type { CustomRecipe, MealPlan } from '../db/types'
import { addDays, fmtShort, mondayOf, type ISODate } from '../lib/dates'
import { allRecipes, defaultPlanWeek, fmtAmount, glutenWarnings, prepComplete, shoppingList, sortRecipes, splitPortions } from '../lib/kitchen'
import { deleteRecipe, patchMealPlan, saveRecipe, toggleFavourite } from '../state/actions'
import { useApp } from '../state/app'
import { useFx } from '../state/fx'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export function Kitchen() {
  const { data, today } = useApp()
  const [safety, setSafety] = useState(false)
  const [week, setWeek] = useState(() => defaultPlanWeek(today))
  const [open, setOpen] = useState<string | null>(null)
  const [editing, setEditing] = useState<CustomRecipe | 'new' | null>(null)
  const recipes = useMemo(() => sortRecipes(allRecipes(data.recipes), data.settings.kitchenFavs), [data.recipes, data.settings.kitchenFavs])
  const plan: MealPlan = data.mealPlans.find((p) => p.weekStart === week) ?? { weekStart: week, lunches: [], shopped: [], prep: [], prepDoneAt: null }
  const openRecipe = recipes.find((r) => r.id === open)

  return (
    <div className="px-3 pt-safe pb-32">
      <header className="flex items-end justify-between gap-2 mb-2 pt-1">
        <div>
          <div className="font-pixel text-[22px] text-accent">KITCHEN</div>
          <div className="text-sm text-muted">Everything here is gluten free.</div>
        </div>
        <Btn small variant="gold" onClick={() => setSafety(true)}>
          🛡️ GF safety
        </Btn>
      </header>

      <Targets />
      <Smoothie />
      <Planner week={week} setWeek={setWeek} plan={plan} recipes={recipes} onOpen={setOpen} />

      <Panel>
        <H>Lunch library</H>
        <p className="text-xs text-muted mb-1">Each makes 5 portions. ★ = favourite (shown first).</p>
        {recipes.map((r) => (
          <RecipeRow key={r.id} r={r} onOpen={() => setOpen(r.id)} />
        ))}
        <Btn variant="ghost" className="w-full mt-2" onClick={() => setEditing('new')}>
          + Add your own recipe
        </Btn>
      </Panel>

      <Sheet open={!!openRecipe} onClose={() => setOpen(null)} title={openRecipe?.name}>
        {openRecipe && (
          <RecipeDetail
            r={openRecipe}
            plan={plan}
            onEdit={() => {
              const c = data.recipes.find((x) => `custom:${x.id}` === openRecipe.id)
              if (c) {
                setOpen(null)
                setEditing(c)
              }
            }}
            onClose={() => setOpen(null)}
          />
        )}
      </Sheet>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New recipe' : 'Edit recipe'}>
        {editing && <RecipeForm initial={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Sheet>
      <Sheet open={safety} onClose={() => setSafety(false)} title="Gluten-free safety">
        <SafetyCard />
      </Sheet>
    </div>
  )
}

// ---------------------------------------------------------------------------
function Targets() {
  const t = KITCHEN.targets
  const rest = t.kcal - SMOOTHIE.kcal - t.lunchKcal
  return (
    <Panel accent>
      <div className="flex items-baseline justify-between">
        <span className="font-pixel text-[13px] tracking-[0.2em] text-muted">EACH DAY</span>
        <span className="font-pixel text-[17px]">
          ~{t.kcal.toLocaleString()} kcal · {t.protein} g+ protein
        </span>
      </div>
      <div className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between gap-2">
          <span>🥤 Breakfast: smoothie</span>
          <span className="text-muted whitespace-nowrap">
            {SMOOTHIE.kcal} kcal · {SMOOTHIE.protein} g
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span>🍱 Lunch: meal prep</span>
          <span className="text-muted whitespace-nowrap">
            ~{t.lunchKcal} kcal · {t.lunchProtein[0]}-{t.lunchProtein[1]} g
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span>🍽️ Dinner with family + snacks</span>
          <span className="text-muted whitespace-nowrap">the other ~{rest.toLocaleString()} kcal</span>
        </div>
      </div>
      <p className="text-xs text-muted mt-2">No counting: smoothie, prepped lunch, a good dinner and 2 snacks gets you there.</p>
    </Panel>
  )
}

function Smoothie() {
  const [open, setOpen] = useState(false)
  return (
    <Panel>
      <button className="w-full flex items-center justify-between min-h-[44px]" onClick={() => setOpen(!open)}>
        <H className="!mb-0">🥤 {SMOOTHIE.name}</H>
        <span className="text-sm text-muted">
          {SMOOTHIE.kcal} kcal · {SMOOTHIE.protein} g {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <>
          <IngredientList items={SMOOTHIE.ingredients} />
          <p className="text-sm mt-2">Blend everything until smooth.</p>
          <p className="text-xs text-muted mt-1">{SMOOTHIE.note}</p>
        </>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------------------
function Planner({ week, setWeek, plan, recipes, onOpen }: { week: ISODate; setWeek: (w: ISODate) => void; plan: MealPlan; recipes: Recipe[]; onOpen: (id: string) => void }) {
  const { today } = useApp()
  const [shop, setShop] = useState(false)
  const thisWeek = mondayOf(today)
  const picks = plan.lunches.map((id) => recipes.find((r) => r.id === id)).filter((r): r is Recipe => !!r)
  const portions = splitPortions(picks.length)
  const list = shoppingList(picks.map((recipe, i) => ({ recipe, portions: portions[i] })))
  const total = list.reduce((a, g) => a + g.items.length, 0)
  const ticked = list.reduce((a, g) => a + g.items.filter((i) => plan.shopped.includes(i.key)).length, 0)
  /** First weekday index each lunch covers (Mon = 0). */
  const starts = portions.map((_, i) => portions.slice(0, i).reduce((a, b) => a + b, 0))

  return (
    <Panel>
      <H>Lunches this week</H>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[thisWeek, addDays(thisWeek, 7)].map((w, i) => (
          <button
            key={w}
            onClick={() => setWeek(w)}
            className={`h-11 text-sm border-[3px] ${week === w ? 'bg-accent text-accent-ink border-ink' : 'bg-bg-2 border-edge'}`}
          >
            {i === 0 ? 'This week' : 'Next week'} · {fmtShort(w)}
          </button>
        ))}
      </div>

      {picks.length === 0 && <p className="text-sm text-muted mb-2">Pick 1 or 2 lunches from the library below. One lunch makes 5 portions; two make 3 + 2.</p>}
      {picks.map((r, i) => {
        const from = starts[i]
        return (
          <div key={r.id} className="flex items-center gap-2 py-1.5 border-b border-edge/40">
            <span className="text-2xl">{r.emoji}</span>
            <button className="flex-1 text-left min-w-0" onClick={() => onOpen(r.id)}>
              <div className="truncate">{r.name}</div>
              <div className="text-xs text-muted">
                × {portions[i]} · {DAYS.slice(from, from + portions[i]).join(', ')}
              </div>
            </button>
            <button
              className="w-11 h-11 bg-panel-2 font-pixel"
              aria-label={`Remove ${r.name}`}
              onClick={() => void patchMealPlan(week, (p) => ({ lunches: p.lunches.filter((x) => x !== r.id), shopped: [] }))}
            >
              ✕
            </button>
          </div>
        )
      })}

      {picks.length > 0 && (
        <>
          <Btn className="w-full mt-3" onClick={() => setShop(true)}>
            🛒 Shopping list ({ticked}/{total})
          </Btn>
          <PrepChecklist plan={plan} picks={picks} portions={portions} />
        </>
      )}

      <Sheet open={shop} onClose={() => setShop(false)} title="Shopping list">
        <p className="text-sm text-muted mb-3">
          For 5 lunches: {picks.map((r, i) => `${r.name} × ${portions[i]}`).join(', ')}.
        </p>
        {list.map((g) => (
          <div key={g.section} className="mb-3">
            <div className="font-pixel text-[13px] tracking-[0.15em] text-accent mb-1">
              {g.emoji} {g.name.toUpperCase()}
            </div>
            {g.items.map((it) => (
              <Check
                key={it.key}
                on={plan.shopped.includes(it.key)}
                onChange={(on) => void patchMealPlan(week, (p) => ({ shopped: on ? [...p.shopped, it.key] : p.shopped.filter((x) => x !== it.key) }))}
              >
                <span>
                  {it.amount !== null && <span className="text-xp">{fmtAmount(it.amount, it.unit)} </span>}
                  {it.name}
                  {it.notes.length > 0 && <span className="text-xs text-muted"> ({it.notes.join('; ')})</span>}
                  {it.check && <GfTag />}
                </span>
              </Check>
            ))}
          </div>
        ))}
        <p className="text-xs text-muted">Quantities are rounded up to what you can buy.</p>
      </Sheet>
    </Panel>
  )
}

function PrepChecklist({ plan, picks, portions }: { plan: MealPlan; picks: Recipe[]; portions: number[] }) {
  const { today } = useApp()
  const fx = useFx()
  const done = prepComplete(plan, PREP_STEPS)
  const earnsXP = (plan.prepDoneAt ?? today) >= PROGRAM.start
  // Days 4-5 come from the freezer (fridge life is 3 days). Recipes that don't freeze get cooked mid-week.
  const midweek = picks.filter((r, i) => !r.freezes && portions.slice(0, i).reduce((a, b) => a + b, 0) + portions[i] > 3)

  const toggle = (id: string, on: boolean) => {
    const prep = on ? [...plan.prep, id] : plan.prep.filter((x) => x !== id)
    const complete = prepComplete({ prep }, PREP_STEPS)
    if (complete && !done && earnsXP) fx.floatXP(XP.mealPrep, 'meal prep')
    void patchMealPlan(plan.weekStart, () => ({ prep, prepDoneAt: complete ? (plan.prepDoneAt ?? today) : null }))
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <div className="font-pixel text-[13px] tracking-[0.15em] text-accent">🔪 SUNDAY PREP</div>
        {done ? <Badge color="good">Done{earnsXP ? ` · +${XP.mealPrep} XP` : ''}</Badge> : <span className="text-xs text-muted">{earnsXP ? `Meal Prep Sunday: +${XP.mealPrep} XP` : 'XP from Week 1'}</span>}
      </div>
      {PREP_STEPS.map((s) => (
        <Check key={s.id} on={plan.prep.includes(s.id)} onChange={(on) => toggle(s.id, on)}>
          {s.text}
        </Check>
      ))}
      <div className="bg-bg-2 border-l-4 border-xp p-2 mt-1 text-sm">⏱️ {PREP_REMINDER}</div>
      {midweek.map((r) => (
        <div key={r.id} className="text-sm text-muted mt-2">
          ❄️ {r.name} doesn't freeze: make the Thu-Fri portions fresh on Wednesday night.
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
function RecipeRow({ r, onOpen }: { r: Recipe; onOpen: () => void }) {
  const { data } = useApp()
  const fav = data.settings.kitchenFavs.includes(r.id)
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-edge/40">
      <span className="text-2xl w-8 text-center">{r.emoji}</span>
      <button className="flex-1 text-left min-w-0 min-h-[44px]" onClick={onOpen}>
        <div className="truncate">{r.name}</div>
        <div className="text-xs text-muted">
          {r.kcal ? `~${r.kcal} kcal · ${r.protein} g` : 'Your recipe'} · {r.freezes ? '❄️ freezes' : 'fridge only'}
          {r.serve === 'cold' ? ' · eat cold' : ''}
        </div>
      </button>
      <button className={`w-11 h-11 text-xl ${fav ? 'text-xp' : 'text-muted'}`} aria-label={fav ? `Unfavourite ${r.name}` : `Favourite ${r.name}`} aria-pressed={fav} onClick={() => void toggleFavourite(r.id)}>
        {fav ? '★' : '☆'}
      </button>
    </div>
  )
}

function RecipeDetail({ r, plan, onEdit, onClose }: { r: Recipe; plan: MealPlan; onEdit: () => void; onClose: () => void }) {
  const { data } = useApp()
  const fav = data.settings.kitchenFavs.includes(r.id)
  const custom = r.id.startsWith('custom:')
  const inPlan = plan.lunches.includes(r.id)
  const full = plan.lunches.length >= KITCHEN.maxLunches
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {r.kcal > 0 && <Badge color="xp">~{r.kcal} kcal</Badge>}
        {r.protein > 0 && <Badge color="xp">{r.protein} g protein</Badge>}
        <Badge color="muted">Fridge {r.fridgeDays} days</Badge>
        <Badge color={r.freezes ? 'accent-2' : 'muted'}>{r.freezes ? 'Freezes ✓' : "Doesn't freeze"}</Badge>
        <Badge color="muted">{r.serve === 'cold' ? 'Eat cold' : 'Microwave'}</Badge>
      </div>
      <div className="font-pixel text-[13px] tracking-[0.15em] text-accent">INGREDIENTS · 5 PORTIONS</div>
      <IngredientList items={r.ingredients} />
      <div className="font-pixel text-[13px] tracking-[0.15em] text-accent mt-3 mb-1">STEPS</div>
      <ol className="list-decimal pl-5 space-y-1.5 text-sm">
        {r.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {r.tip && <p className="text-sm text-muted mt-3">💡 {r.tip}</p>}
      <div className="flex gap-2 mt-4">
        <Btn
          className="flex-1"
          disabled={inPlan || full}
          onClick={() => {
            void patchMealPlan(plan.weekStart, (p) => ({ lunches: [...p.lunches, r.id].slice(0, KITCHEN.maxLunches), shopped: [] }))
            onClose()
          }}
        >
          {inPlan ? 'In this week ✓' : full ? 'Week is full (2)' : `Add to week of ${fmtShort(plan.weekStart)}`}
        </Btn>
        <Btn variant="ghost" onClick={() => void toggleFavourite(r.id)}>
          {fav ? '★' : '☆'}
        </Btn>
      </div>
      {custom && (
        <div className="flex gap-2 mt-2">
          <Btn variant="ghost" className="flex-1" onClick={onEdit}>
            Edit
          </Btn>
          <Btn
            variant="danger"
            className="flex-1"
            onClick={() => {
              if (!confirm(`Delete ${r.name}?`)) return
              void deleteRecipe(Number(r.id.slice(7)))
              onClose()
            }}
          >
            Delete
          </Btn>
        </div>
      )}
    </div>
  )
}

function IngredientList({ items }: { items: Ingredient[] }) {
  return (
    <ul className="text-sm mt-1 space-y-1">
      {items.map((i, k) => (
        <li key={k} className="flex gap-2">
          <span className="text-muted">·</span>
          <span>
            {i.amount !== null && !i.staple && <span className="text-xp">{fmtAmount(i.amount, i.unit)} </span>}
            {i.name}
            {i.note && <span className="text-xs text-muted"> ({i.note})</span>}
            {i.check && <GfTag />}
          </span>
        </li>
      ))}
    </ul>
  )
}

function GfTag() {
  return <span className="inline-block ml-1.5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-good text-black align-middle">Check label: gluten free</span>
}

// ---------------------------------------------------------------------------
function RecipeForm({ initial, onDone }: { initial: CustomRecipe | null; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [kcal, setKcal] = useState<number | null>(initial?.kcal ?? null)
  const [protein, setProtein] = useState<number | null>(initial?.protein ?? null)
  const [freezes, setFreezes] = useState(initial?.freezes ?? false)
  const [ingredients, setIngredients] = useState((initial?.ingredients ?? []).join('\n'))
  const [steps, setSteps] = useState((initial?.steps ?? []).join('\n'))
  const lines = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean)
  const warnings = [...lines(ingredients), ...lines(steps)].flatMap((l) => glutenWarnings(l).map((w) => `"${l}": ${w}`))

  const save = async () => {
    await saveRecipe({ ...(initial?.id ? { id: initial.id } : {}), name: name.trim(), kcal, protein, freezes, ingredients: lines(ingredients), steps: lines(steps), createdAt: initial?.createdAt ?? Date.now() })
    onDone()
  }

  return (
    <div>
      <label className="block mb-3">
        <span className="block text-sm text-muted mb-1">Name</span>
        <input className="px-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. Beef chilli and rice" />
      </label>
      <div className="flex gap-2 mb-1">
        <NumField label="kcal / portion" value={kcal} onChange={setKcal} decimal={false} className="flex-1" />
        <NumField label="Protein g / portion" value={protein} onChange={setProtein} decimal={false} className="flex-1" />
      </div>
      <Toggle on={freezes} onChange={setFreezes} label={<span className="text-sm">Freezes well</span>} />
      <label className="block mb-3">
        <span className="block text-sm text-muted mb-1">Ingredients for 5 portions, one per line</span>
        <textarea className="px-input !min-h-[130px] py-2" value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder={'900 g beef mince\n2 tins kidney beans\n350 g rice'} />
        <span className="block text-xs text-muted mt-1">Start lines with an amount (g, ml, tins...) so the shopping list can add them up.</span>
      </label>
      <label className="block mb-3">
        <span className="block text-sm text-muted mb-1">Steps, one per line</span>
        <textarea className="px-input !min-h-[110px] py-2" value={steps} onChange={(e) => setSteps(e.target.value)} />
      </label>
      {warnings.length > 0 && (
        <div className="border-[3px] border-danger p-2 mb-3 text-sm">
          <div className="font-bold text-danger mb-1">⚠️ This might contain gluten</div>
          {warnings.map((w) => (
            <div key={w}>· {w}</div>
          ))}
          <div className="text-xs text-muted mt-1">Swap it for a gluten-free version, or add "GF" / "gluten free" to the line if it's labelled gluten free.</div>
        </div>
      )}
      <Btn className="w-full" variant={warnings.length ? 'danger' : 'primary'} disabled={!name.trim() || !lines(ingredients).length} onClick={() => void save()}>
        {warnings.length ? 'Save anyway' : 'Save recipe'}
      </Btn>
    </div>
  )
}

// ---------------------------------------------------------------------------
function SafetyCard() {
  const block = (title: string, items: string[], icon: string) => (
    <div className="mb-4">
      <div className="font-pixel text-[13px] tracking-[0.15em] text-accent mb-1">{title}</div>
      <ul className="space-y-1.5 text-sm">
        {items.map((t) => (
          <li key={t} className="flex gap-2">
            <span>{icon}</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  )
  return (
    <div>
      {block('HIDDEN GLUTEN: CHECK THE LABEL', SAFETY.hidden, '⚠️')}
      {block('NEVER GLUTEN FREE', SAFETY.notGF, '🚫')}
      {block('READING LABELS', SAFETY.labels, '🔎')}
      {block('SHARED KITCHEN', SAFETY.sharedKitchen, '🍞')}
    </div>
  )
}
