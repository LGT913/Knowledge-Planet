<template>
  <div ref="containerRef" class="shell">
    <!-- 全局宇宙微光氛围层（纯装饰、穿透点击、不干扰现有层级） -->
    <div class="universe-ambient-layer" aria-hidden="true">
      <div class="ambient-nebula-glow"></div>
      <div class="ambient-deep-starfield"></div>
      <div class="ambient-global-meteor"></div>
    </div>

    <header class="tabs" role="tablist" aria-label="视图切换">
      <button
        v-for="t in TABS"
        :key="t.key"
        role="tab"
        type="button"
        :aria-selected="view === t.key"
        :class="{ active: view === t.key }"
        @click="switchView(t.key)"
      >
        <span class="tab-mark">{{ t.key === 'star' ? '⌖' : '≋' }}</span>{{ t.label }}
      </button>
    </header>

    <!-- 第一屏：宇宙导航 -->
    <section class="stage-screen">
      <HudTitle />
      <div class="stage">
        <StarMap v-if="view === 'star'" :notes="notes" />
        <FateMap v-else :notes="notes" />
      </div>

      <!-- 底部向下指引 -->
      <button class="scroll-down-hint" type="button" @click="scrollToPortfolio" aria-label="探索作品集">
        <span class="hint-label">探索作品集</span>
        <span class="hint-arrow">⌄</span>
      </button>

      <!-- 仓库与联系方式：与右下角操作提示同一行，切换 Tab 时保持显示 -->
      <SocialLinks />
    </section>

    <!-- 第二屏：作品集展示层 -->
    <section id="portfolio" ref="portfolioRef" class="portfolio-screen">
      <button class="back-to-top" type="button" @click="scrollToTop" aria-label="返回星图">
        <span class="back-arrow">⌃</span>
        <span class="hint-label">返回星图</span>
      </button>

      <div class="portfolio-header">
        <div class="section-title">
          <span class="title-sub">PORTFOLIO &amp; PROJECTS</span>
          <h2>作品集与实战项目</h2>
        </div>
      </div>

      <!-- 居中单卡片作品集轮播 -->
      <div class="carousel-wrapper">
        <button
          class="carousel-btn prev-btn"
          type="button"
          aria-label="上一个作品"
          @click="prevProject"
        >
          ‹
        </button>

        <div
          class="carousel-stage"
          @pointerdown="onPointerDownCarousel"
          @pointerup="onPointerUpCarousel"
          @pointercancel="onPointerCancelCarousel"
        >
          <article
            v-for="(proj, idx) in PROJECTS"
            :key="proj.id"
            class="project-card carousel-slide"
            :class="{ active: idx === currentIndex }"
            :style="slideStyle(idx)"
            :aria-hidden="idx !== currentIndex"
            @click="idx !== currentIndex && goToProject(idx)"
          >
            <div class="media-container">
              <video
                v-if="proj.video"
                class="project-video"
                :src="proj.video"
                controls
                playsinline
                preload="metadata"
              ></video>
              <div v-else class="video-placeholder">
                <span class="ph-icon">▶</span>
                <span class="ph-text">演示录像准备中</span>
              </div>
            </div>
            <div class="project-info">
              <h3 class="proj-title">{{ proj.title }}</h3>
              <p class="proj-desc">{{ proj.desc }}</p>
              <div class="tech-stack">
                <span v-for="tech in proj.stack" :key="tech" class="tech-tag">{{ tech }}</span>
              </div>
              <div v-if="proj.demo || proj.repo" class="proj-links">
                <a v-if="proj.demo" :href="proj.demo" target="_blank" rel="noopener" class="link-btn primary">在线演示</a>
                <a v-if="proj.repo" :href="proj.repo" target="_blank" rel="noopener" class="link-btn">项目源码</a>
              </div>
            </div>
          </article>
        </div>

        <button
          class="carousel-btn next-btn"
          type="button"
          aria-label="下一个作品"
          @click="nextProject"
        >
          ›
        </button>
      </div>

      <!-- 底部圆点指示器 -->
      <div class="carousel-indicators">
        <button
          v-for="(proj, idx) in PROJECTS"
          :key="'dot-' + proj.id"
          type="button"
          class="indicator-dot"
          :class="{ active: currentIndex === idx }"
          :aria-label="`跳转至作品 ${idx + 1}`"
          @click="goToProject(idx)"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import StarMap from './StarMap.vue';
