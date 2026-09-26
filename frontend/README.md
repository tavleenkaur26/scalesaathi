# ScaleSaathi frontend

Vite + React + TypeScript. Currently contains only the public landing-page
hero (`src/components/landing/`) — no routing, auth, or API integration yet.

## Extracting this zip

Everything in this zip IS the contents of your `frontend/` folder — there is
no extra wrapper folder inside it. Extract it directly into your existing
`frontend/` directory (replacing files), not into a new subfolder, and don't
extract it a second level too deep (you should end up with `frontend/src/...`,
not `frontend/frontend/src/...`).

## Run locally

    cd frontend
    npm install
    npm run dev      # http://localhost:5173

    npm run build    # production build to dist/, runs the TS check first
    npm run preview   # serve the production build locally

## Structure

    src/
      assets/fonts/            Alice + Playfair Display (local, no CDN fonts)
      styles/
        fonts.css              @font-face declarations
        tokens.css             colors, type scale, spacing, shadows
        global.css             resets + base typography
      components/landing/
        Navbar.tsx / .css      logo + tagline, Login/Register only
        Hero.tsx / .css        copy + bleeding illustration + full-width strip
        HeroIllustration.tsx / .css   inline-SVG balance + weights illustration
      App.tsx
      main.tsx
