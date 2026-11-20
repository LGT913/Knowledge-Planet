#!/bin/bash
PROMPT='【优化模式】
目标：修复拖拽缩放BUG、增加触摸双指缩放、wheel事件节流、组件销毁清理监听防内存泄漏、缩放锚点跟随鼠标、resize动态检测移动端、grab光标切换、SVG渲染优化。
只输出改动片段，标注【文件路径】+改动位置，禁止输出完整全部代码，不要多余解释。
'

PANZOOM=$(cat src/composables/usePanZoom.js)
STARMAP=$(cat src/components/StarMap.vue)
INDEX=$(cat src/pages/index.astro)

INPUT="${PROMPT}

// src/composables/usePanZoom.js
${PANZOOM}

---
<!-- src/components/StarMap.vue -->
${STARMAP}

---
src/pages/index.astro
${INDEX}
"

echo "$INPUT" | gemini run --model gemini-3.8-flash