import FateMap from './FateMap.vue';
import SocialLinks from './SocialLinks.vue';
import HudTitle from './HudTitle.vue';

const props = defineProps({
  notes: {
    type: Array,
    default: () => [],
  },
});

const TABS = [
  { key: 'star', label: '星系航图' },
  { key: 'fate', label: '学习成长路线' },
];

const view = ref('star');
const containerRef = ref(null);
const portfolioRef = ref(null);

// 初始化时读取 URL 查询参数 view
onMounted(() => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'fate') {
      view.value = 'fate';
    }
  }
});

// 切换 Tab 时用 history.replaceState 写回地址栏，不触发页面跳转、不新增历史记录
const switchView = (key) => {
  view.value = key;
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.searchParams.set('view', key);
    window.history.replaceState(null, '', url.toString());
  }
};

const scrollToPortfolio = () => {
  portfolioRef.value?.scrollIntoView({ behavior: 'smooth' });
};

const scrollToTop = () => {
  containerRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
};

// 居中轮播状态与交互逻辑
const currentIndex = ref(0);

const prevProject = () => {
  currentIndex.value = (currentIndex.value - 1 + PROJECTS.length) % PROJECTS.length;
};

const nextProject = () => {
  currentIndex.value = (currentIndex.value + 1) % PROJECTS.length;
};

const goToProject = (idx) => {
  currentIndex.value = idx;
};

// 叠层轮播：按与当前项的距离计算平移、缩放、旋转与透明度
const slideStyle = (idx) => {
  const total = PROJECTS.length;
  let offset = idx - currentIndex.value;
  if (total > 2) {
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;
  }
  const abs = Math.abs(offset);
  if (abs === 0) {
    return {
      transform: 'translateX(0) scale(1) rotateY(0deg)',
      opacity: 1,
      zIndex: 5,
      filter: 'none',
    };
  }
  if (abs === 1) {
    return {
      transform: `translateX(${offset * 40}%) translateZ(-120px) scale(0.84) rotateY(${offset * -18}deg)`,
      opacity: 0.72,
      zIndex: 4,
      filter: 'blur(0.6px) brightness(0.86)',
    };
  }
  return {
    transform: `translateX(${Math.sign(offset) * 58}%) translateZ(-260px) scale(0.64) rotateY(${Math.sign(offset) * -26}deg)`,
    opacity: 0,
    zIndex: 1,
    filter: 'blur(3px) brightness(0.4)',
  };
};

// 左右滑动切换（pointerdown + pointerup，水平位移超过 50px 判定）
let pointerStartX = 0;
let pointerStartY = 0;
let isPointerTracking = false;

const onPointerDownCarousel = (e) => {
  pointerStartX = e.clientX;
  pointerStartY = e.clientY;
  isPointerTracking = true;
};

const onPointerUpCarousel = (e) => {
  if (!isPointerTracking) return;
  isPointerTracking = false;
  const deltaX = e.clientX - pointerStartX;
  const deltaY = e.clientY - pointerStartY;
  if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
    if (deltaX > 0) {
      prevProject();
    } else {
      nextProject();
    }
  }
};

const onPointerCancelCarousel = () => {
  isPointerTracking = false;
};

// 项目作品集数据（遵循真实情况，不放伪造链接）
const PROJECTS = [
  {
    id: 'blog-system',
    title: '博客系统：Spring Boot 全栈社区',
    desc: '前后端分离的个人博客，包含文章发布、JWT 登录鉴权、评论、Redis 缓存与管理后台，已从单体部署演进到容器化上线。',
    stack: ['Spring Boot', 'MyBatis-Plus', 'Redis', 'Vue 3'],
    video: '/videos/blog-demo.mp4',
    demo: '',
    repo: '',
  },
  {
    id: 'knowledge-planet',
    title: '知识星球静态学习站与宇宙导图',
    desc: '基于 Astro 5 与 Vue 3 岛屿架构构建的双重视图导航系统，集成星系航图与时间线成长路线，支持纯静态部署。',
    stack: ['Astro', 'Vue 3', 'SVG', 'TypeScript'],
    demo: '',
    repo: '',
  },
  {
    id: 'system-notes',
    title: '面试知识体系与系统设计研读',
    desc: '系统化梳理分布式高并发、系统架构与核心理论模块，形成多层级星系/星球索引文档库。',
    stack: ['Markdown', 'Shiki', 'Content Collections'],
    demo: '',
    repo: '',
  },
];
</script>

