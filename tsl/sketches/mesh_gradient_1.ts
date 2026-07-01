/**
 * @license Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)
 *
 * This shader is licensed under CC BY-NC-SA 4.0. You are free to:
 * - Share and adapt this work
 * - Use modified versions commercially
 *
 * Under these conditions:
 * - Attribution: Credit Ben McCormick (phobon) and link to this project
 * - NonCommercial: Don't sell the original, unmodified sketch
 * - ShareAlike: Distribute derivatives under the same license
 */

// @ts-nocheck
import {
  cos,
  div,
  Fn,
  float,
  int,
  Loop,
  length,
  log,
  max,
  oneMinus,
  pow,
  rotate,
  screenSize,
  sin,
  time,
  uniform,
  uniformArray,
  vec3,
} from 'three/tsl'
import { Color, Vector2 } from 'three/webgpu'
import { simplexNoise3d } from '@/tsl/noise/simplex_noise_3d'
import { grainTexturePattern } from '@/tsl/patterns/grain_texture_pattern'
import { turbulence } from '@/tsl/noise/turbulence'
import { tanh } from '@/tsl/utils/color/tonemapping'
import { screenAspectUV } from '@/tsl/utils/function'

const colors = uniformArray([
  new Color('#cdb4db'),
  new Color('#ffc8dd'),
  new Color('#ffafcc'),
  new Color('#bde0fe'),
  new Color('#a2d2ff'),
])
const colorsCount = int(5)

const controlPoints = uniformArray([
  new Vector2(-0.8, -0.6),
  new Vector2(0.2, 0.7),
  new Vector2(0.9, -0.3),
  new Vector2(-0.4, 0.5),
  new Vector2(0.6, -0.8),
])

const weights = uniformArray([1, 1, 1, 1, 1, 1, 1])

const distortionFactor = uniform(0.8)
const vortexFactor = uniform(0.3)

const mesh_gradient_1 = Fn(() => {
  const _uv = screenAspectUV(screenSize).toVar()
  const uv0 = screenAspectUV(screenSize).toVar()

  _uv.mulAssign(4)

  const _time = time.mul(0.1)

  // Calculate distance from center and create a smooth falloff - this creates a circular mask that's strongest at the edges
  const radius = length(uv0)
  const center = oneMinus(radius) // Inverted - strongest at center

  // Apply coordinate distortion based on distance from center
  // The distortion creates a warping effect that's stronger near the center
  const _d = float(distortionFactor)
  Loop({ start: 1, end: 5, type: 'float', condition: '<=' }, ({ i }) => {
    const strength = _d.div(i)

    // Use noise for more organic, subtle distortion
    const noiseX = simplexNoise3d(vec3(_uv, _time.mul(0.1).add(i.mul(100))))
    const noiseY = simplexNoise3d(vec3(_uv, _time.mul(0.1).add(i.mul(200))))

    _uv.x.addAssign(strength.mul(noiseX).mul(0.3))
    _uv.y.addAssign(strength.mul(noiseY).mul(0.3))
  })

  // Calculate rotation angle based on distance from center
  // Creates a vortex that's more dramatic at the edges
  const uvR = _uv
  const angle = log(length(uvR)).mul(vortexFactor)
  uvR.assign(rotate(uvR, angle))

  const finalColor = vec3(0).toVar()
  const totalWeight = float(0).toVar()

  // Loop through all color spots and blend them together
  Loop({ start: 0, end: colorsCount, type: 'float' }, ({ i }) => {
    const pos = controlPoints.element(i).toVar()

    // Animate the position
    pos.x.addAssign(sin(_time.mul(i.mul(0.75))))
    pos.y.addAssign(cos(_time.mul(2)))

    const _c = colors.element(i)

    // Calculate distance from current fragment to this color spot
    const dist = length(uvR.sub(pos))

    // Apply power function to create sharper falloff. This will create those sharper region edges that make mesh gradients so dramatic
    dist.assign(pow(dist, 4.2))

    // Calculate weight based on distance - closer spots have higher weight
    const weight = div(1, max(0, dist))

    // Accumulate color and total weight
    finalColor.addAssign(_c.mul(weight.mul(weights.element(i))))
    totalWeight.addAssign(weight)
  })

  // Normalize the color
  finalColor.divAssign(totalWeight)

  // Tonemap for more interesting output
  finalColor.assign(tanh(finalColor.mul(1.5)))
  finalColor.mulAssign(finalColor)

  // Add grain
  const _grain = grainTexturePattern(uv0).mul(0.1)
  finalColor.addAssign(_grain)

  return finalColor
})

export default mesh_gradient_1