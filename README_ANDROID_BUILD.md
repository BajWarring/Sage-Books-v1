# Sage Books — Capacitor Android Project (Generated)

This repository is prepared to build an Android APK from the existing React (Vite + TypeScript) web app using Capacitor.

## What I added
- `capacitor.config.ts` and `capacitor.config.json`
- Capacitor dependencies in `devDependencies`
- Useful npm scripts in `package.json`
- GitHub Actions workflow to build on push (see `.github/workflows/android.yml`)
- This README with step-by-step instructions.

> Note: This package **does not** include a prebuilt `android/` folder. Most cloud builders will run `npx cap add android` for you to generate it during CI.

---

## Quick steps to build an APK (no Android Studio required)

### Option A — Build on your phone using Codemagic (recommended)
1. Push this repository to GitHub.
2. Sign in to [Codemagic](https://codemagic.io/) and connect your GitHub repo.
3. Configure a new build for **Android**:
   - Build script / pre-build steps:
     ```bash
     npm ci
     npm run build
     npx cap init 'Sage Books' com.sage.books --web-dir=dist || true
     npx cap add android || true
     npx cap copy
     cd android
     ./gradlew assembleRelease
     ```
4. After the build completes, download the generated APK.

### Option B — Use GitHub Actions (auto build on push)
A workflow file is included at `.github/workflows/android.yml`. It will:
- Install Node
- Run `npm ci` and `npm run build`
- Run Capacitor commands to add/copy Android
- Run Gradle to build the APK
Push to GitHub and let Actions run. The APK will be saved as a workflow artifact.

### Option C — Use EAS / Expo or other cloud builders
Follow similar steps; ensure the cloud builder runs the npm scripts and runs `npx cap add android` then Gradle.

---

## Local (if you later get Android Studio)
On a machine with Node + Java + Android SDK:
```bash
npm ci
npm run build
npx cap init 'Sage Books' com.sage.books --web-dir=dist
npx cap add android
npx cap copy
npx cap open android
# Then in Android Studio: Build -> Build Bundle(s) / APK(s)
```

---

## Notes & troubleshooting
- If `npx cap add android` fails in CI, ensure `JAVA_HOME` and Android SDK are available in the CI environment.
- Codemagic and many CI services provide Android toolchains preinstalled.
- If you want, I can also create a ready GitHub repo and push this for you (if you authorize and provide a repo).

