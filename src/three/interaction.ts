import type CameraControlsImpl from 'camera-controls'

// Small shared mutable state for pointer interactions that must not trigger React renders.
export const controlsRef: { current: CameraControlsImpl | null } = { current: null }

/** A press on a product that may turn into a drag once the pointer moves far enough. */
export const press: { current: { id: string; x: number; y: number } | null } = { current: null }

export const DRAG_THRESHOLD_PX = 10

export function setCameraEnabled(on: boolean) {
  if (controlsRef.current) controlsRef.current.enabled = on
}
