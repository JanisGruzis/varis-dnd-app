# Varis D&D App

A polished, mobile-friendly Open D&D reference app. It loads open 5e compendium data in the browser from the Open5e API and provides fast client-side search with selectable dropdown results.

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

The app uses relative asset paths so it works both at the domain root and under a project path such as `https://<user>.github.io/<repo>/`.

