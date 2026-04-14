// DS Export — Figma plugin
// Traverses the selected frame and sends a pruned layer tree to the UI for clipboard copy.
// Developer pastes the result as figma-export.json in the project root, then runs /ds-figma.
//
// Pruning rules (keeps output small enough for LLM context):
//   - INSTANCE / COMPONENT nodes are kept but NOT recursed into (internals are noise)
//   - Pure graphic nodes (VECTOR, ELLIPSE, etc.) are kept as leaf nodes only
//   - Invisible nodes are skipped entirely
//   - Depth is capped at 12 levels
//   - Text content is truncated to 120 chars

figma.showUI(__html__, { width: 320, height: 140 });

// ─── Helpers ────────────────────────────────────────────────────────────────

function rgbToHex(r, g, b) {
  const h = v => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function getSolidFill(node) {
  if (!('fills' in node) || !Array.isArray(node.fills)) return null;
  const fill = node.fills.find(f => f.visible !== false && f.type === 'SOLID');
  if (!fill) return null;
  return rgbToHex(fill.color.r, fill.color.g, fill.color.b);
}

// Node types that are pure graphics — keep as leaf, never recurse
const GRAPHIC_TYPES = new Set(['VECTOR', 'STAR', 'LINE', 'ELLIPSE', 'POLYGON', 'BOOLEAN_OPERATION']);

// ─── Tree traversal ──────────────────────────────────────────────────────────

function traverseNode(node, depth) {
  if (depth > 12) return null;

  // Skip invisible nodes
  if ('visible' in node && node.visible === false) return null;

  const out = { name: node.name, type: node.type };

  // Layout direction (only when meaningful)
  if ('layoutMode' in node && node.layoutMode && node.layoutMode !== 'NONE') {
    out.layout = node.layoutMode;
  }

  // Size
  if ('width'  in node) out.width  = Math.round(node.width);
  if ('height' in node) out.height = Math.round(node.height);

  // Auto-layout gap
  if ('itemSpacing' in node && out.layout) {
    out.spacing = node.itemSpacing;
  }

  // Padding
  if ('paddingTop' in node) {
    const p = {
      top:    node.paddingTop    || 0,
      right:  node.paddingRight  || 0,
      bottom: node.paddingBottom || 0,
      left:   node.paddingLeft   || 0,
    };
    if (p.top || p.right || p.bottom || p.left) out.padding = p;
  }

  // Solid fill color
  const fill = getSolidFill(node);
  if (fill) out.fill = fill;

  // Text properties
  if (node.type === 'TEXT') {
    const fn = node.fontName;
    if (fn && fn !== figma.mixed) out.fontFamily = fn.family;
    const fs = node.fontSize;
    if (typeof fs === 'number') out.fontSize = fs;
    if (node.characters) out.text = node.characters.slice(0, 120);
    return out; // text nodes have no children worth traversing
  }

  // INSTANCE / COMPONENT: capture identity but skip internals
  if (node.type === 'INSTANCE' || node.type === 'COMPONENT') {
    return out;
  }

  // Pure graphics: leaf node, no children
  if (GRAPHIC_TYPES.has(node.type)) {
    return out;
  }

  // Recurse into layout/group/frame children
  if ('children' in node && node.children.length > 0) {
    const children = node.children
      .map(child => traverseNode(child, depth + 1))
      .filter(Boolean);
    if (children.length > 0) out.children = children;
  }

  return out;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

const selection = figma.currentPage.selection;

if (selection.length === 0) {
  figma.ui.postMessage({ type: 'error', message: 'Select a frame or component first.' });
} else {
  const json = JSON.stringify(traverseNode(selection[0], 0), null, 2);
  figma.ui.postMessage({ type: 'ready', json });
}

figma.ui.onmessage = msg => {
  if (msg.type === 'done') {
    figma.notify('✅ Copied! Paste as figma-export.json in your project root, then run /ds-figma.');
    figma.closePlugin();
  } else if (msg.type === 'clipboard-error') {
    figma.notify('⚠️ Clipboard blocked — copy the JSON from the plugin window manually.');
    // keep plugin open so the user can copy from the textarea
  } else if (msg.type === 'resize') {
    figma.ui.resize(320, msg.height);
  } else if (msg.type === 'error') {
    figma.notify(`❌ ${msg.message}`);
    figma.closePlugin();
  }
};
