"""Lightmap bake for the portfolio scenes (Blender 5.3, Cycles).

  blender -b --factory-startup --python bake/bake.py -- villa [--res 4096] [--samples 256] [--group main] [--dry]

Reads   bake/in/<scene>.glb + <scene>.lights.json   (written by the site with ?export)
Writes  bake/out/<scene>.glb                         geometry with a second UV set ("lightmap")
        bake/out/<scene>_<group>.png                 sRGB-encoded light, value = light * ENC

Groups: "main" (everything normal-sized) and "site" (ground, road: large, baked at half size).
One group is one bake, so the job can stop between bakes and resume with --group.
"""
import bpy, json, sys, os, math, time, zlib, struct
import numpy as np
from mathutils import Vector

ENC = 0.5  # stored = light * ENC, so values up to 2.0 survive 8-bit; the site multiplies back
ROOT = os.path.dirname(os.path.abspath(__file__))
HDRI = {
    'villa': ('kloofendal_43d_clear_puresky_1k.hdr', 1.0),
    'studio': ('photo_studio_loft_hall_1k.hdr', 0.35),
}

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
scene_name = argv[0]
opt = lambda k, d: type(d)(argv[argv.index(k) + 1]) if k in argv else d
RES = opt('--res', 4096)
SAMPLES = opt('--samples', 256)
ONLY = opt('--group', '')
DRY = '--dry' in argv
os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)


def log(*a):
    print('[bake]', time.strftime('%H:%M:%S'), *a, flush=True)


def three_to_blender(v):  # three.js is Y-up, Blender Z-up
    x, y, z = v
    return (x, -z, y)


# ---------------------------------------------------------------- scene
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'in', f'{scene_name}.glb'), merge_vertices=False)
objs = [o for o in sc.objects if o.type == 'MESH']
log(f'{len(objs)} meshes imported')

for o in objs:
    if o.get('transparent'):
        o.hide_render = True  # glass: let light through, keep it real-time on the site
    em = o.get('emission') or 0
    if em:
        for slot in o.material_slots:
            bsdf = slot.material.node_tree.nodes.get('Principled BSDF')
            if bsdf:
                bsdf.inputs['Emission Color'].default_value = bsdf.inputs['Base Color'].default_value
                bsdf.inputs['Emission Strength'].default_value = em

# lights from the site, converted to Blender units (tuned by eye against the live scene)
for i, L in enumerate(json.load(open(os.path.join(ROOT, 'in', f'{scene_name}.lights.json')))):
    col = tuple(int(L['color'][k:k + 2], 16) / 255 for k in (0, 2, 4))
    pos = three_to_blender(L['position'])
    if L['type'] == 'DirectionalLight':
        d = bpy.data.lights.new(f'sun{i}', 'SUN')
        d.energy = L['intensity'] * 1.6
        d.angle = math.radians(1.5)
    elif L['type'] == 'PointLight':
        d = bpy.data.lights.new(f'pt{i}', 'POINT')
        d.energy = L['intensity'] * 4 * math.pi * 1.2
        d.shadow_soft_size = 0.25
    else:
        continue  # hemisphere light: the sky does this job in Cycles
    d.color = col
    ob = bpy.data.objects.new(d.name, d)
    sc.collection.objects.link(ob)
    ob.location = pos
    if d.type == 'SUN':  # aim at the origin
        ob.rotation_euler = (-Vector(pos)).to_track_quat('-Z', 'Y').to_euler()

world = bpy.data.worlds.new('sky')
sc.world = world
world.use_nodes = True
nt = world.node_tree
env = nt.nodes.new('ShaderNodeTexEnvironment')
env.image = bpy.data.images.load(os.path.join(ROOT, '..', 'public', 'hdri', HDRI[scene_name][0]))
nt.links.new(env.outputs['Color'], nt.nodes['Background'].inputs['Color'])
nt.nodes['Background'].inputs['Strength'].default_value = HDRI[scene_name][1]

# ---------------------------------------------------------------- lightmap UVs
groups = {}
for o in objs:
    if not o.hide_render:
        groups.setdefault(o.get('group') or 'main', []).append(o)


