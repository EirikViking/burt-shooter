"""Read original .blend without modifying it; record export losses."""
import bpy,os,json
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('docs/solid-fleet-20260908/01.blend'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
materials=[m for m in bpy.data.materials if m.users]
report={'file':'docs/solid-fleet-20260908/01.blend','meshes':[{'name':o.name,'vertices':len(o.data.vertices),'polygons':len(o.data.polygons),'uvLayers':len(o.data.uv_layers)} for o in meshes], 'images':[i.name for i in bpy.data.images], 'materials':[]}
for m in materials:
 p=m.node_tree.nodes.get('Principled BSDF') if m.use_nodes else None
 report['materials'].append({'name':m.name,'nodes':[n.bl_idname for n in m.node_tree.nodes] if m.use_nodes else [],'metallic':p.inputs['Metallic'].default_value if p else None,'roughness':p.inputs['Roughness'].default_value if p else None,'normalLinked':p.inputs['Normal'].is_linked if p else False})
open('docs/ship-art-v2/source-audit.json','w').write(json.dumps(report,indent=2))
