# There and Snack Again

A recipe box web app. Live at https://shayhawk2.github.io/cook/

Plain HTML, CSS and JavaScript. No build step, no dependencies, no backend.

## Files

| File | What it is |
|---|---|
| `index.html` | App shell: side menu, top bar, empty `<main>` |
| `styles.css` | All styling, light and dark themes |
| `app.js` | All behavior: views, cook mode, grocery list, pantry, drafts |
| `recipes.json` | **The recipe book.** Master copy of every recipe and category |
| `techniques.json` | **Techniques.** Jim's tips, tricks and flavor enhancers, shown on the Techniques page and on recipe steps |
| `sw.js` | Service worker for offline use. Bump `VERSION` on every change |
| `manifest.webmanifest` | Name, icons and colors for "Add to Home Screen" |
| `icons/` | `icon.svg` (source), `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` |
| `fonts/` | Caveat handwriting font (SIL Open Font License) |

## Where data lives

- **Recipes and categories:** `recipes.json` in this repo. Edit, commit, push, and every device gets them.
- **Personal data:** favorites, ratings, make-again flags, notes, grocery list, pantry and drafts live in each device's `localStorage` under the key `tasa:v1`. Settings has a backup and restore for moving between devices.
- **Pantry items** carry a location (`Fridge`, `Freezer`, `Cabinet`, `Spice Rack`, `Counter`, `Basement Fridge`, `Garage Freezer`) and a category (the grocery departments). Older saves get both filled in on load.
- **Drafts:** recipes added or edited in the app. Settings > Export drafts produces `snack-again-drafts.json`; merge its `recipes` array into `recipes.json` to publish them.

## recipes.json format

```json
{
  "categories": [{ "id": "weeknight", "name": "Weeknight Dinners", "emoji": "🍽️", "shelf": "meals" }],
  "recipes": [{
    "id": "crispy-chicken-cutlets",
    "title": "Crispy Chicken Cutlets",
    "emoji": "🍗",
    "category": "weeknight",
    "type": "Main",
    "tags": ["chicken", "quick"],
    "prep": 15,
    "cook": 12,
    "servings": 4,
    "equipment": ["Large skillet"],
    "kid": true,
    "source": { "name": "Nonna", "url": "" },
    "nutrition": { "cal": 520, "protein": 44, "carbs": 30, "fat": 24 },
    "notes": "Optional note shown on a sticky note.",
    "placeholder": false,
    "ingredients": [
      { "qty": 1.5, "unit": "lb", "item": "chicken breasts", "note": "pounded thin", "aisle": "Meat & Seafood" }
    ],
    "steps": [
      { "text": "Fry for 3 minutes per side.", "uses": [0], "tips": ["cutlet-sauce-on-the-side"] }
    ]
  }]
}
```

Rules:

- `id`: unique, lowercase, hyphens. It is the URL and the key for ratings and notes, so do not rename it later.
- `category`: must match a category `id`.
- Category `shelf`: which home-page shelf the tile sits on: `cuisines`, `meals` (Meals & Occasions) or `collections`. Left out, it lands on Cuisines. A new tile needs 3 or more recipes; anything smaller is a tag.
- `type`: one of `Main`, `Side`, `Appetizer`, `Sauce & Condiment`, `Building Block`, `Dessert`, `Drink`. Groups the recipes inside a category page. A Building Block is made to go into another dish (fresh mozzarella, tortillas). Left out, the recipe shows under "Not sorted yet".
- `qty`: a number (`0.5`, not `"1/2"`), or `null` for "to taste". The app shows fractions and scales by servings.
- `unit`: one of `cup tbsp tsp "fl oz" oz lb pt qt gal clove can slice piece pinch stick bunch sprig g kg ml L`, or `""` for counted items like eggs.
- `aisle`: the store department, one of `Produce`, `Bakery`, `Deli & Cheese`, `Meat & Seafood`, `Dairy & Eggs`, `Canned & Jarred`, `Pasta, Rice & Grains`, `Baking`, `Oils, Vinegars & Condiments`, `Spices`, `Frozen`, `Beverages`, `Other`. The grocery list groups by these in this order (store-walk order). The old `Pantry` value still loads and is sorted into a department by the item name.
- `steps[].uses`: indexes into `ingredients` (starting at 0) shown under that step. Leave `uses` out and the app guesses by matching words.
- `steps[].tips`: ids from `techniques.json` shown as a sticky under that step, in the Steps tab and cook mode. A recipe-level `tips` list holds tips for the whole recipe; both appear in the recipe's Tips tab.
- `steps[].asWritten`: the source's original wording when a step has been rewritten to a house rule. Shown behind an "As written" toggle.
- Times in step text ("simmer for 10 minutes") become timer buttons. Temperatures written like `425°F` convert in metric mode.
- `placeholder: true` shows a red "stand-in" tag. Remove it once the real recipe is in.
- Optional fields: `tags`, `prep`, `cook`, `equipment`, `kid`, `source`, `nutrition`, `notes`, `placeholder`.

## techniques.json format

```json
{
  "sections": [{ "id": "house", "name": "House Rules", "emoji": "🏠" }],
  "techniques": [{
    "id": "big-beef-patty",
    "section": "house",
    "kind": "house",
    "title": "Big-patty ground beef",
    "text": "What to do and when. **Bold** is supported.",
    "where": "Which dishes it belongs to.",
    "sources": [{ "name": "Shown as a link", "url": "https://..." }]
  }]
}
```

- `id`: permanent, like recipe ids. Recipes point at it from `tips`.
- `kind`: `house` (Jim's way, overrides the recipe), `method` (a technique from a card) or `optional` (an idea to offer).
- `sources`: optional. Only for tips backed by outside references.
- House rule for ground beef: any recipe that browns it loose gets the step rewritten to the big-patty method, the original kept in `asWritten`, and `"tips": ["big-beef-patty"]` on that step.
- Like `recipes.json`, edits to this file do not need a `VERSION` bump.

## Publishing a change

1. Edit files in `cook/`.
2. In `sw.js`, bump `VERSION` (for example `tasa-v1` to `tasa-v2`) if anything other than `recipes.json` or `techniques.json` changed.
3. Commit and push to `main`. GitHub Pages redeploys in about a minute.
4. On the phone, close and reopen the app to pick up the update.

## Test locally

```
cd shayhawk2.github.io
python -m http.server 8000
```

Open http://localhost:8000/cook/ (the service worker only registers on https, so local runs are always fresh).
