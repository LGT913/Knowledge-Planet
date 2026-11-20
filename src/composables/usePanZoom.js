import { reactive, ref, onMounted, onUnmounted } from 'vue';

const MIN_SCALE = 0.6;
const MAX_SCALE = 2.2;
const DRAG_THRESHOLD = 6; // 位移小于该值视为点击，避免拖拽后误跳转

export function usePanZoom(containerRef, isMobile) {
  const state = reactive({ x: 0, y: 0, scale: 1 });
  const isDragging = ref(false);

  let pointerId = null;
  let lastX = 0;
  let lastY = 0;
  let moved = 0;
  let rafId = 0;
  let pendingEvent = null;

  const clamp = (v) => Math.min(Math.max(v, MIN_SCALE), MAX_SCALE);

  // 以指针位置为锚点缩放，rAF 合并同一帧内的多次滚轮事件
  const applyZoom = () => {
    rafId = 0;
    const e = pendingEvent;
    pendingEvent = null;
    if (!e || !containerRef.value) return;

    const rect = containerRef.value.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const next = clamp(state.scale * (e.deltaY > 0 ? 0.92 : 1.08));
    if (next === state.scale) return;

    const ratio = next / state.scale;
    state.x = px - (px - state.x) * ratio;
    state.y = py - (py - state.y) * ratio;
    state.scale = next;
  };

  const onWheel = (e) => {
    if (isMobile.value) return;
    e.preventDefault(); // 必须在节流外层调用，否则部分滚轮事件会漏给页面
    pendingEvent = e;
    if (!rafId) rafId = requestAnimationFrame(applyZoom);
  };

  const onPointerDown = (e) => {
    if (isMobile.value || e.button !== 0) return;
    pointerId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    moved = 0;
    isDragging.value = true;
  };

  const onPointerMove = (e) => {
    if (!isDragging.value || e.pointerId !== pointerId) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    state.x += dx;
    state.y += dy;
  };

  const onPointerUp = (e) => {
    if (e.pointerId !== pointerId) return;
    isDragging.value = false;
    pointerId = null;
  };

  const isClick = () => moved < DRAG_THRESHOLD;

  onMounted(() => {
    const el = containerRef.value;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  });

  onUnmounted(() => {
    const el = containerRef.value;
    if (el) el.removeEventListener('wheel', onWheel);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    if (rafId) cancelAnimationFrame(rafId);
  });

  return { state, isDragging, onPointerDown, isClick };
}
