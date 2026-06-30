// @ts-nocheck
import {
  abs,
  add,
  cos,
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

const singularity = Fn(
  ([
    _scalar = float(1.5),
    _raymarchIterations = 80,
    _yOffset = float(1.0),
    _xOffset = float(0.0),
    _initialDistance = float(3.5),
    _maxDistance = float(9),
    _distortionMultiplier = float(0.02),
    _depthMultiplier1 = float(0.25),
    _timeMultiplier1 = float(2.5),
    _frequencyReduction = float(0.25),
    _baseDistance = float(0.01),
    _distanceScale = float(0.05),
    _distanceOffset = float(0.5),
    _colorOffsets = vec4(4, 2, 1, 3),
    _colorShift = float(1.2),
    _normalizationDivisor = float(2000),
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

      // Inner loop: while _distance < 9
      Loop(_distance.lessThan(_maxDistance), () => {
        // Gyroid-based domain warping (triply periodic minimal surface)
        // Creates organic, lattice-like distortion patterns
        const _d = _depthMultiplier1.add(0)
        const scaled = p.mul(_distance).add(vec3(_depth.mul(_d), time.mul(_timeMultiplier1), 0))
        const gyroidField = sin(scaled.x)
          .mul(cos(scaled.y))
          .add(sin(scaled.y).mul(cos(scaled.z)))
          .add(sin(scaled.z).mul(cos(scaled.x)))
        p.addAssign(vec3(gyroidField).mul(i.mul(_distortionMultiplier)).div(_distance))

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
      const _s = _scalar.add(sin(time.mul(0.5)))
      finalColor.addAssign(sin(_depth.add(_s).add(_colorOffsets)).add(_colorShift).div(_distance))
    })
    finalColor.assign(tanh(finalColor.div(_normalizationDivisor)))

    // Return the final color to be displayed
    return finalColor
  },
)

export default singularity;