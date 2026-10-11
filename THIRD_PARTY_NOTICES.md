# Third-party software

Three.js r180 (0.180.0), MIT. Includes core, WebGL renderer, OrbitControls, BufferGeometryUtils, Reflector and GLTFLoader. Copyright 2010-2025 Three.js Authors. Full license: vendor/LICENSE. Source: https://github.com/mrdoob/three.js/tree/r180

Cheoma, MIT, Copyright (c) 2026 midagedev. Source snapshot reviewed 2026-10-10, tree 53b7f56b9c62cc8ff21bb87d680c22714f35ac73. Full license: vendor/CHEOMA-LICENSE. Source: https://github.com/midagedev/cheoma

- vendor/cheoma-heading.js: unchanged camera heading/direction controller from src/camera/heading.js, used for guided camera look direction.
- vendor/cheoma-roof-shell.js: extracted exterior-normal offset and makeRoofUndersideGeometry from src/layout/roof-shell.js; removed project-specific dependencies and changed default thickness to 0.14. Used to give roof undersides physical separation.

The Chinese river district, timber bridge, boats, people, storytelling, interface and source-image mapping were authored for this project. Cheoma's Korean village layouts and architecture presets were not reused.

Image material: original-painting details and artistic reconstructions supplied by the project owner. Reconstructions and this 3D environment are artistic interpretations, not measured historical reconstructions. Assets are not relicensed under the software licenses above.

Experience research (no code copied): https://xianxie6.github.io/qingming-riverside/ and https://github.com/andyhuo520/tang-changan

Water reference: Three.js r180 Water2 (https://github.com/mrdoob/three.js/blob/r180/examples/jsm/objects/Water2.js) and the official Ocean example. vendor/Reflector.js is the unmodified r180 MIT component, covered by vendor/LICENSE. src/river.js uses that component with an original procedural river shader; Water2 refraction code and third-party water textures are not included.

GLTFLoader.js is the official r180 loader, with its BufferGeometryUtils import changed to the local vendored path. Blender historical-refinement geometry and material textures are original project assets; source .blend files and reference notes are retained in the project.

UI art direction (2026-10-11): Qingming-inspired silk mounts and blue-green landscape palette. The UI concept and assets/ui/qinglv-mountains.png were generated with the built-in image generation tool for this project. The cover combines the owner-provided original painting crop with that generated ornament; UI labels and controls are live HTML. This imagery is a contemporary artistic interpretation and is not an original Song painting.
