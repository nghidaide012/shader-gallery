// @ts-nocheck
import {
  abs,
  add,
  Fn,
  float,
  Loop,
  mul,
  normalize,
  screenCoordinate,
  screenSize,
  sin,
  time,
  vec3,
  vec4,
} from 'three/tsl'
import { tanh } from '@/tsl/utils/color/tonemapping'

const nebula = Fn(
  ([
    _scalar = 0,
    _raymarchIterations = 120,
    _yOffset = 1.0,
    _xOffset = 0,
    _initialDistance = 1.5,
    _maxDistance = 9,
    _distortionMultiplier = 0.02,
    _depthMultiplier1 = 0.25,
    _timeMultiplier1 = 0.0,
    _depthMultiplier2 = 0.15,
    _timeMultiplier2 = 0.0,
    _frequencyReduction = 0.25,
    _baseDistance = 0.01,
    _distanceScale = 0.05,
    _distanceOffset = 1,
    _colorOffsets = vec4(4, 2, 1, 3),
    _colorShift = 1.2,
    _normalizationDivisor = 2000,
  ]) => {
    // _uv = current pixel's screen coordinates
    const _uv = screenCoordinate

    // finalColor = accumulator for the final output color
    // Starts at black (0, 0, 0, 0)
    // We'll add color to this 120 times (once per raymarching step)
    const finalColor = vec4(0).toVar()

    const _depth = float(0).toVar()
    const _distance = float(0).toVar()
    const rayDirection = normalize(vec3(_uv.add(_uv), 0).sub(screenSize.xyy)).toVar()

    Loop({ start: 0, end: _raymarchIterations, type: 'float' }, ({ i }) => {
      const p = vec3(_depth.mul(rayDirection)).toVar()

      // This offsets the geometry so it's not centered at origin
      p.y.subAssign(_yOffset)
      p.x.subAssign(_xOffset)

      // Evaluate distance field (inner loop)
      // This is where the organic, fractal geometry is created
      // We apply sine waves at multiple scales to distort the position
      _distance.assign(_initialDistance)

      // Inner loop
      Loop(_distance.lessThan(_maxDistance), () => {
        // Sine-based domain warping
        p.addAssign(sin(p.zzy.mul(_distance).add(_depth.mul(0.15).sub(time.mul(0.1)))).div(_distance))
        p.addAssign(sin(p.zyy.mul(_distance).add(_depth.mul(0.1).sub(time.mul(0.0)))).div(_distance))
        p.addAssign(
          sin(p.yzx.mul(_distance).add(_depth.mul(0.15).sub(time.mul(0.0))))
            .div(_distance)
            .mul(1.2),
        )

        // Each iteration uses a smaller frequency (finer details)
        _distance.divAssign(_frequencyReduction)
      })

      // Calculate final distance metric
      // After distortion, we need to know: how close are we to the surface?
      _distance.assign(
        add(_baseDistance, mul(_distanceScale, abs(p.x.add(_distanceOffset)).add(abs(p.y.add(_distanceOffset))))),
      )

      // If _distance is small (close to geometry), we step slowly
      // If _distance is large (far from geometry), we step quickly
      // This is adaptive stepping: faster in empty space, slower near surfaces
      _depth.addAssign(_distance)

      // Accumulate color
      // Now we calculate how much color to add at this position
      finalColor.addAssign(sin(_depth.add(_scalar).add(_colorOffsets)).add(_colorShift).div(_distance))
    })

    // Tonemapping
    finalColor.assign(tanh(finalColor.div(_normalizationDivisor)))

    // Return the final color to be displayed
    return finalColor
  },
)

export default nebula;