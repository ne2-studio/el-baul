## El Baúl conventions

El Baúl is a warm, intimate photo-archive app for families ("baúl" = trunk; "capítulos" =
chapters; "recuerdos" = memories/notes). Spanish-first copy, mobile-first single-column layout
(`max-w-md`, generous `px-6` padding), no desktop grid. Warm terracotta + beige palette, soft
rounded shapes, serif headings — never cold neutrals, never sharp corners.

### Wrapping and setup

**No provider or root wrapper is required.** Every component here is presentational — none
read from React context, a router, or a store. Just render the component directly with props.
The one global effect to know: `body { background: var(--background); color: var(--foreground) }`
is set at the page level (not per-component), so a design canvas should carry that background
itself rather than expect components to paint it.

### Styling idiom: Tailwind utilities bound to CSS custom properties

No BEM, no CSS modules, no styled-components — every component is styled with plain Tailwind
utility classes whose colors resolve through named CSS variables (Tailwind v4 `@theme inline`).
Use these classes, not raw hex or Tailwind's default palette:

| Utility | Resolves to | Use for |
|---|---|---|
| `bg-background` / `text-foreground` | `#F5F1ED` / `#3A3230` | page/app background, default text |
| `bg-card` | `#FFFFFF` | any surface lifted above the background (cards, inputs, sheets) — pair with `text-foreground`, not a separate card-foreground class |
| `bg-primary` / `text-primary-foreground` | `#C67B5C` / `#FFFFFF` | the ONE primary action per screen — never more than one |
| `bg-secondary` | `#E8DED7` | secondary buttons, muted chips — pair with `text-foreground` |
| `text-muted-foreground` | `#8B7E79` | captions, timestamps, helper text |
| `bg-destructive` / `text-destructive-foreground` | `#D45C4D` / `#FFFFFF` | errors, destructive actions only |
| `border-border` | `rgba(58,50,48,.12)` | hairline borders — never `border-gray-*` |

Rounding: `rounded-xl` for buttons/inputs, `rounded-2xl` for cards, `rounded-full` for
avatars/pills/icon chips. Nothing in this system uses sharp corners.

Typography: `font-serif` (Lora) for `h1`–`h3` headings ONLY — never body text or buttons.
`font-sans` (Inter, the default) for everything else. Interactive text (buttons, labels) is
medium weight; passive body text is regular weight.

Elevation: soft, warm-toned shadows (Tailwind's default `shadow-sm`/`shadow-md` read correctly
against this palette) — never a hard gray drop shadow.

### Where the truth lives

Read `styles.css` (imports the compiled component CSS + scraped tokens/fonts) before writing
any new class — it's the actual compiled stylesheet, more reliable than this summary. Each
component's own `.prompt.md` lists its real prop interface and variants; read it before
composing that component.

### Idiomatic build snippet

```jsx
<div className="bg-background min-h-screen px-6 py-8 max-w-md mx-auto">
  <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
    <h2 className="font-serif text-foreground">Verano 2024</h2>
    <p className="text-muted-foreground text-sm mt-1">24 fotos · 3 recuerdos</p>
    <Button variant="primary" className="mt-4">Añadir fotos</Button>
  </div>
</div>
```
