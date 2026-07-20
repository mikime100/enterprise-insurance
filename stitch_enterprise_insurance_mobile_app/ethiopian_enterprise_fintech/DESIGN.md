---
name: Ethiopian Enterprise Fintech
colors:
  surface: '#f7f9fc'
  surface-dim: '#d8dadd'
  surface-bright: '#f7f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f7'
  surface-container: '#eceef1'
  surface-container-high: '#e6e8eb'
  surface-container-highest: '#e0e3e6'
  on-surface: '#191c1e'
  on-surface-variant: '#43474e'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f4'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#455f87'
  primary: '#022448'
  on-primary: '#ffffff'
  primary-container: '#1e3a5f'
  on-primary-container: '#8aa4cf'
  inverse-primary: '#adc8f5'
  secondary: '#006e2f'
  on-secondary: '#ffffff'
  secondary-container: '#6bff8f'
  on-secondary-container: '#007432'
  tertiary: '#192437'
  on-tertiary: '#ffffff'
  tertiary-container: '#2f3a4e'
  on-tertiary-container: '#98a4bb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#adc8f5'
  on-primary-fixed: '#001c3b'
  on-primary-fixed-variant: '#2d486d'
  secondary-fixed: '#6bff8f'
  secondary-fixed-dim: '#4ae176'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005321'
  tertiary-fixed: '#d7e3fc'
  tertiary-fixed-dim: '#bbc7df'
  on-tertiary-fixed: '#101c2e'
  on-tertiary-fixed-variant: '#3c475b'
  background: '#f7f9fc'
  on-background: '#191c1e'
  surface-variant: '#e0e3e6'
typography:
  display-lg:
    fontFamily: Archivo Narrow
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Archivo Narrow
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Archivo Narrow
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Work Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-lg:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  currency-display:
    fontFamily: Work Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin: 20px
---

## Brand & Style

This design system is engineered for the Ethiopian insurance sector, blending the stability of institutional finance with the agility of modern fintech. The brand personality is **authoritative yet accessible**, aiming to demystify complex insurance products for a mobile-first generation.

The visual style is a hybrid of **Corporate Modern** and **Glassmorphism**. It utilizes high-depth surfaces and soft layering to create a sense of digital "physicality." By combining deep, trustworthy navy tones with vibrant functional accents, the UI evokes an emotional response of security and forward-thinking innovation. The aesthetic prioritizes clarity and legibility, ensuring that critical financial data is never obscured by decorative elements.

## Colors

The palette is anchored by **Deep Navy (#1E3A5F)**, representing stability and traditional insurance values. **Vibrant Green (#22C55E)** serves as the primary action color, used sparingly but intentionally to drive conversions and signal success.

### Functional Palette
- **Primary Navy:** Used for headers, primary buttons, and critical iconography.
- **Surface Off-White:** The foundation for the background to reduce eye strain and provide a soft canvas for cards.
- **Status System:** A dedicated four-color logic for claims management:
    - **Purple:** Settlement Offers (High priority, requires action).
    - **Amber:** Pending (System processing).
    - **Green:** Settled (Successful resolution).
    - **Red:** Denied (Finality/Issue).

Gradients should transition from **#1E3A5F** to **#0A1628** at a 135-degree angle for hero cards and primary containers.

## Typography

The typographic system utilizes **Archivo Narrow** for all headings to provide a strong, condensed, and authoritative "newsroom" feel that maximizes horizontal space on mobile devices. **Work Sans** is used for body copy and UI labels due to its exceptional legibility and neutral, professional tone.

Specific emphasis is placed on **Currency Display** styles. Since the app handles ETB (Ethiopian Birr) transactions, financial figures should be rendered in Work Sans Bold to ensure clarity. Use sentence case for all body copy and all-caps for small labels and category tags to reinforce the information hierarchy.

## Layout & Spacing

The design system employs a **Fluid Grid** optimized for mobile viewports. The standard layout uses a **20px side margin** to provide generous breathing room, preventing the UI from feeling cramped.

### Layout Logic
- **Vertical Rhythm:** Built on an 8px baseline grid to ensure consistent alignment.
- **Card Spacing:** 16px (md) between cards in a vertical stack; 12px (sm) between internal card elements.
- **Hero Containers:** Full-width or inset with 20px margins, depending on the information density of the screen.
- **Safe Areas:** Adhere to standard iOS and Android safe-area insets for the bottom navigation and top status bars.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Ambient Shadows**.

1.  **Level 0 (Background):** Soft off-white (#F6F8FB).
2.  **Level 1 (Cards):** Pure white surfaces with a soft, multi-layered shadow (0px 4px 20px rgba(0,0,0,0.04)).
3.  **Level 2 (Hero/Active):** Gradient Navy containers with subtle internal glows and decorative translucent circles (10% opacity white) to provide depth without clutter.
4.  **Floating Elements:** Action buttons and bottom navigation use a slightly more pronounced shadow (0px 8px 30px rgba(30, 58, 95, 0.12)) to appear closer to the user.

Glassmorphism is applied specifically to the **Bottom Navigation Bar**, using a backdrop-blur (12px) and a semi-transparent white fill (80% opacity) to maintain context of the content scrolling behind it.

## Shapes

The shape language is defined by **large, friendly radii**. 

- **Primary Cards:** Use a 20px radius (`rounded-lg`) to create a soft, modern container.
- **Hero Elements:** Use 24px (`rounded-xl`) to anchor the top of the screen.
- **Buttons & Inputs:** Use a 12px radius to balance the friendliness of the cards with a more professional, structured feel for interactive elements.
- **Status Pills:** Always fully rounded (pill-shaped) to distinguish them from clickable buttons.

## Components

### Buttons
- **Primary:** Vibrant Green background, white text, 12px radius. High-contrast and bold.
- **Secondary:** Transparent with a 1px Navy border or light grey fill for low-priority actions.

### Status Pill System
Pills are small, uppercase labels with a 10% opacity background of their respective status color and a 100% opacity text color (e.g., Green text on light green background). This ensures accessibility while maintaining the "settled" or "pending" visual cue.

### Cards
All cards must have a 20px corner radius. Hero cards feature a navy gradient and internal circular motifs. Claims cards include a status pill in the top-right corner and clear bold headings for the policy type.

### Input Fields
Fields use a white background with a subtle 1px border (#E2E8F0). Upon focus, the border transitions to Primary Navy. Labels are placed above the field in **label-lg** style.

### Bottom Navigation
A four-item persistent bar (Home, Coverage, Claims, Profile). Icons should be 24px, using a "Filled" style for the active state and an "Outlined" style for inactive states, utilizing the Primary Navy color.