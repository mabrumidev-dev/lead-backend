# Mabrumi CRM Pro

## Overview
A professional React + Vite CRM platform designed for **corretores de seguros** (insurance brokers) to capture, qualify, and mass-disparate WhatsApp messages to convert leads into sales and enrich their CRM.

## Key Features
- **Lead Capture**: Search and find potential leads
- **Lead Base Management**: Organize and view your lead database
- **WhatsApp Disparity**: Send mass WhatsApp messages to qualified leads
- **LGPD Compliance**: 100% compliance status tracking
- **Conversion Analytics**: 32% average conversion rate monitoring

## Tech Stack
- **React 18** + **Vite** for fast development
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Lucide-react** for icons
- **Supabase** for backend and database
- **Axios** for API requests
- **Oxlint** for code linting
- **Vitest** for testing

## Project Structure
```
src/
  App.tsx          # Main application component with auth flow
  main.tsx         # Entry point
  index.css        # Global styles (Tailwind base)
  supabase/
    client.ts      # Supabase client configuration
  components/      # Reusable UI components (planned)
  hooks/          # Custom React hooks (planned)
  types/          # TypeScript type definitions (planned)
.env.example      # Environment variables template
vitest.config.ts   # Vitest testing configuration
```

## TypeScript Configuration
The project uses strict TypeScript configuration with:
- `strict: true` mode
- Path aliases `@/*` pointing to `src/*`
- JSX transformation via react-jsx
- Proper environment variable types

## Environment Variables
Copy `.env.example` to `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.com
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Available Scripts
- `npm run dev` - Start development server (Vite, port 5173)
- `npm run build` - Build for production
- `npm run lint` - Run Oxlint code linting
- `npm run preview` - Preview production build

## Linting
Oxlint is configured with React and OxC rules:
- `react/rules-of-hooks: error`
- `react/only-export-components: warn` (with `allowConstantExport: true`)

## Testing
Vitest is configured with jsdom environment. Test files follow the pattern `*.test.tsx`.

## Supabase Integration
The project includes Supabase client setup at `src/supabase/client.ts`. Auth flow implementation is planned for future development.

## Build & Verify
All checks pass:
- ✅ TypeScript compilation: `tsc --noEmit` - no errors
- ✅ Oxlint: 0 warnings, 0 errors
- ✅ Vite build: successful