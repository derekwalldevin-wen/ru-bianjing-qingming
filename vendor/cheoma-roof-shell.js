// Adapted from midagedev/cheoma, MIT, copyright 2026 midagedev.
// Removed project-specific imports; retained normal-offset underside construction.
const N_EPS = 1e-8;

/**
 * Unit exterior normal at vertex i. Degenerate (zero-length) normals — which
 * appear at some roof-mesh poles/corners after computeVertexNormals — must not
 * leave the underside un-offset: that parks a gaepan vertex on the outer tile
 * and z-fights under any camera / assembly motion.
 */
function exteriorUnitNormal(nrm, i) {
  let nx = nrm.getX(i);
  let ny = nrm.getY(i);
  let nz = nrm.getZ(i);
  let len = Math.hypot(nx, ny, nz);
  if (len < N_EPS) {
    // Fall back to world-up so we still sink below the outer skin.
    return { nx: 0, ny: 1, nz: 0 };
  }
  nx /= len;
  ny /= len;
  nz /= len;
  // Face winding can leave some slopes with ny < 0 (paljak side/rear); flip so
  // we always step toward the interior void (below the outer tile).
  if (ny < 0) return { nx: -nx, ny: -ny, nz: -nz };
  return { nx, ny, nz };
}

/**
 * Offset a surface along its vertex normals to form the structural underside
 * (개판). Returns a new geometry (caller owns it). Winding is flipped so
 * FrontSide faces the interior / eave void.
 *
 * Every vertex is displaced by exactly `thickness` along a unit exterior normal
 * (with a safe fallback for degenerates). Callers may assert same-index distance
 * ≈ thickness to guard against coplanar outer/gaepan.
 */
export function makeRoofUndersideGeometry(sourceGeo, thickness = 0.14) {
  const geo = sourceGeo.clone();
  // Always rebuild normals from the clone so we do not inherit a half-updated
  // attribute from a previous shell pass on a shared source.
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const { nx, ny, nz } = exteriorUnitNormal(nrm, i);
    pos.setXYZ(
      i,
      pos.getX(i) - nx * thickness,
      pos.getY(i) - ny * thickness,
      pos.getZ(i) - nz * thickness,
    );
  }
  const idx = geo.index;
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      const b = idx.getX(i + 1);
      const c = idx.getX(i + 2);
      idx.setX(i + 1, c);
      idx.setX(i + 2, b);
    }
  } else {
    const swapAttr = (attr) => {
      if (!attr) return;
      const item = attr.itemSize;
      const arr = attr.array;
      for (let t = 0; t + 2 < attr.count; t += 3) {
        for (let k = 0; k < item; k++) {
          const i1 = (t + 1) * item + k;
          const i2 = (t + 2) * item + k;
          const tmp = arr[i1];
          arr[i1] = arr[i2];
          arr[i2] = tmp;
        }
      }
      attr.needsUpdate = true;
    };
    swapAttr(pos);
    swapAttr(geo.attributes.uv);
    // Drop inherited normals; recompute after winding flip.
  }
  // Normals after offset + flip must be rebuilt; do not keep the pre-offset attr.
  geo.deleteAttribute('normal');
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

