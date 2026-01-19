# PO-VERSE

A modern Progressive Web App (PWA) built with Next.js, Material UI, Zustand, and React Hook Form.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router & TypeScript
- **UI Library**: [MUI (Material UI)](https://mui.com/) v6
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **PWA Support**: [next-pwa](https://github.com/shadowwalker/next-pwa)

## Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # Reusable UI components
├── store/           # Zustand stores
├── lib/             # Utility functions and schemas
├── theme/           # MUI theme configuration
└── types/           # TypeScript type definitions
```

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, or pnpm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Features

### MUI Theme
Custom theme configuration in `src/theme/` with:
- Responsive typography
- Custom color palette
- Component overrides

### Zustand Store
Global state management in `src/store/` with:
- Theme toggle state
- User state
- Sidebar state
- Persisted storage
- DevTools integration

### Form Validation
Example contact form with:
- React Hook Form integration
- Zod schema validation
- MUI TextField components
- Error handling

### PWA Support
Progressive Web App features:
- Service worker for offline support
- Web app manifest
- Installable on mobile devices

### Location Services
Agent dashboard features real-time location tracking:
- Google Maps integration for displaying current location
- Permission dialog for location access
- Live position tracking with accuracy indicator
- Location refresh functionality

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Google Maps API Key (required for location features)
# Get your API key from https://console.cloud.google.com/google/maps-apis
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Setting up Google Maps API:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Maps JavaScript API"
4. Create an API key in "Credentials"
5. (Optional) Restrict the key to your domain for security

## PWA Icons

⚠️ **Note**: You need to add PWA icons to the `/public/icons/` directory:
- `icon-192x192.png` (192x192 pixels)
- `icon-512x512.png` (512x512 pixels)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [MUI Documentation](https://mui.com/getting-started/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [React Hook Form Documentation](https://react-hook-form.com/get-started)
- [Zod Documentation](https://zod.dev/)

## License

MIT
