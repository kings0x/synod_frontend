# Renew Landing Page Layout Notes

This document records what is explicitly implemented in `C:\Users\Admin\Documents\renew-site` from the hero section downward, using standard frontend and layout terminology only.

## Source of truth inspected

- `C:\Users\Admin\Documents\renew-site\renew\www.renew.sh\index.html`
- `C:\Users\Admin\Documents\renew-site\renew\www.renew.sh\_next\static\chunks\2c8380cd68484f88.css`
- `C:\Users\Admin\Documents\renew-site\renew\www.renew.sh\_next\static\chunks\2241956cdc9692b9.js`
- `C:\Users\Admin\Documents\renew-site\renew\www.renew.sh\_next\static\chunks\464db5ad536ca0a8.js`

## High-level answer

This is not one giant monolithic post-hero section.

It is a normal top-to-bottom landing page made of multiple discrete sections in document flow:

1. Sticky / auto-hiding header
2. Hero section
3. `#overview`
4. `#why-renew`
5. `#how-it-works`
6. `#network`
7. `#contact`
8. Footer

The "scrollable" feeling comes from a combination of:

- Native smooth anchor scrolling on the page
- Sticky positioning
- One scroll-linked text section
- One sticky sidebar section with scroll-synced active state
- One sticky-title process timeline section
- Repeated scroll-triggered reveal animation

It is not implemented as CSS scroll snap, not as a single custom scroll container, and not as a full-page panel scroller.

## Global page mechanics

- The page shell is a standard vertical page wrapper: `.page-shell`.
- `html { scroll-behavior: smooth; }` is enabled globally.
- The page background is a layered light gradient on `body`.
- `.page-shell::before` adds additional radial decorative background washes.
- A shared `Container` utility is used repeatedly: max width `1200px` with responsive horizontal padding.
- Theme tokens are defined with CSS custom properties such as `--page-bg`, `--ink`, `--muted`, `--brand`, and `--line`.

## Header

Industry-standard name: sticky header / floating navigation bar / auto-hiding nav.

Explicit behavior:

- The header is `position: sticky` at the top of the page.
- It auto-hides on downward scroll and returns on upward scroll.
- The hide/show logic uses a `window.scroll` listener.
- The header is translated out of view with `-translate-y-[140%]` when hidden.
- Once `scrollY > 12`, the header switches to a dark translucent "glass" treatment with border and background.
- On desktop it contains a primary nav and a "More" dropdown.
- On mobile it becomes a collapsible nav drawer with a nested "More" accordion.
- Primary anchor targets are `#overview`, `#why-renew`, and `#how-it-works`.
- The secondary "More" menu links to `#network`, `/playground`, and `/docs`.

Important clarification:

- The header itself contributes to the overall moving-layout feel because it changes state on scroll, but it is separate from the hero-downward content sections.

## Hero section

Industry-standard name: full-height hero / above-the-fold hero.

Explicit structure:

- The hero is a standalone `<section>`.
- It uses a near-viewport-height minimum height:
  `min-h-[calc(100svh-6.5rem)]` and `lg:min-h-[calc(100svh-7rem)]`.
- Content is vertically centered with responsive top and bottom padding.
- The section has `overflow-hidden` and `isolate`.

Explicit visual layers:

- A top radial light wash sits absolutely behind the content.
- A full-bleed SVG dot field sits behind the content.
- The SVG contains many circles.
- Some circles use native SVG `<animate>` elements to pulse radius and fill opacity.

Explicit hero content:

- The main headline is two-line.
- Line 1 is an animated fiat ticker.
- Line 2 is static: `Settle in USDC.`
- Below the headline is a CTA row:
  primary "Get started" button and secondary "View docs" button.

### Hero headline animation

Industry-standard name: typing ticker / rotating text ticker.

Explicit implementation:

- A `FiatTicker` component rotates through fiat currencies.
- It types the currency code letter by letter using timed state updates.
- It also displays the corresponding currency symbol.
- The symbol enters and exits with motion animation.
- A blinking caret is rendered beside the typed text.
- The visible phrase is effectively `Bill in <currency>` with the second hero line `Settle in USDC.`

## `#overview`

Industry-standard name: pinned scrollytelling section / sticky narrative section / scroll-linked text section.

This is the first major section after the hero that creates the strongest special-scrolling effect.

Explicit structure:

- The section id is `overview`.
- The outer section is intentionally taller than the viewport:
  `min-h-[150svh]`, `sm:min-h-[160svh]`, `lg:min-h-[170svh]`.
- Inside it is a sticky child:
  `sticky top-[5.75rem] min-h-[calc(100svh-5.75rem)]`.

What that means in layout terms:

- The outer section creates extra scroll distance.
- The inner content stays pinned while the user scrolls through that distance.

Explicit content behavior:

- The content is one large display paragraph:
  `Charge customers in local fiat and settle in USDC on Avalanche - built for recurring and usage-based billing.`
- The section tracks `scrollYProgress` against the section itself.
- The configured offset is `["start start", "end end"]`.
- Each word is rendered separately.
- Word color is interpolated from muted green-gray to the brand green as scroll progress advances.

Important clarification:

- This is not a carousel.
- This is not section snap.
- This is not a horizontal scroller.
- It is a vertically pinned, scroll-progress-driven text reveal.

