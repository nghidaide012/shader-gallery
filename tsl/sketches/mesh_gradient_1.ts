// @ts-nocheck
import { turbulence } from "@/tsl/noise/turbulence";
import { grainTexturePattern } from "@/tsl/patterns/grain_texture_pattern";
import { tanh } from "@/tsl/utils/color/tonemapping";
import { screenAspectUV } from "@/tsl/utils/function";
import { Color, Vector2 } from "three/webgpu";
import { Fn, screenSize, uniformArray, vec3, int, time, div, max, cos, Loop, PI, sin, vec2, length, float, pow, log, rotate } from "three/tsl";

//array of colors
const colors = uniformArray([new Color('#eee9df'), new Color('#ffb162'), new Color('#0870f0'), new Color('#9bc8f9')])

const colorCount = int(4)

const controlPoints = uniformArray([
  new Vector2(-0.8, -0.6),
  new Vector2(0.2, 0.7),
  new Vector2(0.9, -0.3),
  new Vector2(-0.4, 0.5),
  new Vector2(0.6, -0.8),
])
const meshGradient1 = Fn(() => {

    const _uv = screenAspectUV(screenSize).mul(2.0)
    const uv0 = screenAspectUV(screenSize)

    const _time = time.mul(0.1)

    //domain warping uv
    const uvR = _uv

    const finalColor = vec3(0.0)
    const totalWeight = float(0.0)

    //loop through all colors

    Loop({start: 0, end: colorCount}, ({i}) => {

        //base angle for this color spot

        const pos = controlPoints.element(i).toVar()

        pos.x.addAssign(sin(_time.mul(i.mul(0.75))))
        pos.y.addAssign(cos(_time.mul(2)))

        //distance from current fragment to the color spot
        const dist = length(uvR.sub(pos))
        dist.assign((pow(dist, 4.2)))

        //weight base on distance
        const weight = div(1, max(0.0, dist))


        const _c = colors.element(i)

        finalColor.addAssign(_c.mul(weight))
        totalWeight.addAssign(weight)
    })

    //tonemap
    finalColor.assign(tanh(finalColor.mul(2)))
    finalColor.mulAssign(finalColor)

    //grain
    const grain = grainTexturePattern(uv0).mul(0.1)
    finalColor.addAssign(grain)


    finalColor.divAssign(totalWeight)

    return finalColor
})

export default meshGradient1