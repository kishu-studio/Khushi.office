import { useFrame, useThree } from '@react-three/fiber'

// ?stats: exposes renderer numbers on window.__gl for the performance audit.
export default function DrawCallProbe() {
  const { gl } = useThree()
  useFrame(() => {
    const r = gl.info.render
    window.__gl = { calls: r.calls, triangles: r.triangles, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures }
  })
  return null
}