Reduced-motion fallback:

- If reduced motion is enabled, the animated per-word color transition is skipped and the full sentence is rendered statically.

## `#why-renew`

Industry-standard name: sticky sidebar with scroll-synced active state.

Explicit section structure:

- The section id is `why-renew`.
- It is a two-column responsive grid at large breakpoints.
- Left column:
  sticky title block plus a vertical list of category markers.
- Right column:
  stacked feature cards in normal document flow.

Explicit sticky behavior:

- The left column becomes sticky on large screens with `lg:sticky lg:top-28`.
- The right column does not become sticky.

Explicit active-state logic:

- The right-column cards are observed with `IntersectionObserver`.
- Thresholds are `[0.2, 0.35, 0.5, 0.65, 0.8]`.
- Root margin is `-18% 0px -42% 0px`.
- The active card is whichever observed card has the highest current intersection ratio.
- The matching left-side label becomes the active item.

Explicit animated highlight:

- The active left-side item uses a shared-layout animated background via Framer Motion.
- The shared layout id is `why-renew-active`.
- The transition is spring-based with `stiffness: 320` and `damping: 30`.

Explicit content model:

- Left-side labels correspond to a right-side card stack.
- The four cards are:
  `Local pricing`
  `USDC settlement`
  `Recurring billing`
  `Usage-based billing`

Explicit styling pattern:

- Right-side cards alternate visual treatment by index parity.
- Even-index cards use a dark gradient card style.
- Odd-index cards use a light card style.

Important clarification:

- This section is not one sticky full-page scroller.
- It is a normal vertical card stack with a sticky companion sidebar that mirrors scroll position.

## `#how-it-works`

Industry-standard name: vertical process timeline / process stepper / sticky-title timeline section.

Explicit section structure:

- The section id is `how-it-works`.
- It uses a two-column large-screen grid.
- Left column:
  sticky section title.
- Right column:
  a vertical timeline rail with three stacked step cards.

Explicit sticky behavior:

- The left column uses `lg:sticky lg:top-28 lg:self-start`.
- The right column remains in normal document flow.

Explicit timeline construction:

- The right side has a visible left border:
  `border-l border-[color:var(--line)]`.
- Each step card is positioned relative.
- Each card has a numbered marker positioned absolutely outside the card, over the timeline rail.
- The marker is a square-ish rounded badge with dark background and light text.

Explicit steps:

1. Set a price
2. Collect the charge
3. Settle and reconcile

Important clarification:

- This is a standard vertical timeline composition.
- It is not a separate scroll container.
- The special feeling comes from the sticky title on the left while the user scrolls through the step cards on the right.

## `#network`

Industry-standard name: feature band / dark feature block / two-column benefits section.

Explicit structure:

- The section id is `network`.
- It contains one large rounded dark panel.
- Inside that panel is a two-column large-screen grid.
- Left side is section intro copy.
- Right side is a responsive feature-card grid.

Explicit feature items:

- Fast confirmations
- Predictable fees
- Familiar tooling
- USDC liquidity

Important clarification:

- This section does not implement special sticky or scroll-linked behavior.
- It is a standard landing-page feature section.

## `#contact`

Industry-standard name: CTA panel / call-to-action band.

Explicit structure:

- The section id is `contact`.
- It is a single rounded card-like panel with border and shadow.
- Inside is a responsive grid:
  message on one side, CTA group on the other.
- On large screens there is a decorative SVG arrow path positioned absolutely inside the panel.
- The CTA group contains the same primary "Get started" and secondary "View docs" actions.

Important clarification:

- This section is a regular CTA block, not part of the sticky and scrollytelling mechanics.

## Footer

Industry-standard name: standard site footer.

Explicit structure:

- The footer is separate from the CTA section.
- It contains the Renew logo and short descriptor.
- It also contains footer navigation links.
- It starts with a top border.

## Scroll-triggered motion system used across sections

Industry-standard name: viewport-enter reveal animation.

Explicit implementation:

- A reusable `Reveal` component wraps many hero and post-hero elements.
- It uses Framer Motion `motion.div`.
- Initial state:
  `opacity: 0`, `y: offset`.
- In-view state:
  `opacity: 1`, `y: 0`.
- Trigger mode:
  `whileInView`.
- Viewport config:
  `once: true`, `amount: 0.3`.
- Transition:
  duration `0.7`, easing `[0.16, 1, 0.3, 1]`.

Where it is used:

- Hero headline
- Hero CTA row
- `#why-renew` sticky left block
- `#why-renew` cards
- `#how-it-works` sticky title
- `#how-it-works` step cards
- `#network` intro and benefit cards
- `#contact` CTA card

## Final classification of the post-hero layout

If another model needs the correct implementation vocabulary, the landing page after the hero should be described as:

- A multi-section vertical landing page
- With one pinned scrollytelling text section (`#overview`)
- Followed by one sticky-sidebar, scroll-synced feature section (`#why-renew`)
- Followed by one sticky-title vertical process timeline (`#how-it-works`)
- Followed by regular feature and CTA sections (`#network`, `#contact`)
- All tied together by smooth anchor scrolling, a sticky auto-hiding header, and repeated viewport-enter reveal animations

The key point is:

- The unusual scroll feeling is produced by several smaller standard patterns combined together, not by a single custom scrolling layout system.