def unwrap(group_objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in group_objs:
        uv = o.data.uv_layers.get('lightmap') or o.data.uv_layers.new(name='lightmap')
        o.data.uv_layers.active = uv
        o.select_set(True)
    bpy.context.view_layer.objects.active = group_objs[0]
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.002, area_weight=1.0, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(rotate=True, scale=True, margin_method='FRACTION', margin=0.002)
    bpy.ops.object.mode_set(mode='OBJECT')


for g, lst in groups.items():
    t = time.time()
    unwrap(lst)
    log(f'unwrapped {g}: {len(lst)} meshes in {time.time() - t:.1f}s')

# ---------------------------------------------------------------- bake


def write_png(path, rgb):
    h, w, _ = rgb.shape
    raw = b''.join(b'\x00' + rgb[y].tobytes() for y in range(h))
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 6)) + chunk(b'IEND', b''))


def encode(px):
    """float RGBA (bottom-up) -> 8-bit sRGB RGB (top-down), with a light blur inside the charts."""
    a = px[..., 3:4]
    c = px[..., :3] * a
    k = np.ones(3, np.float32)
    blur = lambda m: sum(np.roll(np.roll(m, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1))
    num, den = blur(c), blur(a)
    c = np.where(den > 0, num / np.maximum(den, 1e-6), 0)
    v = np.clip(c * ENC, 0, 1)
    s = np.where(v <= 0.0031308, v * 12.92, 1.055 * np.power(v, 1 / 2.4) - 0.055)
    return (np.flipud(s) * 255 + 0.5).astype(np.uint8)


def bake(group, lst):
    res = RES if group == 'main' else RES // 2
    img = bpy.data.images.new(f'{scene_name}_{group}', res, res, alpha=True, float_buffer=True)
    for o in lst:
        for slot in o.material_slots:
            m = slot.material
            n = m.node_tree.nodes
            tex = n.get('LM_TEX') or n.new('ShaderNodeTexImage')
            tex.name = 'LM_TEX'
            tex.image = img
            uvn = n.get('LM_UV') or n.new('ShaderNodeUVMap')
            uvn.name = 'LM_UV'
            uvn.uv_map = 'lightmap'
            m.node_tree.links.new(uvn.outputs['UV'], tex.inputs['Vector'])
            n.active = tex
    bpy.ops.object.select_all(action='DESELECT')
    for o in lst:
        o.select_set(True)
    bpy.context.view_layer.objects.active = lst[0]
    t = time.time()
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, margin=6, use_clear=True)
    log(f'baked {group} {res}px in {time.time() - t:.0f}s')
    px = np.array(img.pixels[:], np.float32).reshape(res, res, 4)
    write_png(os.path.join(ROOT, 'out', f'{scene_name}_{group}.png'), encode(px))
    # material links to the lightmap image must not travel with the export
    for o in lst:
        for slot in o.material_slots:
            for k in ('LM_TEX', 'LM_UV'):
                node = slot.material.node_tree.nodes.get(k)
                node and slot.material.node_tree.nodes.remove(node)


sc.render.engine = 'CYCLES'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = False
sc.render.threads_mode = 'FIXED'
sc.render.threads = 6
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type != 'CPU'  # GPU only, the CPU stays free for the user
    sc.cycles.device = 'GPU'
    log('device: Metal GPU', [d.name for d in prefs.devices])
except Exception as e:  # CPU fallback, capped at 6 threads above
    log('device: CPU', e)

if not DRY:
    for g, lst in groups.items():
        if ONLY and g != ONLY:
            continue
        bake(g, lst)

# geometry with both UV sets, names kept (m0, m1, ...) so the site can match them
bpy.ops.object.select_all(action='DESELECT')
for o in objs:
    o.hide_render = False
    o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=os.path.join(ROOT, 'out', f'{scene_name}.glb'),
    use_selection=True, export_format='GLB', export_materials='NONE',
    export_texcoords=True, export_normals=True, export_extras=True,
    export_all_vertex_colors=False, export_lights=False, export_cameras=False,
)
log('done', 'dry run' if DRY else '')
