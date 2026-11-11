# Visual redesign and portfolio finish

The user explicitly rejects the current generic AI-built appearance. Use Antigravity to implement a cohesive redesign, not a CSS recolor. Preserve all validated mathematics, worker lifecycle and data. Do not deploy, push, create accounts, or change research outputs in this coding pass.

## Design direction: a scientific field notebook

A restrained, editorial research instrument: warm off-white paper (#f5f3ed), near-black ink (#20241f), warm gray hairlines (#d8d8cd), and one deep forest accent (#315646). The red/blue field colormap remains data, not UI branding. Serif display headings (Georgia or system serif), clean system sans controls, tabular monospace numerical readouts. No font network calls. No gradients, glossy shadows, large corner radii, pill oceans, colored stat tiles, icon confetti, promotional hero copy, decorative sparkles, or SaaS dashboard template patterns.

Use whitespace, fine rules, alignment and a clear type scale. Header should be light, compact, left wordmark P20 / TDGL, modest project descriptor and plain text navigation with an underline/current state; no navy toolbar, coral logo square, or rounded segmented main navigation. Real semantic headings and focus states. Keep existing nav/control accessible names where possible to preserve behavior/tests.

## Layout and hierarchy

Simulation Lab: a compact preset/control rail roughly 260px and a dominant field/plot workspace. At widths around 894px keep a usable two-column layout; collapse only when actual minimum workspace width cannot fit (around 760px). On mobile put field and primary run controls before long advanced settings, using intentional ordering/details as appropriate, and keep all controls accessible. Avoid a tall wall of provenance/configuration before a visible simulation.

Replace all nested card/stats-pill layouts across Simulation, Saved Results, Validation and About with intentional sections: unboxed editorial heading, compact parameter groups, thin dividers, plain readout rows, quiet contextual status text. The field visualization is the main object, with a refined figure caption, clean axes, restrained legend, play/timeline controls attached beneath it. Keep data readable at normal scale. Inspector should resemble a small numerical worksheet/equation ledger, not five bright KPI tiles.

Saved Results: put dataset selector, key context and actual field first. Move long SHA/source provenance into an accessible disclosure below/aside, not the main first-screen feature. Metrics are a compact aligned strip with units/notation, charts legible. Full provenance remains accessible.

Validation: prioritize a concise evidence table and convergence plots/values; eliminate repeated "verified" boxes and ornamental shield/check icons. State numerical tolerances and limits honestly. About: readable editorial text with report/slides links, references, method and limitations; remove the public wall of CV bullet copy from the product UI and put it in repository documentation instead. Keep AI-assistance transparency in Notes/README rather than promotional claims. Footer should be quiet references, not Web Worker/Float64 implementation advertising.

Audit hardcoded inline colors/paddings/fonts in all views/components and replace them with semantic classes/tokens. Do NOT solve this by blanket !important overrides, hiding every SVG or ignoring inline styles. Provide coherent actual component markup/layout.

2D spatial presentation should preserve equal physical axis scale, or explicitly choose a square responsive plot area. If changing plot bounds, reuse identical bounds in drawing and pointer-to-grid coordinate mapping. Preserve orientation (x horizontal, y upward), periodic inspection, colormap range and real fields; never fake visuals or interpolate new data.

## Finish and verification

All source tests currently 63 plus 13 Python; preserve seven independent mounted UI tests and their assertions. Add meaningful tests only if a changed interaction needs them. Run npm test and npm run build. Preserve exported JSON/CSV/PNG functions, short live preset budget, t=0 snapshots, Run Again, exact saved dataset timestamps, worker cancellation and actual diagnostics. No new backend/datasets/superconducting model.

Update web/README and root README with portfolio-useful product description, reproducible setup, correct saved run durations 1000/100/800 and deployment Root Directory web. Add a concise CV sentence in docs/PORTFOLIO.md with clearly labeled link placeholders until real publishing. Do not invent URLs or attribution. Keep professor papers and personal allocation image excluded from publishing. Finish a polished local app; report modified files and checks.
