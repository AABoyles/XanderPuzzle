// Side-effect imports for Babylon.js.
//
// Importing from deep module paths (instead of the '@babylonjs/core' root) keeps unused engine features out of the
// bundle, but it also drops the registrations the root index performed as a side effect. Each import below restores
// one feature the game relies on. Import this file first from main.ts. When you start using a new Babylon feature and
// it fails at runtime with "X needs to be imported before", add the module here with a comment saying why.

// scene.collisionsEnabled, mesh.checkCollisions and mesh.moveWithCollisions (player, crates, doors).
import '@babylonjs/core/Collisions/collisionCoordinator';
// scene.pickWithRay and scene.createPickingRay (lever interaction, ground checks).
import '@babylonjs/core/Culling/ray';
// mesh.enableEdgesRendering (chamber outlines, crates, the draft skin).
import '@babylonjs/core/Rendering/edgesRenderer';
// Scene component that renders effect layers: GlowLayer.
import '@babylonjs/core/Layers/effectLayerSceneComponent';
// Scene component that renders shadow maps: ShadowGenerator (monolith skin).
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
// Scene component that updates and renders particle systems (space backdrop speed streaks).
import '@babylonjs/core/Particles/particleSystemComponent';
// engine.updateDynamicTexture, used by every DynamicTexture the skins paint.
import '@babylonjs/core/Engines/Extensions/engine.dynamicTexture';
// Render target and multi-render support used by the glow layer and shadow maps.
import '@babylonjs/core/Engines/Extensions/engine.renderTarget';
import '@babylonjs/core/Engines/Extensions/engine.renderTargetCube';
// Uniform buffers, used by the materials and the glow layer's post-processes.
import '@babylonjs/core/Engines/Extensions/engine.uniformBuffer';
