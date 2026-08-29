"""Safely export the supplied Blender glasses to a web GLB and preview PNG."""

from pathlib import Path
import os

import bpy


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "visor-source"
OUT = ROOT / "public" / "models"
OUT.mkdir(parents=True, exist_ok=True)


def relink_images() -> None:
    for image in bpy.data.images:
        raw = str(image.filepath or "").replace("\\", "/")
        name = Path(raw).name or image.name.split(".", 1)[0]
        candidates = [
            SOURCE / "textures" / name,
            SOURCE / "textures" / "glasses2.png" if "glasses" in name.lower() else None,
            SOURCE / "textures" / "LOGO1.png" if "logo" in name.lower() else None,
        ]
        for candidate in candidates:
            if candidate and candidate.exists():
                image.filepath = str(candidate)
                image.reload()
                break


relink_images()

mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if not mesh_objects:
    raise RuntimeError("The supplied Blender file contains no mesh objects")

bpy.ops.object.select_all(action="DESELECT")
for obj in mesh_objects:
    obj.hide_viewport = False
    obj.hide_render = False
    obj.select_set(True)
bpy.context.view_layer.objects.active = mesh_objects[0]

coords = []
for obj in mesh_objects:
    coords.extend(obj.matrix_world @ corner for corner in obj.bound_box)
mins = tuple(min(point[i] for point in coords) for i in range(3))
maxs = tuple(max(point[i] for point in coords) for i in range(3))
print(f"PIT_VIPER_BOUNDS min={mins} max={maxs} meshes={len(mesh_objects)}")

glb_path = OUT / "pit-viper.glb"
bpy.ops.export_scene.gltf(
    filepath=str(glb_path),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_cameras=False,
    export_lights=False,
    export_texcoords=True,
    export_normals=True,
    export_materials="EXPORT",
)

scene = bpy.context.scene
if scene.camera:
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 540
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(OUT / "pit-viper-preview.png")
    scene.render.film_transparent = True
    bpy.ops.render.render(write_still=True)

print(f"Exported {glb_path} ({os.path.getsize(glb_path)} bytes)")
