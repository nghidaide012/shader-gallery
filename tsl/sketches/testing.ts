// @ts-nocheck
import { abs, Fn, mod, oneMinus, screenSize, smoothstep, time, vec3 } from 'three/tsl'
import { fbm } from '@/tsl/noise/fbm'
import { screenAspectUV } from '@/tsl/utils/function/screen_aspect_uv'
import { sdSphere } from '@/tsl/utils/sdf/shapes'

/**
 * Genuary 1: One color, one shape.
 */
const genuary1 = Fn(() => {
  const uv0 = screenAspectUV(screenSize, 0).toVar()

  const _t = time.mul(0.05)

  const n = fbm(vec3(uv0, _t)).sub(0.5).toVar()

  uv0.assign(mod(uv0.mul(50), 1.0).sub(0.5))
  const p1 = sdSphere(uv0).mul(0.5).add(n).toVar()
  p1.assign(abs(p1))
  p1.assign(oneMinus(smoothstep(0.05, 0.06, p1)))

  const c = vec3(0.7529, 0.99607, 0.015686)

  const finalColor = c.mul(p1)
  return finalColor
})

export default genuary1
