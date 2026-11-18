# My Supermarket

**Pitch:** A 3D supermarket where children learn Indian money by actually shopping.

**Description:** Children aged 5 to 12 walk seven aisles of a 3D store, read prices in rupees, fill a trolley, scan items at the counter, pay with a finite wallet of play notes and coins (or card / UPI) and count their change, which the engine checks exactly. Seven modes (free shopping, list, budget, money, maths, healthy and timed shopping) and eight levels from naming products to budgeting, with ShopBuddy speaking every instruction with subtitles, a parent dashboard behind a gate, and WebXR VR (Quest) and AR (ARCore, camera fallback elsewhere).

**Tags:** Kids, Learning, 3D, WebXR, Money, React, Three.js, Android, iOS

- Live: https://my-supermarket-mu.vercel.app (my-supermarket.vercel.app belongs to someone else and redirects to their login)
- APK: https://github.com/tgopinath/virtual-supermarket/releases/latest/download/my-supermarket.apk (4.1 MB, Android 7+, opens the live site; camera permission for AR Camera mode)
- iOS: https://github.com/tgopinath/MySupermarket-iOS (SwiftUI WKWebView shell; Simulator screenshots, no TestFlight; AR uses Camera mode)
- Repo: https://github.com/tgopinath/virtual-supermarket
- Stack: React 19, TypeScript, Three.js via React Three Fiber + drei, @react-three/xr (WebXR), Zustand, Tailwind 4, IndexedDB (idb-keyval), Web Audio + Speech Synthesis, Vitest (21 engine tests). Native looks via the Kolam M3 kit (Android app) and Kolam iOS kit (iPhone app) on the hub screens; the 3D store stays full-screen.
- Status: live, v0.1 web + v1.0.0 phone shells. All products are procedural low-poly models (no third-party 3D assets, images or music). VR and WebXR AR not yet tried on real hardware. Own playful look (Baloo 2), not on Kolam.
- Assets: prototype/mobile.html, prototype/shots/{welcome,modes,levels,progress,entrance,store}.jpg, prototype/shots/web.jpg (1440x900, inside the 3D store), prototype/icon.png. Re-shoot: node tools/shots.mjs