<style scoped>
.shell {
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  scrollbar-width: none; /* Firefox：隐藏右侧滚动条，保留滚动 */
  -ms-overflow-style: none;
  background: #05070f;
  color: #e8eefc;
}
.shell::-webkit-scrollbar { width: 0; height: 0; display: none; }

/* 全局宇宙微光氛围层 */
.universe-ambient-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.ambient-nebula-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 25%, rgba(18, 42, 80, 0.16) 0%, rgba(5, 7, 15, 0) 70%);
  animation: ambient-nebula-pulse 14s ease-in-out infinite;
  will-change: opacity, transform;
}

.ambient-deep-starfield {
  position: absolute;
  inset: -60px;
  background-image:
    radial-gradient(1px 1px at 120px 80px, rgba(235, 245, 255, 0.45), transparent),
    radial-gradient(1.2px 1.2px at 340px 420px, rgba(200, 225, 255, 0.4), transparent),
    radial-gradient(1px 1px at 780px 180px, rgba(255, 235, 200, 0.35), transparent),
    radial-gradient(1.4px 1.4px at 980px 620px, rgba(215, 235, 255, 0.45), transparent);
  background-size: 800px 800px;
  opacity: 0.45;
  animation: ambient-stars-drift 100s linear infinite;
  will-change: transform;
}

.ambient-global-meteor {
  position: absolute;
  top: 10%;
  left: 5%;
  width: 140px;
  height: 2px;
  pointer-events: none;
  opacity: 0;
  will-change: transform, opacity;
  animation: ambient-meteor-sweep 30s ease-in infinite;
  animation-delay: 14s;
}
.ambient-global-meteor::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(201, 184, 134, 0.35) 60%, rgba(255, 255, 255, 0.9) 100%);
  border-radius: 1px;
}
.ambient-global-meteor::after {
  content: '';
  position: absolute;
  right: -1px;
  top: -1.5px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 6px 2px rgba(230, 245, 255, 0.9);
}

@keyframes ambient-meteor-sweep {
  0% {
    opacity: 0;
    transform: rotate(25deg) translate3d(-100px, 0, 0);
  }
  1.2% {
    opacity: 0.85;
  }
  4.5% {
    opacity: 0.85;
  }
  6% {
    opacity: 0;
    transform: rotate(25deg) translate3d(580px, 0, 0);
  }
  100% {
    opacity: 0;
    transform: rotate(25deg) translate3d(580px, 0, 0);
  }
}

@keyframes ambient-nebula-pulse {
  0%, 100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 0.95;
    transform: scale(1.04);
  }
}

@keyframes ambient-stars-drift {
  0% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(-25px, -15px, 0); }
  100% { transform: translate3d(0, 0, 0); }
}

.tabs {
  position: fixed;
  z-index: 1; /* 低于作品集层：上拉后被覆盖 */
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px;
  border: 1px solid rgba(201,184,134,.22);
  background: rgba(4, 11, 23, .54);
  box-shadow: 0 5px 20px rgba(0,0,0,.24);
}

