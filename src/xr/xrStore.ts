import { createXRStore } from '@react-three/xr'

// One XR store shared by the VR supermarket and the AR experience.
// Hands and controllers use the default ray/grab pointers, so product meshes receive
// regular R3F pointer events in VR exactly as they do with a mouse.
export const xrStore = createXRStore({
  emulate: false,
  offerSession: false,
  hand: { teleportPointer: true },
  controller: { teleportPointer: true },
  domOverlay: true,
  hitTest: true,
})

export type XRSupport = { vr: boolean; ar: boolean }

export async function detectXR(): Promise<XRSupport> {
  const xr = (navigator as Navigator & { xr?: XRSystem }).xr
  if (!xr) return { vr: false, ar: false }
  const [vr, ar] = await Promise.all([
    xr.isSessionSupported('immersive-vr').catch(() => false),
    xr.isSessionSupported('immersive-ar').catch(() => false),
  ])
  return { vr, ar }
}
