# Tech Stack — IoT Cyber Security GraphOS

A comprehensive technical breakdown of the technology stack powering the **IoT Cyber Security Mesh & Threat Topology** platform.

---

## 1. Core Framework & Language

| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **[Next.js](https://nextjs.org/)** | `13.5.1` | React Application Framework (App Router, Static Export & SSR) |
| **[React](https://react.dev/)** | `18.2.0` | UI Component Library & State Engine |
| **[TypeScript](https://www.typescriptlang.org/)** | `5.2.2` | Static Type Checker & Developer Tooling |
| **[Node.js](https://nodejs.org/)** | `>=20` | Server Environment & Build Engine |

---

## 2. Visualization & Physics Engine

| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **[d3-force](https://github.com/d3/d3-force)** | `3.0.0` | 2D Physics Simulation Engine (Forces: Link, Charge, Center, Collision, Concentric Radial Orbits) |
| **Custom SVG Engine** | Native | Vector Canvas rendering concentric orbital guide rings, animated synapse pulses, curved edge arcs, and circular node badges |

---

## 3. Styling & UI Design System

| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **[TailwindCSS](https://tailwindcss.com/)** | `3.3.3` | Utility-first CSS Framework |
| **Vanilla CSS Design Tokens** | Native | CSS Custom Variables (`globals.css`) for Light/White Minimal Skin, Grid Drift & Synapse animations |
| **[Lucide React](https://lucide.react.dev/)** | `0.446.0` | Vector Icon System (Cpu, Layers, Bot, ClipboardList, Wrench, UserRound) |
| **[JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)** | Next.js Font | Monospace Typography |

---

## 4. UI Components & Utilities

| Category | Package | Purpose |
| :--- | :--- | :--- |
| **UI Primitives** | `@radix-ui/react-*` | Accessible UI Primitives (Dialog, Accordion, Dropdown, Tabs, Tooltip) |
| **Style Utilities** | `clsx` + `tailwind-merge` | Dynamic Class Composition (`cn` helper) |
| **Variant Management**| `class-variance-authority` | Component variant styling |
| **Toast Notifications**| `sonner` | Toast feedback system |
| **Charts & Analytics**| `recharts` | Graph data analytics & metrics visualization |
| **Forms & Validation**| `react-hook-form` + `zod` | Form management and schema validation |
| **Database Connector**| `@supabase/supabase-js` | Supabase Client integration ready |

---

## 5. Build, Lint & Deployment

| Tool | Purpose |
| :--- | :--- |
| **PostCSS + Autoprefixer** | CSS processing & vendor prefixing |
| **ESLint + eslint-config-next** | Code quality & Next.js linting standards |
| **Netlify Next.js Plugin** | Cloud deployment configuration (`@netlify/plugin-nextjs`) |
