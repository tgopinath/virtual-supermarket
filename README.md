# My Supermarket — Virtual Supermarket for Kids

An interactive 3D supermarket where children aged 5–12 explore seven aisles, read prices in Indian Rupees, fill a trolley, scan items at the counter, pay with play money, count their change, and collect a receipt. The same content runs on the web (mouse and touch), in WebXR VR (Meta Quest) and in AR: WebXR on ARCore Android, or a camera fallback everywhere else.

Built with React 19, TypeScript, Three.js through React Three Fiber, drei, @react-three/xr (WebXR), Zustand, Tailwind CSS 4, IndexedDB (idb-keyval) and the Web Audio and Speech Synthesis APIs.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # engine unit tests (Vitest)
npm run build        # type-check + production build into dist/
npm run preview      # serve the production build
```

Requires Node 20 or newer.

### Testing on a phone or headset (HTTPS)

WebXR and the camera only work in a secure context. On your LAN:

```bash
npm run dev:https    # self-signed HTTPS, listens on all interfaces
```

Open `https://<your-computer-ip>:5173` on the device and accept the certificate warning.
- **Meta Quest:** open it in the Quest Browser, start a shopping game, then tap **🥽 Enter VR**.
- **Android (ARCore):** open it in Chrome, go to **AR Mode → Start AR**.
- **iPhone / iPad / desktop:** use **AR Mode → Camera mode**. Safari has no WebXR AR, so the mini store is drawn over the camera feed instead.

## What's in the app

