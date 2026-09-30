/* Merge static Mesh descendants that share one material into one draw call.
   Call before cloning the root. Descendant transforms must stay static afterward. */
import {
  BufferGeometry,
  Float32BufferAttribute,
  Matrix3,
  Matrix4,
  Mesh,
  Vector3,
} from './vendor/three.module.js';

export function batchMeshesByMaterial(root, material) {
  if (!root?.isObject3D || !material || Array.isArray(material)) {
    throw new TypeError('Expected a Three.js Object3D root and one material.');
  }

  root.updateWorldMatrix(true, true);
  if (root.matrixWorld.determinant() === 0) {
    throw new Error('Cannot batch beneath a root with a non-invertible transform.');
  }
  const rootInverse = new Matrix4().copy(root.matrixWorld).invert();
  const parts = [];
  let vertexCount = 0;
  let hasUV = false;

  root.traverse((object) => {
    if (object === root || !object.isMesh || object.isInstancedMesh || object.material !== material) return;
    const source = object.geometry;
    if (!source?.isBufferGeometry || !source.getAttribute('position')) return;

    // toNonIndexed expands each triangle's indices so concatenation is direct.
    let geometry = source.index ? source.toNonIndexed() : source;
    let temporary = geometry !== source;
    if (!geometry.getAttribute('normal')) {
      if (!temporary) {
        geometry = geometry.clone();
        temporary = true;
      }
      geometry.computeVertexNormals();
    }
    const available = geometry.getAttribute('position').count;
    const start = Math.max(0, Math.min(available, Math.floor(source.drawRange.start)));
    const requested = Number.isFinite(source.drawRange.count) ? Math.floor(source.drawRange.count) : available;
    const count = Math.max(0, Math.floor(Math.min(requested, available - start) / 3) * 3);
    if (!count) {
      if (temporary) geometry.dispose();
      return;
    }

    const transform = new Matrix4().multiplyMatrices(rootInverse, object.matrixWorld);
    parts.push({ object, geometry, temporary, start, count, transform });
    vertexCount += count;
    hasUV ||= !!geometry.getAttribute('uv');
  });

  if (!parts.length) return null;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = hasUV ? new Float32Array(vertexCount * 2) : null;
  const point = new Vector3();
  const normal = new Vector3();
  const normalMatrix = new Matrix3();
  let cursor = 0;

  for (const part of parts) {
    const { geometry, transform, start, count } = part;
    const sourcePosition = geometry.getAttribute('position');
    const sourceNormal = geometry.getAttribute('normal');
    const sourceUV = geometry.getAttribute('uv');
    normalMatrix.getNormalMatrix(transform);
    const reversed = transform.determinant() < 0;

    for (let triangle = 0; triangle < count; triangle += 3) {
      for (let corner = 0; corner < 3; corner++) {
        // Mirrored transforms reverse winding; swap the last two corners.
        const sourceCorner = reversed && corner ? 3 - corner : corner;
        const index = start + triangle + sourceCorner;
        point.set(sourcePosition.getX(index), sourcePosition.getY(index), sourcePosition.getZ(index)).applyMatrix4(transform);
        normal.set(sourceNormal.getX(index), sourceNormal.getY(index), sourceNormal.getZ(index)).applyMatrix3(normalMatrix).normalize();
        const p = cursor * 3;
        positions[p] = point.x; positions[p + 1] = point.y; positions[p + 2] = point.z;
        normals[p] = normal.x; normals[p + 1] = normal.y; normals[p + 2] = normal.z;
        if (uvs && sourceUV) {
          const u = cursor * 2;
          uvs[u] = sourceUV.getX(index); uvs[u + 1] = sourceUV.getY(index);
        }
        cursor++;
      }
    }
  }

  const mergedGeometry = new BufferGeometry();
  mergedGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  mergedGeometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  if (uvs) mergedGeometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  mergedGeometry.computeBoundingSphere();
  const merged = new Mesh(mergedGeometry, material);
  merged.name = `batch:${material.name || material.uuid}`;
  merged.castShadow = parts.some(({ object }) => object.castShadow);
  merged.receiveShadow = parts.some(({ object }) => object.receiveShadow);

  // Keep source geometries alive: clones or other meshes may still share them.
  for (const { object, geometry, temporary } of parts) {
    object.removeFromParent();
    if (temporary) geometry.dispose();
  }
  root.add(merged);
  return merged;
}
