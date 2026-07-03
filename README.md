# Varis D&D App

A polished, mobile-friendly Open D&D reference app. It loads spells, backgrounds, playable races, and weapons in the browser from the same public Google Sheet used by https://varisvconsulting.github.io/open-dnd/ and provides fast client-side search with selectable dropdown results.

## Run locally

```bash
npm run dev
```

Open <http://localhost:4173>.

## Validate

```bash
npm run build
```
## Deploy to GitHub Pages

This repository is configured for GitHub Pages with the workflow in `.github/workflows/pages.yml`. To publish it:

1. Push the `main` branch to GitHub.
2. In the repository settings, open **Pages**.
3. Set **Build and deployment** to **GitHub Actions**.
4. The **Deploy GitHub Pages** workflow will upload this static site and publish it.

The app uses relative asset paths so it works both at the domain root and under a project path such as `https://<user>.github.io/<repo>/`. Data is loaded client-side from the public Google Sheet export URLs; spells and weapons use the same CORS proxy pattern as the reference app.

