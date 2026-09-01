---
name: High-Production Momentum
colors:
  surface: '#131314'
  surface-dim: '#131314'
  surface-bright: '#3a393a'
  surface-container-lowest: '#0e0e0f'
  surface-container-low: '#1c1b1c'
  surface-container: '#201f20'
  surface-container-high: '#2a2a2b'
  surface-container-highest: '#353436'
  on-surface: '#e5e2e3'
  on-surface-variant: '#c8c4d4'
  inverse-surface: '#e5e2e3'
  inverse-on-surface: '#313031'
  outline: '#928f9d'
  outline-variant: '#474552'
  surface-tint: '#c5c0ff'
  primary: '#c5c0ff'
  on-primary: '#2a1c84'
  primary-container: '#8c84eb'
  on-primary-container: '#23127d'
  inverse-primary: '#5951b4'
  secondary: '#ffb59e'
  on-secondary: '#5e1700'
  secondary-container: '#952a00'
  on-secondary-container: '#ffaf97'
  tertiary: '#c8c6c8'
  on-tertiary: '#303032'
  tertiary-container: '#929092'
  on-tertiary-container: '#2a292c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e4dfff'
  primary-fixed-dim: '#c5c0ff'
  on-primary-fixed: '#140067'
  on-primary-fixed-variant: '#41379b'
  secondary-fixed: '#ffdbd0'
  secondary-fixed-dim: '#ffb59e'
  on-secondary-fixed: '#3a0b00'
  on-secondary-fixed-variant: '#852400'
  tertiary-fixed: '#e4e2e4'
  tertiary-fixed-dim: '#c8c6c8'
  on-tertiary-fixed: '#1b1b1d'
  on-tertiary-fixed-variant: '#474649'
  background: '#131314'
  on-background: '#e5e2e3'
  surface-variant: '#353436'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0.01em
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style

The design system is engineered for the creator economy, blending high-production aesthetics with the precision of a professional SaaS. The visual direction is **Dark-mode-first Modernism**, characterized by deep charcoal surfaces, vibrant electric accents, and sophisticated glassmorphism. 

The system utilizes "Atmospheric Depth" to create a sense of premium quality. This is achieved through subtle light refraction, beveled edges that mimic high-end hardware, and localized ambient glows that direct the user's focus toward growth and performance metrics. The emotional response is one of confidence and energy—positioning the platform not just as a tool, but as a high-performance engine for digital creators.

## Colors

The palette is anchored by a deep charcoal background to ensure high contrast and minimize eye strain during long editing or management sessions. 

- **Backgrounds**: Use `#0A0A0B` for the base canvas and `#1A1A1C` for elevated containers and cards.
- **Accents**: The primary "Electric Purple" and secondary "Coral" are used primarily in a diagonal gradient for high-intent actions and visual highlights.
- **Atmospheric Glows**: Use low-opacity (8-12%) radial gradients of the primary color behind key cards to create depth without clutter.
- **Text**: Pure white (#FFFFFF) for headers to maximize impact, and a muted slate (#94949E) for secondary body copy.

## Typography

This design system relies on a single, systematic typeface—**Inter**—leveraging its wide range of weights to create hierarchy. 

Headlines are tight, bold, and impactful, utilizing negative letter-spacing to mimic professional editorial layouts. Body text is optimized for readability against dark backgrounds by slightly increasing the line height and using a medium-grey tint for long-form content to reduce "vibration." Labels and small UI metadata should use the `label-bold` style with increased tracking for a modern, technical feel.

## Layout & Spacing

The design system employs a **Fluid-Fixed hybrid grid**. The main content area lives within a 1440px max-width container, while background elements and glassmorphic panels may bleed to the screen edges.

- **Rhythm**: All spacing is based on an 8px base unit. 
- **Desktop**: 12-column grid with 24px gutters. Use generous 64px margins to convey a high-end "gallery" feel.
- **Mobile**: 4-column grid with 16px gutters. Margins reduce to 20px. 
- **Padding**: Elements like cards and modals should use 32px internal padding (space-4) to maintain the airy, premium aesthetic.

## Elevation & Depth

Depth is the primary differentiator of this design system. It uses three distinct layers:

1.  **The Void (Base)**: `#0A0A0B`. This is the bottom-most layer.
2.  **The Glass (Plates)**: Translucent `#1A1A1C` surfaces with a 20px backdrop blur. These carry a 1px solid border at 10% white opacity on the top and left sides to simulate a light source from the top-left.
3.  **The Pulse (Floating)**: High-elevation elements (modals, dropdowns) use a subtle 40px blur shadow with a 5% purple tint (`rgba(127, 119, 221, 0.05)`).

Avoid drop shadows on flat buttons; instead, use inner glows or "bevel" borders to create a tactile 3D effect.

## Shapes

The shape language balances modern software precision with organic flow. 

All primary UI containers, cards, and input fields use a **0.5rem (8px)** base corner radius. This provides a clean, architectural look. For more energetic elements—specifically buttons and status tags—use the `rounded-xl` or full pill-shape to contrast against the more rigid grid. This juxtaposition between "structured" containers and "fluid" interactive elements helps the user intuitively identify touchpoints.

## Components

### Buttons
- **Primary**: Gradient background (Purple to Coral) with white text. Apply a subtle 1px white inner-border (top only) at 20% opacity for a "beveled" look.
- **Secondary**: Glassmorphic style. Semi-transparent background with a white stroke and 12px backdrop blur.

### Input Fields
Dark backgrounds (`#141415`) with a 1px border that glows into a purple gradient on focus. Text should be white, while placeholders are muted.

### Cards
Use the glassmorphism approach: background-color at 60% opacity, backdrop-filter: blur(20px), and a thin, high-contrast border on the top-left edges to create a 3D light-refraction effect.

### Chips & Tags
Always pill-shaped. Use high-saturation background colors at 15% opacity with 100% opacity text for a neon-on-dark effect.

### Growth Metrics (Special Component)
Include large "Metric Displays" featuring the primary gradient on the numbers themselves, paired with a small sparkline graph utilizing a glow-shadow on the stroke.