.tabs button {
  position: relative;
  padding: 7px 17px;
  border: 0;
  background: transparent;
  color: rgba(220,214,194,.58);
  font-size: 12px;
  letter-spacing: 2px;
  white-space: nowrap;
  cursor: pointer;
}
.tabs button::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 2px;
  height: 1px;
  background: transparent;
  transition: background .2s ease;
}
.tabs button.active { color: #f0e7cc; background: rgba(201,184,134,.1); }
.tabs button.active::after { background: #c9b886; }
.tab-mark { color: #c9b886; margin-right: 7px; font-size: 14px; }

/* 第一屏容器：固定在视口，作为作品集的背景层 */
.stage-screen {
  position: sticky;
  top: 0;
  z-index: 0;
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.stage {
  position: relative;
  flex: 1;
  min-height: 0;
}

/* 底部向下箭头与提示 */
.scroll-down-hint {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgba(201, 184, 134, 0.75);
  transition: color 0.2s, transform 0.2s;
}
.scroll-down-hint:hover {
  color: #f0e7cc;
  transform: translateX(-50%) translateY(2px);
}
.hint-label {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 3px;
}
.hint-arrow {
  font-size: 16px;
  line-height: 1;
  animation: floatDown 1.8s ease-in-out infinite;
}

@keyframes floatDown {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50% { transform: translateY(4px); opacity: 1; }
}

/* 第二屏：作品集展示层，覆盖在第一屏之上滑入 */
.portfolio-screen {
  position: relative;
  z-index: 2;
  min-height: 100vh;
  margin-top: -1px;
  border-radius: 22px 22px 0 0;
  box-shadow: 0 -28px 70px rgba(0, 0, 0, 0.72), 0 -1px 0 rgba(201, 184, 134, 0.32);
  background: linear-gradient(180deg, #0a1120 0%, #070c18 32%, #05070f 100%);
  padding: 80px 48px 48px;
  box-sizing: border-box;
}
.portfolio-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 36px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(201, 184, 134, 0.12);
}
.title-sub {
  display: block;
  font-size: 11px;
  letter-spacing: 2px;
  color: #c9b886;
  margin-bottom: 6px;
}
.portfolio-header h2 {
  font-size: 24px;
  font-weight: 500;
  color: #f0e7cc;
  margin: 0;
}

/* 返回星图：与第一屏底部“探索作品集”上下呼应 */
.back-to-top {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: transparent;
  border: none;
  padding: 0;
  color: rgba(201, 184, 134, 0.75);
  cursor: pointer;
  transition: color 0.2s, transform 0.2s;
}
.back-to-top:hover {
  color: #f0e7cc;
  transform: translateX(-50%) translateY(-2px);
}
.back-arrow {
  font-size: 16px;
  line-height: 1;
  animation: floatUp 1.8s ease-in-out infinite;
}

@keyframes floatUp {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50% { transform: translateY(-4px); opacity: 1; }
}

/* 居中轮播结构 */
.carousel-wrapper {
  position: relative;
  max-width: 960px;
  margin: 0 auto;
}

.carousel-stage {
  position: relative;
  display: grid;
  perspective: 1800px;
  perspective-origin: 50% 45%;
  padding: 8px 0 4px;
}

.carousel-stage::before {
  content: '';
  position: absolute;
  inset: 4% 10% 12%;
  background: radial-gradient(closest-side, rgba(78, 128, 214, 0.18), transparent 72%);
  filter: blur(36px);
  pointer-events: none;
  z-index: 0;
}

.carousel-slide {
  grid-area: 1 / 1;
  width: 100%;
  box-sizing: border-box;
  transform-style: preserve-3d;
  transition:
    transform 0.62s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.5s ease,
    filter 0.5s ease,
    box-shadow 0.5s ease;
  transform-origin: center center;
  will-change: transform, opacity;
  backface-visibility: hidden;
  cursor: pointer;
}

.carousel-slide.active {
  cursor: default;
  box-shadow:
    0 36px 90px rgba(0, 0, 0, 0.72),
    0 0 64px rgba(122, 166, 255, 0.1),
    0 0 0 1px rgba(201, 184, 134, 0.18);
}

.carousel-slide:not(.active) {
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.55);
}

/* 活动卡片背后的悬浮叠层，强化“浮起来”的厚度 */
.carousel-slide.active::before,
.carousel-slide.active::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid rgba(201, 184, 134, 0.16);
  border-radius: 10px;
  background: rgba(10, 18, 34, 0.55);
  pointer-events: none;
}

.carousel-slide.active::before {
  transform: translateY(12px) scale(0.975);
  z-index: -1;
}

.carousel-slide.active::after {
  transform: translateY(24px) scale(0.95);
  opacity: 0.55;
  z-index: -2;
}

.project-card {
  background: rgba(10, 18, 34, 0.94);
  border: 1px solid rgba(201, 184, 134, 0.2);
  border-radius: 8px;
  padding: 24px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.media-container {
  max-width: 880px;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: rgba(4, 9, 20, 0.6);
  border: 1px dashed rgba(201, 184, 134, 0.28);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  overflow: hidden;
}

.project-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  background: #000;
  border-radius: 4px;
}

.video-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: rgba(201, 184, 134, 0.6);
  font-size: 13px;
}
.ph-icon {
  font-size: 20px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(201, 184, 134, 0.4);
  background: rgba(201, 184, 134, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 3px;
}
.ph-text {
  letter-spacing: 1px;
}

.project-info {
  max-width: 880px;
  width: 100%;
  margin: 0 auto;
}

.proj-title {
  font-size: 20px;
  font-weight: 500;
  color: #f0e7cc;
  margin: 0 0 10px;
  letter-spacing: 0.5px;
}

.proj-desc {
  color: #a4b8d4;
  font-size: 14px;
  line-height: 1.7;
  margin: 0 0 16px;
}

.tech-stack {
  margin-bottom: 8px;
}

.tech-tag {
  display: inline-block;
  font-size: 11px;
  padding: 3px 10px;
  margin: 0 8px 8px 0;
  background: rgba(138, 180, 255, 0.1);
  color: #8ab4ff;
  border: 1px solid rgba(138, 180, 255, 0.22);
  border-radius: 3px;
}

.proj-links {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.link-btn {
  padding: 6px 16px;
  border: 1px solid rgba(201, 184, 134, 0.32);
  color: #e8e2cf;
  font-size: 12px;
  text-decoration: none;
  border-radius: 3px;
}
.link-btn:hover { background: rgba(201, 184, 134, 0.14); }
.link-btn.primary {
  background: rgba(201, 184, 134, 0.14);
  border-color: rgba(201, 184, 134, 0.5);
}

/* 左右圆形切换按钮 */
.carousel-btn {
  position: absolute;
  top: 42%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(201, 184, 134, 0.35);
  background: rgba(7, 13, 26, 0.85);
  color: #f0e7cc;
  font-size: 24px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.carousel-btn:hover {
  border-color: #f0e7cc;
  background: rgba(16, 28, 52, 0.95);
  box-shadow: 0 0 14px rgba(201, 184, 134, 0.35);
}
.carousel-btn.prev-btn {
  left: -22px;
}
.carousel-btn.next-btn {
  right: -22px;
}

/* 底部指示圆点 */
.carousel-indicators {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 24px;
}
.indicator-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgba(201, 184, 134, 0.28);
  border: none;
  padding: 0;
  cursor: pointer;
  transition: all 0.25s ease;
}
.indicator-dot.active {
  background: #c9b886;
  width: 24px;
  border-radius: 5px;
  box-shadow: 0 0 8px rgba(201, 184, 134, 0.5);
}

@media (max-width: 1060px) {
  .carousel-btn.prev-btn { left: 8px; }
  .carousel-btn.next-btn { right: 8px; }
}

@media (max-width: 767px) {
  .tabs button { letter-spacing: 1px; padding: 0 12px; }
  .portfolio-screen { padding: 76px 20px 40px; }
  .portfolio-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .project-card { padding: 16px; }
  .proj-title { font-size: 18px; }
  .carousel-slide:not(.active) { opacity: 0.22 !important; }
  .carousel-stage { perspective: 1200px; }
  .ambient-deep-starfield { animation: none !important; }
  .ambient-global-meteor { display: none !important; }
}

@media (prefers-reduced-motion: reduce) {
  .shell { scroll-behavior: auto; }
  .tabs button::after { transition: none; }
  .scroll-down-hint,
  .back-to-top { transition: none; }
  .hint-arrow { animation: none; }
  .back-arrow { animation: none; }
  .ambient-nebula-glow,
  .ambient-deep-starfield,
  .ambient-global-meteor { animation: none !important; }
  .carousel-slide { transition: none !important; }
  .carousel-btn { transition: none; }
  .indicator-dot { transition: none; }
}
</style>