| Area | What works |
|---|---|
| **Onboarding** | Welcome, avatar and nickname (no real names; stored only on the device), age band (5–7, 8–10, 11–12) |
| **3D store** | Entrance with automatic sliding doors and a welcome sign, trolley bay, instruction board, 7 departments with signboards, price tags and 39 individual interactive products, checkout counter, ShopBuddy robot, 3 unlockable themes |
| **Interaction (web)** | Tap a product to inspect it (rotating 3D preview, price, unit, health tag, barcode, info). Choose a quantity, add it, or compare two products (cheaper option and price per 100 g/ml). Drag a product onto the 3D trolley or the 🛒 button. Fly to any aisle, double-click the floor to walk there, use WASD/arrow keys, or open the map view |
| **Trolley** | Take it from the bay, then it follows you with rotating wheels and shows your items inside, plus an item count and total sign. The cart panel lists Product, Qty, Price and Subtotal, with +/−/remove and a live total |
| **Checkout** | Items ride the conveyor. Tap them in 3D or in the panel (or drag them onto the scanner): red laser, beep, scanner counts the quantity, line added to the bill and the register display. Pay by **cash** (drag or tap notes and coins from a finite wallet; under-payment is rejected and you get a tip about notes you didn't need), **card** or **UPI** (type the exact total on the terminal; the balance is checked). Then count the change from the cash drawer (validated) and watch the receipt print and bags appear |
| **Modes** | Free Shopping, Shopping Challenge (exact list), Budget Challenge (over-budget warning; you can't check out over budget), Money Learning, Maths Challenge, Healthy Shopping (balanced-basket rules), Timed Shopping (countdown; accuracy still required) |
| **Levels 1–8** | Identify → Find → Prices → Totals → Currency → Change → Budget → Advanced (timed). Passing a level unlocks the next; difficulty scales with age band and level |
| **Rewards** | 8 achievements, coins and stars, and a reward shop (trolley colours, store themes, ShopBuddy cap, glasses or crown) |
| **ShopBuddy** | Speaks every instruction with speech synthesis (prefers an `en-IN` voice), with subtitles, replay and mood expressions in 2D and 3D. Gives hints, says where products are ("help me find it"), explains prices and celebrates |
| **Dashboards** | Child progress screen. Parent dashboard behind a parent gate: sessions, time learning, products identified (overall and per aisle), first-try accuracy per skill, challenges, budget performance, level, achievements, recent activity, and a reset option |
| **VR** | XR origin with teleport on the floor; controller rays and hand pinch press 3D items. Pressing a product puts it straight in the trolley with a haptic pulse. A floating panel shows the list, totals and timer, and has quick travel and Checkout. Checkout in VR: scan by pressing belt items, pay with 3D coins and notes or a 3D keypad, count change, finish, and see a results panel in VR |
| **AR** | Hit-test reticle. Place the mini store, resize and rotate it, place a basket, tap products for a floating name and price label, and a money table where you put coins and notes on a real surface to make a target amount (tracked as a currency skill). DOM overlay controls. Camera fallback when WebXR AR is missing |
| **Settings** | Sound, voice, subtitles, and graphics quality (pixel ratio, antialiasing, shadows, mesh detail, number of shelf copies) |

Progress is saved to IndexedDB after every change and survives refreshes.

## Architecture

Business logic is plain TypeScript with no React or Three.js, so it is unit-tested and shared by the web, VR and AR front ends.

```
src/
  data/          products.ts (central product DB: id, name, department, price, unit, quantity,
                 3D model spec, image, learning info, food group, barcode), currency.ts
  engine/        cart.ts, money.ts, checkout.ts, challenges.ts, questions.ts, levels.ts, rewards.ts
                 engine.test.ts — 21 tests
  store/         progressStore.ts (persisted to IndexedDB), sessionStore.ts (game session & actions)
  audio/         audio.ts (Web Audio SFX + haptics), voice.ts (speech synthesis)
  xr/            xrStore.ts (shared WebXR store + capability detection)
  three/         SupermarketScene, Building, Shelves, ProductModel, Trolley, CheckoutCounter,
                 ShopBuddy, Controls (camera, drag & drop), VR (rig, HUD, checkout, result), Panel3D
  ui/            components (Kit, Money) and screens (Menus, StoreScreen, Checkout, QuizScreen,
                 Dashboards, ARScreen)
```

How the requested modules map to the code:

| Module | Where |
|---|---|
| SupermarketEnvironment | `three/SupermarketScene.tsx`, `three/Building.tsx`, `three/themes.ts` |
| DepartmentManager | `data/products.ts` (`DEPARTMENTS`), `three/layout.ts`, `three/Shelves.tsx` |
| ProductManager | `data/products.ts` |
| ProductInteraction | `three/Shelves.tsx`, `three/Controls.tsx` (drag and drop) |
| ShoppingCartManager | `engine/cart.ts` |
| TrolleyController | `three/Trolley.tsx` |
| ShoppingListManager / ChallengeManager | `engine/challenges.ts` |
| BarcodeScanner / CheckoutManager / PaymentManager | `engine/checkout.ts`, `three/CheckoutCounter.tsx`, `ui/screens/Checkout.tsx` |
| IndianCurrencyManager | `data/currency.ts`, `engine/money.ts`, `ui/components/Money.tsx` |
| LearningEngine | `engine/questions.ts`, `engine/levels.ts` |
| RewardManager | `engine/rewards.ts` |
| AvatarManager | `store/progressStore.ts` (profile), `ui/screens/Menus.tsx` |
| AudioManager | `audio/audio.ts`, `audio/voice.ts` |
| VRManager | `three/VR.tsx`, `xr/xrStore.ts` |
| ARManager | `ui/screens/ARScreen.tsx`, `xr/xrStore.ts` |
| ParentDashboard | `ui/screens/Dashboards.tsx` |

Rules the engine enforces (all covered by tests):
- All prices are whole rupees, so every total is computed exactly.
- A cash payment must come from money actually in the wallet and must cover the bill. Change is `paid − total`, and the child's counted change must match it exactly.
- Card and UPI need the exact bill total typed in, and enough balance.
- The bill is built only from scanned lines, and it must equal the trolley total.
- Levels unlock only when the frontier level is passed. Achievements are awarded once.

## Deployment

The app is a static site. `npm run build` writes `dist/`. Production is the Vercel project `my-supermarket`, connected to this GitHub repo: a push to `main` deploys https://my-supermarket-mu.vercel.app (HTTPS is required for WebXR and the camera).

The XR emulator rooms in `dist/assets/*_room-*.js` (about 4 MB) are lazy chunks from `@react-three/xr`. They are never downloaded because emulation is turned off.

### Android and iOS apps

- Android: a remote Capacitor shell (`~/Documents/android-wrappers/my-supermarket`, `com.gopinath.mysupermarket`, CAMERA permission) opens the live site. The APK is on GitHub release v1.0.0: https://github.com/tgopinath/virtual-supermarket/releases/latest/download/my-supermarket.apk
- iPhone: SwiftUI WKWebView shell, https://github.com/tgopinath/MySupermarket-iOS (camera usage string set for AR Camera mode).
- Inside the apps `src/native.ts` switches on the shared Kolam kits loaded in `index.html`: Material Design 3 bars in the Android app and Apple HIG bars in the iPhone app on the hub screens (Shop, Rewards, Progress, Settings) and menu screens; the 3D store, quizzes and results stay full-screen. Browsers are unchanged. Preview with `?app=android`, `?app=ios`, `?app=web`.
- WebXR AR is not available inside the iOS WKWebView and only partly inside the Android WebView, so the apps fall back to Camera mode.

## Testing on a phone or headset (HTTPS)

WebXR and the camera only work in a secure context. On your LAN:

```bash
npm run dev:https    # self-signed HTTPS, listens on all interfaces
```

Open `https://<your-computer-ip>:5173` on the device and accept the certificate warning.
- **Meta Quest:** open it in the Quest Browser, start a shopping game, then tap **🥽 Enter VR**.
- **Android (ARCore):** open it in Chrome, go to **AR Mode → Start AR**.
- **iPhone / iPad / desktop:** use **AR Mode → Camera mode**. Safari has no WebXR AR, so the mini store is drawn over the camera feed instead.

## What's in the app

| Area | What works |
|---|---|
| **Onboarding** | Welcome, avatar and nickname (no real names; stored only on the device), age band (5–7, 8–10, 11–12) |
| **3D store** | Entrance with automatic sliding doors and a welcome sign, trolley bay, instruction board, 7 departments with signboards, price tags and 39 individual interactive products, checkout counter, ShopBuddy robot, 3 unlockable themes |
| **Interaction (web)** | Tap a product to inspect it (rotating 3D preview, price, unit, health tag, barcode, info). Choose a quantity, add it, or compare two products (cheaper option and price per 100 g/ml). Drag a product onto the 3D trolley or the 🛒 button. Fly to any aisle, double-click the floor to walk there, use WASD/arrow keys, or open the map view |
| **Trolley** | Take it from the bay, then it follows you with rotating wheels and shows your items inside, plus an item count and total sign. The cart panel lists Product, Qty, Price and Subtotal, with +/−/remove and a live total |
| **Checkout** | Items ride the conveyor. Tap them in 3D or in the panel (or drag them onto the scanner): red laser, beep, scanner counts the quantity, line added to the bill and the register display. Pay by **cash** (drag or tap notes and coins from a finite wallet; under-payment is rejected and you get a tip about notes you didn't need), **card** or **UPI** (type the exact total on the terminal; the balance is checked). Then count the change from the cash drawer (validated) and watch the receipt print and bags appear |
| **Modes** | Free Shopping, Shopping Challenge (exact list), Budget Challenge (over-budget warning; you can't check out over budget), Money Learning, Maths Challenge, Healthy Shopping (balanced-basket rules), Timed Shopping (countdown; accuracy still required) |
| **Levels 1–8** | Identify → Find → Prices → Totals → Currency → Change → Budget → Advanced (timed). Passing a level unlocks the next; difficulty scales with age band and level |
| **Rewards** | 8 achievements, coins and stars, and a reward shop (trolley colours, store themes, ShopBuddy cap, glasses or crown) |
| **ShopBuddy** | Speaks every instruction with speech synthesis (prefers an `en-IN` voice), with subtitles, replay and mood expressions in 2D and 3D. Gives hints, says where products are ("help me find it"), explains prices and celebrates |
| **Dashboards** | Child progress screen. Parent dashboard behind a parent gate: sessions, time learning, products identified (overall and per aisle), first-try accuracy per skill, challenges, budget performance, level, achievements, recent activity, and a reset option |
| **VR** | XR origin with teleport on the floor; controller rays and hand pinch press 3D items. Pressing a product puts it straight in the trolley with a haptic pulse. A floating panel shows the list, totals and timer, and has quick travel and Checkout. Checkout in VR: scan by pressing belt items, pay with 3D coins and notes or a 3D keypad, count change, finish, and see a results panel in VR |
| **AR** | Hit-test reticle. Place the mini store, resize and rotate it, place a basket, tap products for a floating name and price label, and a money table where you put coins and notes on a real surface to make a target amount (tracked as a currency skill). DOM overlay controls. Camera fallback when WebXR AR is missing |
| **Settings** | Sound, voice, subtitles, and graphics quality (pixel ratio, antialiasing, shadows, mesh detail, number of shelf copies) |

Progress is saved to IndexedDB after every change and survives refreshes.

## Architecture

Business logic is plain TypeScript with no React or Three.js, so it is unit-tested and shared by the web, VR and AR front ends.

```
src/
  data/          products.ts (central product DB: id, name, department, price, unit, quantity,
                 3D model spec, image, learning info, food group, barcode), currency.ts
  engine/        cart.ts, money.ts, checkout.ts, challenges.ts, questions.ts, levels.ts, rewards.ts
                 engine.test.ts — 21 tests
  store/         progressStore.ts (persisted to IndexedDB), sessionStore.ts (game session & actions)
  audio/         audio.ts (Web Audio SFX + haptics), voice.ts (speech synthesis)
  xr/            xrStore.ts (shared WebXR store + capability detection)
  three/         SupermarketScene, Building, Shelves, ProductModel, Trolley, CheckoutCounter,
                 ShopBuddy, Controls (camera, drag & drop), VR (rig, HUD, checkout, result), Panel3D
  ui/            components (Kit, Money) and screens (Menus, StoreScreen, Checkout, QuizScreen,
                 Dashboards, ARScreen)
```

How the requested modules map to the code:

| Module | Where |
|---|---|
| SupermarketEnvironment | `three/SupermarketScene.tsx`, `three/Building.tsx`, `three/themes.ts` |
| DepartmentManager | `data/products.ts` (`DEPARTMENTS`), `three/layout.ts`, `three/Shelves.tsx` |
| ProductManager | `data/products.ts` |
| ProductInteraction | `three/Shelves.tsx`, `three/Controls.tsx` (drag and drop) |
| ShoppingCartManager | `engine/cart.ts` |
| TrolleyController | `three/Trolley.tsx` |
| ShoppingListManager / ChallengeManager | `engine/challenges.ts` |
| BarcodeScanner / CheckoutManager / PaymentManager | `engine/checkout.ts`, `three/CheckoutCounter.tsx`, `ui/screens/Checkout.tsx` |
| IndianCurrencyManager | `data/currency.ts`, `engine/money.ts`, `ui/components/Money.tsx` |
| LearningEngine | `engine/questions.ts`, `engine/levels.ts` |
| RewardManager | `engine/rewards.ts` |
| AvatarManager | `store/progressStore.ts` (profile), `ui/screens/Menus.tsx` |
| AudioManager | `audio/audio.ts`, `audio/voice.ts` |
| VRManager | `three/VR.tsx`, `xr/xrStore.ts` |
| ARManager | `ui/screens/ARScreen.tsx`, `xr/xrStore.ts` |
| ParentDashboard | `ui/screens/Dashboards.tsx` |

Rules the engine enforces (all covered by tests):
- All prices are whole rupees, so every total is computed exactly.
- A cash payment must come from money actually in the wallet and must cover the bill. Change is `paid − total`, and the child's counted change must match it exactly.
- Card and UPI need the exact bill total typed in, and enough balance.
- The bill is built only from scanned lines, and it must equal the trolley total.
- Levels unlock only when the frontier level is passed. Achievements are awarded once.

## Deployment

The app is a static site. `npm run build` writes `dist/`. Production is the Vercel project `my-supermarket`, connected to this GitHub repo: a push to `main` deploys https://my-supermarket-mu.vercel.app (HTTPS is required for WebXR and the camera).

The XR emulator rooms in `dist/assets/*_room-*.js` (about 4 MB) are lazy chunks from `@react-three/xr`. They are never downloaded because emulation is turned off.

### Android and iOS packaging

The app ships with a web manifest, so it can be installed as a PWA. For store builds, wrap `dist/` with Capacitor:

```bash
npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "My Supermarket" com.example.mysupermarket --web-dir dist
npm run build && npx cap add android && npx cap add ios && npx cap sync
```

WebXR AR is not available inside the iOS WKWebView, and only partly inside the Android WebView, so packaged builds fall back to Camera mode. Add camera usage strings (`NSCameraUsageDescription`, the Android `CAMERA` permission) to the native projects.

## Testing

See [docs/TESTING.md](docs/TESTING.md) for the manual test script that covers the full shopping journey, every mode, VR and AR.

## Known limitations / next steps

- **VR and WebXR AR have not been tried on real hardware yet.** They compile and the non-XR fallbacks are browser-tested, but run the Quest and ARCore checks in `docs/TESTING.md` before relying on them.
- In VR, a product is picked by pointing and pressing the trigger (or pinching), then it goes into the trolley. There is no physics grab-and-throw yet, and the trolley follows the player instead of being pushed by hand.
- Sound effects are not positional (no spatial audio yet).
- Products are procedural low-poly models, not scanned or modelled GLTF assets. The `model` field in the product DB is where a GLTF path would go.
- 3D text loads its default font from a CDN on first use, so bundle a font file for full offline use. There is no service worker yet.
- Graphics quality controls the pixel ratio, shadows, mesh segments and shelf copies, but there are no separate LOD meshes.
