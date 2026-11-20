<template>
  <section
    ref="containerRef"
    class="viewport"
    :class="{ grabbing: isDragging }"
    @pointerdown="onPointerDown"
  >
    <div class="frame" aria-hidden="true"></div>

    <!-- 纯渐变与星云背景（不随平移缩放移动） -->
    <svg class="bg-canvas" viewBox="0 0 2000 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <!-- 基础线性渐变：顶部略亮、底部深 -->
        <linearGradient id="fate-bg-linear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#122442" />
          <stop offset="45%" stop-color="#0b172a" />
          <stop offset="100%" stop-color="#040914" />
        </linearGradient>
        <!-- 2 个低透明度径向渐变模拟星云 -->
        <radialGradient id="nebula-alpha" cx="32%" cy="36%" r="55%">
          <stop offset="0%" stop-color="#245185" stop-opacity="0.32" />
          <stop offset="50%" stop-color="#122749" stop-opacity="0.14" />
          <stop offset="100%" stop-color="#061021" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="nebula-beta" cx="74%" cy="62%" r="52%">
          <stop offset="0%" stop-color="#36396b" stop-opacity="0.26" />
          <stop offset="48%" stop-color="#19284d" stop-opacity="0.12" />
          <stop offset="100%" stop-color="#061021" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="2000" height="900" fill="url(#fate-bg-linear)" />
      <rect width="2000" height="900" fill="url(#nebula-alpha)" />
      <rect width="2000" height="900" fill="url(#nebula-beta)" />
      <!-- 少量星点（固定种子确定性伪随机） -->
      <g fill="#dce8f5">
        <circle
          v-for="(s, i) in bgStars"
          :key="i"
          :cx="s.x"
          :cy="s.y"
          :r="s.r"
          :opacity="s.o"
        />
      </g>
      <!-- 40 个缓慢漂移粒子 -->
      <g class="bg-particles">
        <circle
          v-for="(p, i) in particles"
          :key="'particle-' + i"
          class="particle"
          :cx="p.x"
          :cy="p.y"
          :r="p.r"
          :style="p.style"
        />
      </g>
    </svg>

    <!-- 纯装饰宇宙氛围层：位于 bg-canvas 之上、atlas 之下 -->
    <div class="cosmic-ambient-layer" aria-hidden="true">
      <!-- 1. 三层视差星空 -->
      <div class="star-field star-field-far"></div>
      <div class="star-field star-field-mid"></div>
      <div class="star-field star-field-near"></div>

      <!-- 2. 少量闪烁星点 (26 个) -->
      <div class="twinkle-container">
        <span
          v-for="s in twinkleStars"
          :key="s.id"
          class="twinkle-star"
          :style="s.style"
        ></span>
      </div>

      <!-- 3. 流星 (仅从时间线上方与下方掠过，不穿过卡片文字区域) -->
      <div class="meteor-item fate-meteor-upper"></div>
      <div class="meteor-item fate-meteor-lower"></div>

      <!-- 4. 宇宙尘埃粒子 (18 个，rAF 极慢漂浮) -->
      <div ref="dustContainerRef" class="dust-container">
        <span
          v-for="d in dustList"
          :key="d.id"
          class="dust-particle"
          :style="d.initStyle"
        ></span>
      </div>
    </div>

    <!-- 交互式时间线画卷（随拖拽平移和缩放） -->
    <svg
      class="atlas"
      viewBox="0 0 2000 900"
      preserveAspectRatio="xMidYMid meet"
      :style="{ transform }"
      aria-label="学习成长路线"
    >
      <defs>
        <!-- 缩略图底色渐变 -->
        <linearGradient id="thumb-one" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ba5c72"/><stop offset=".45" stop-color="#eab2a8"/><stop offset="1" stop-color="#372c5d"/></linearGradient>
        <linearGradient id="thumb-two" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#112849"/><stop offset=".45" stop-color="#3976b2"/><stop offset="1" stop-color="#d19a73"/></linearGradient>
        <linearGradient id="thumb-three" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d7a746"/><stop offset=".5" stop-color="#fff0b1"/><stop offset="1" stop-color="#795036"/></linearGradient>
        <linearGradient id="thumb-four" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#572d73"/><stop offset=".45" stop-color="#bf588c"/><stop offset="1" stop-color="#112b5b"/></linearGradient>
      </defs>

      <!-- 阶段到卡片的竖直细线：只画节点到首卡之间，避免被卡片遮住 -->
      <g class="vertical-lines">
        <line
          v-for="stage in stageColumns"
          :key="`vline-${stage.id}`"
          class="stage-v-line"
          :x1="stage.x"
          :y1="stage.nodeY + 14"
          :x2="stage.x"
          :y2="stage.firstCardY"
        />
        <!-- 多张卡片时在左侧画一条极淡的连接脊线 -->
        <line
          v-for="stage in stageColumns"
          v-show="stage.cardRows > 1"
          :key="`vspine-${stage.id}`"
          class="stage-spine"
          :x1="stage.x - 84"
          :y1="stage.firstCardY + 6"
          :x2="stage.x - 84"
          :y2="stage.lastCardY - 6"
        />
        <!-- 垂直分支连线微弱流动光脉冲 -->
        <line
          v-for="stage in stageColumns"
          :key="`vflow-${stage.id}`"
          class="stage-v-flow"
          :x1="stage.x"
          :y1="stage.nodeY + 14"
          :x2="stage.x"
          :y2="stage.firstCardY"
        />
      </g>

      <!-- 水平主线：y 取 300，x 从 120 到 1880，不加箭头/章节条/说明文字 -->
      <line class="main-line" x1="120" y1="300" x2="1880" y2="300" />
      <!-- 水平主线流动光脉冲（从左向右缓慢流动） -->
      <line class="main-line-flow" x1="120" y1="300" x2="1880" y2="300" />

      <!-- 10 个阶段节点 -->
      <g v-for="stage in stageColumns" :key="`node-${stage.id}`" class="stage-node-group">
        <!-- 阶段上方显示阶段名称 -->
        <text class="stage-name" :x="stage.x" :y="stage.nodeY - 28" text-anchor="middle">
          {{ stage.name }}
        </text>

        <!-- 节点外圈呼吸光晕与微自转刻度环 -->
        <circle class="stage-node-halo" :cx="stage.x" :cy="stage.nodeY" r="22" />
        <circle class="stage-node-rotor" :cx="stage.x" :cy="stage.nodeY" r="17" />

        <!-- 节点为金色小圆环 + 阶段序号 -->
        <circle class="stage-ring" :cx="stage.x" :cy="stage.nodeY" r="14" />
        <text class="stage-num" :x="stage.x" :y="stage.nodeY" text-anchor="middle" dominant-baseline="central">
          {{ stage.index + 1 }}
        </text>

        <!-- 事件文件卡列表（最多显示 3 张） -->
        <g
          v-for="card in stage.visibleNotes"
          :key="card.path"
          class="card-node"
          :transform="`translate(${stage.x} ${card.y})`"
        >
          <a :href="card.href" @click="onNodeClick($event)">
            <title>{{ card.title }}</title>
            <!-- 卡片底色（深色半透明） -->
            <rect class="card-bg" x="-75" y="0" width="150" height="88" rx="4" />
            <!-- 顶部 56px 缩略底色 -->
            <path
              class="card-thumb"
              d="M-75 4a4 4 0 0 1 4 -4h142a4 4 0 0 1 4 4v52h-150z"
              :fill="`url(#${card.thumbId})`"
            />
            <line x1="-75" y1="56" x2="75" y2="56" class="thumb-divider" />
            <!-- 底部显示笔记标题（超出省略） -->
            <text class="card-title" x="0" y="74" text-anchor="middle">
              {{ card.displayTitle }}
            </text>
            <!-- 细金边 -->
            <rect class="card-border" x="-75" y="0" width="150" height="88" rx="4" />
          </a>
        </g>

        <!-- 超出 3 张时在第 4 张位置显示 +N，点击进入该阶段文章汇总页 -->
        <a
          v-if="stage.hasOverflow"
          class="overflow-card"
          :href="`/stage/${stage.id}`"
          :transform="`translate(${stage.x} ${stage.overflowY})`"
          @click="onNodeClick($event)"
        >
          <title>{{ stage.name }} 全部 {{ stage.notes.length }} 篇笔记</title>
          <rect class="overflow-bg" x="-75" y="0" width="150" height="88" rx="4" />
          <text class="overflow-count" x="0" y="47" text-anchor="middle">
            +{{ stage.overflowCount }}
          </text>
          <text class="overflow-sub" x="0" y="65" text-anchor="middle">
            更多笔记
          </text>
        </a>

        <!-- 没有笔记的阶段：占位卡，文案“待补充”，虚线边框、降透明度（不可点击） -->
        <g
          v-if="stage.notes.length === 0"
          class="placeholder-card"
          :transform="`translate(${stage.x} ${stage.placeholderY})`"
        >
          <rect class="placeholder-bg" x="-75" y="0" width="150" height="88" rx="4" />
          <text class="placeholder-text" x="0" y="49" text-anchor="middle">
            待补充
          </text>
        </g>
      </g>
    </svg>

    <!-- 竖屏提示层：仅在移动端竖屏时显示 -->
    <div v-if="showRotateTip" class="rotate-screen-tip" aria-live="polite">
      <div class="rotate-icon" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="14" y="6" width="20" height="36" rx="3" stroke="#c9b886" />
          <line x1="22" y1="37" x2="26" y2="37" stroke="#c9b886" stroke-linecap="round" />
          <path d="M 6 20 C 6 12 12 6 20 6" stroke="#f0e7cc" stroke-dasharray="2 3" />
          <path d="M 42 28 C 42 36 36 42 28 42" stroke="#f0e7cc" stroke-dasharray="2 3" />
          <path d="M 16 3 L 20 6 L 16 9" fill="none" stroke="#f0e7cc" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M 32 45 L 28 42 L 32 39" fill="none" stroke="#f0e7cc" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <p class="rotate-text">请旋转手机横屏浏览</p>
    </div>

    <!-- 底部状态与操作指引 -->
    <p class="uid">UID:147730179</p>
    <p class="hint">拖拽平移 <b>·</b> 滚轮缩放 <b>·</b> 点击卡片阅读笔记</p>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { usePanZoom } from '../composables/usePanZoom';

const props = defineProps({
  notes: {
    type: Array,
    default: () => [],
  },
});

const containerRef = ref(null);
const isMobile = ref(false); // 恒为 false，确保移动端触摸拖拽可用
const { state, isDragging, onPointerDown, isClick } = usePanZoom(containerRef, isMobile);
const transform = computed(() => `translate(${state.x}px, ${state.y}px) scale(${state.scale})`);
const onNodeClick = (e) => {
  if (!isClick()) e.preventDefault();
};

// 竖屏提示层触发条件：window.innerWidth < 768 && window.innerHeight > window.innerWidth
const showRotateTip = ref(false);
const checkOrientation = () => {
  if (typeof window === 'undefined') return;
  showRotateTip.value = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
};

// 确定性线性同余发生器 (LCG)，确保 SSR 与 CSR hydration 完全一致
function createLcg(initialSeed) {
  let s = initialSeed;
  return function () {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// 26 个闪烁微星 (6~12s 周期呼吸)
const fateTwinkleRng = createLcg(6182943);
const twinkleStars = Array.from({ length: 26 }, (_, i) => {
  const x = (fateTwinkleRng() * 96 + 2).toFixed(1);
  const y = (fateTwinkleRng() * 92 + 4).toFixed(1);
  const size = (fateTwinkleRng() * 1.5 + 1.2).toFixed(1);
  const duration = (fateTwinkleRng() * 6 + 6).toFixed(1);
  const delay = (-fateTwinkleRng() * 12).toFixed(1);
  const minOp = (fateTwinkleRng() * 0.12 + 0.06).toFixed(2);
  const maxOp = (fateTwinkleRng() * 0.45 + 0.45).toFixed(2);
  return {
    id: `fate-twinkle-${i}`,
    style: {
      left: `${x}%`,
      top: `${y}%`,
      width: `${size}px`,
      height: `${size}px`,
      '--twinkle-min': minOp,
      '--twinkle-max': maxOp,
      animationDuration: `${duration}s`,
      animationDelay: `${delay}s`,
    },
  };
});

// 18 个宇宙尘埃微粒 (rAF 极慢漂浮，只改 transform)
const DUST_COUNT = 18;
const fateDustRng = createLcg(4928172);
const dustList = Array.from({ length: DUST_COUNT }, (_, i) => {
  const x = fateDustRng() * 100;
  const y = fateDustRng() * 100;
  const size = (0.8 + fateDustRng() * 1.5).toFixed(1);
  const opacity = (0.14 + fateDustRng() * 0.3).toFixed(2);
  return {
    id: `fate-dust-${i}`,
    initStyle: {
      left: `${x.toFixed(1)}%`,
      top: `${y.toFixed(1)}%`,
      width: `${size}px`,
      height: `${size}px`,
      opacity,
    },
  };
});

// 宇宙尘埃容器引用与 rAF 动画句柄
const dustContainerRef = ref(null);
let dustRafId = null;

const initDustRaf = () => {
  if (typeof window === 'undefined') return;
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const dustEls = dustContainerRef.value ? Array.from(dustContainerRef.value.children) : [];
  if (!dustEls.length) return;

  const isMobileView = window.innerWidth < 768;
  const activeCount = isMobileView ? Math.floor(dustEls.length / 2) : dustEls.length;
  for (let i = activeCount; i < dustEls.length; i++) {
    dustEls[i].style.display = 'none';
  }

  const dustData = dustEls.slice(0, activeCount).map(() => {
    const angle = fateDustRng() * Math.PI * 2;
    const speed = 0.05 + fateDustRng() * 0.07; // 速度极慢: 0.05 ~ 0.12 px/frame
    return {
      x: 0,
      y: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      maxX: 40,
      maxY: 30,
    };
  });

  const step = () => {
    for (let i = 0; i < dustData.length; i++) {
      const p = dustData[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x > p.maxX || p.x < -p.maxX) p.vx = -p.vx;
      if (p.y > p.maxY || p.y < -p.maxY) p.vy = -p.vy;
      dustEls[i].style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0)`;
    }
    dustRafId = requestAnimationFrame(step);
  };
  dustRafId = requestAnimationFrame(step);
};

onMounted(() => {
  checkOrientation();
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);
  initDustRaf();
});

onUnmounted(() => {
  window.removeEventListener('resize', checkOrientation);
  window.removeEventListener('orientationchange', checkOrientation);
  if (dustRafId) {
    cancelAnimationFrame(dustRafId);
    dustRafId = null;
  }
});

// 固定 10 个阶段定义
const STAGES = [
  { id: 'foundation', name: '计算机基础' },
  { id: 'java-basic', name: 'Java 基础' },
  { id: 'javaweb', name: 'JavaWeb' },
  { id: 'juc', name: 'JUC 并发' },
  { id: 'jvm', name: 'JVM' },
  { id: 'mysql', name: 'MySQL' },
  { id: 'redis', name: 'Redis 与中间件' },
  { id: 'microservice', name: '微服务' },
  { id: 'algorithm', name: '算法与数据结构' },
  { id: 'projects', name: '项目实战' },
];

// 笔记规则分配函数
// 知识库拆分后的章节文件按关键词归入对应阶段
const STAGE_KEYWORDS = {
  javaweb: /HTML|CSS|Servlet|JSP|Filter|Listener|JSTL|Cookie|Session|Tomcat|DOM|XML|静态资源|请求参数|请求域|响应部分|重定向|JSTL/,
  juc: /JUC|AQS|CAS|ReentrantLock|Semaphore|CountDown|CyclicBarrier|Exchanger|CompletableFuture|Atomic|ThreadLocal|volatile|线程池|阻塞队列|syn-ed|park-un|wait-ify|Future|ForkJoin|fork|Adder|CopyOnWrite|ConHashMap|异步调用|异步操作|线程模型|线程原理|创建线程|线程方法|终止流程/,
  jvm: /JVM|垃圾|类加载|内存分配|内存泄漏|字节码|直接内存|对象创建|对象访存|回收|编译异常|执行引擎|本地内存|内存优化|参数调优|运行参数|底层协议|加载过程/,
  microservice: /Nacos|Seata|Sentinel|Sleuth|服务注册|服务调用|服务熔断|服务网关|服务配置|服务编排|负载均衡/,
};

function getStageIdForNote(note) {
  // 首页已按正文关键词完成阶段归类，优先生效
  if (note.stage) return note.stage;
  const p = note.path || '';
  const planet = note.planet || '';
  const name = p.split('/').pop() || '';

  // 1. foundation: path 含 01-计算机网络 或 07-设计模式
  if (p.includes('01-计算机网络') || p.includes('07-设计模式')) {
    return 'foundation';
  }
  // 2. java-basic: path 含 02-java基础与并发
  if (p.includes('02-java基础与并发')) {
    return 'java-basic';
  }
  // 6. mysql: path 含 03-数据库
  if (p.includes('03-数据库')) {
    return 'mysql';
  }
  // 7. redis: path 含 04-框架与中间件
  if (p.includes('04-框架与中间件')) {
    return 'redis';
  }
  // 9. algorithm: planet 为 algorithm，或 path 含 08-算法与数据结构
  if (planet === 'algorithm' || p.includes('08-算法与数据结构')) {
    return 'algorithm';
  }
  // 10. projects: planet 为 projects，或 path 含 05-游戏服务端专项
  if (planet === 'projects' || p.includes('05-游戏服务端专项')) {
    return 'projects';
  }
  // 3~5、8：仅知识库（system）章节按关键词归入，避免博客建设日志混入
  if (planet === 'system') {
    for (const id of ['juc', 'jvm', 'microservice', 'javaweb']) {
      if (STAGE_KEYWORDS[id].test(name)) return id;
    }
  }

  return null;
}

// 标题截断函数（用于 150px 卡片底部区域，超出省略）
function formatTitle(title, maxUnits = 10) {
  if (!title) return '';
  let count = 0;
  for (let i = 0; i < title.length; i++) {
    count += title.charCodeAt(i) > 255 ? 1 : 0.55;
    if (count > maxUnits) {
      return title.slice(0, i) + '...';
    }
  }
  return title;
}

// 固定种子的确定性伪随机星点（确保 SSR 与客户端一致）
const starRng = createLcg(147730179);
const bgStars = Array.from({ length: 90 }, () => {
  const x = starRng();
  const y = starRng();
  return {
    x: Math.round(x * 2000),
    y: Math.round(y * 900),
    r: Number((0.4 + x * 0.9).toFixed(2)),
    o: Number((0.15 + y * 0.45).toFixed(2)),
  };
});

// 40 个缓慢漂移粒子：固定种子生成，内联 style 包含位移和明暗呼吸周期（r: 0.6~1.6，透明度: 0.12~0.45）
const particleRng = createLcg(98245167);
const particles = Array.from({ length: 40 }, () => {
  const px = particleRng();
  const py = particleRng();
  const pr = particleRng();
  const po = particleRng();
  const pdur = particleRng();
  const pdel = particleRng();
  const pdirX = particleRng();
  const pdirY = particleRng();

  const r = 0.6 + pr * 1.0; // r: 0.6 ~ 1.6
  const baseOp = 0.12 + po * 0.18; // 基础透明度: 0.12 ~ 0.30
  const peakOp = Math.min(0.45, baseOp + 0.1 + po * 0.08); // 峰值透明度: 0.22 ~ 0.45
  const duration = (15 + pdur * 17).toFixed(1); // 周期 15s ~ 32s 缓慢位移
  const delay = (-pdel * 24).toFixed(1); // 错开延时 -24s ~ 0s
  const dx = Math.round((pdirX - 0.5) * 36) + 'px';
  const dy = Math.round((pdirY - 0.5) * 32) + 'px';

  return {
    x: Math.round(px * 2000 * 10) / 10,
    y: Math.round(py * 900 * 10) / 10,
    r: Math.round(r * 100) / 100,
    style: {
      '--base-op': baseOp.toFixed(2),
      '--peak-op': peakOp.toFixed(2),
      '--dx': dx,
      '--dy': dy,
      animationDuration: `${duration}s`,
      animationDelay: `${delay}s`,
      opacity: baseOp.toFixed(2),
    },
  };
});

// 计算每个阶段在主线上的布局和所属卡片
// 各阶段优先展示的文档关键词（其余文档排在后面）
const STAGE_PRIORITY = {
  foundation: ['计算机网络', '设计模式'],
  javaweb: ['Servlet', 'JSP', 'Tomcat', 'HTML', 'CSS', 'Filter'],
  juc: ['JUC', '线程池', 'AQS', 'ReentrantLock', 'volatile', 'CAS', 'CompletableFuture'],
  jvm: ['JVM', '垃圾回收', '类加载', '内存分配', '字节码'],
  microservice: ['Nacos', 'Seata', 'Sentinel', '微服务', '服务注册', '服务熔断'],
  algorithm: ['题单', '滑动窗口', '单调栈'],
  projects: ['博客系统', '游戏服务端'],
};

// 部分阶段只展示前 N 篇，避免时间线过密
const STAGE_LIMIT = { algorithm: 7, projects: 2 };

function priorityRank(stageId, note) {
  const list = STAGE_PRIORITY[stageId] || [];
  const idx = list.findIndex((k) => (note.title || '').includes(k));
  return idx === -1 ? 99 : idx;
}

const stageColumns = computed(() => {
  const stageMap = new Map(STAGES.map((s) => [s.id, []]));
  for (const note of props.notes) {
    const stageId = getStageIdForNote(note);
    if (stageId && stageMap.has(stageId)) {
      stageMap.get(stageId).push(note);
    }
  }

  const THUMBS = ['thumb-one', 'thumb-two', 'thumb-three', 'thumb-four'];
  const startX = 120;
  const endX = 1880;
  const stepX = (endX - startX) / (STAGES.length - 1);
  const nodeY = 300;
  const firstCardY = 356;
  const cardH = 88;
  const cardGap = 14;

  return STAGES.map((stage, idx) => {
    const x = Math.round(startX + idx * stepX);
    const sorted = [...(stageMap.get(stage.id) || [])].sort(
      (a, b) => priorityRank(stage.id, a) - priorityRank(stage.id, b),
    );
    const stageNotes = sorted.slice(0, STAGE_LIMIT[stage.id] ?? sorted.length);
    const totalCount = stageNotes.length;

    const visibleNotes = stageNotes.slice(0, 3).map((n, cIdx) => ({
      ...n,
      thumbId: THUMBS[(idx * 2 + cIdx) % THUMBS.length],
      displayTitle: formatTitle(n.title),
      y: firstCardY + cIdx * (cardH + cardGap),
    }));

    const hasOverflow = totalCount > 3;
    const overflowCount = totalCount - 3;
    const overflowY = firstCardY + 3 * (cardH + cardGap);

    let bottomY = nodeY + 14;
    if (totalCount === 0) {
      bottomY = firstCardY + cardH;
    } else if (hasOverflow) {
      bottomY = overflowY + cardH;
    } else {
      bottomY = firstCardY + (visibleNotes.length - 1) * (cardH + cardGap) + cardH;
    }

    const cardRows = totalCount === 0 ? 1 : visibleNotes.length + (hasOverflow ? 1 : 0);

    return {
      ...stage,
      index: idx,
      x,
      nodeY,
      notes: stageNotes,
      visibleNotes,
      hasOverflow,
      overflowCount,
      overflowY,
      placeholderY: firstCardY,
      bottomY,
      firstCardY,
      cardRows,
      lastCardY: firstCardY + (cardRows - 1) * (cardH + cardGap) + cardH,
    };
  });
});
</script>

<style scoped>
.viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
  background: #040914;
  touch-action: none;
}
.viewport.grabbing {
  cursor: grabbing;
}

.bg-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* 40 个缓慢漂移与呼吸粒子 */
.particle {
  fill: #e8f2ff;
  animation-name: particle-drift;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  will-change: transform, opacity;
}

@keyframes particle-drift {
  0% {
    transform: translate(0, 0);
    opacity: var(--base-op);
  }
  50% {
    transform: translate(var(--dx), var(--dy));
    opacity: var(--peak-op);
  }
  100% {
    transform: translate(0, 0);
    opacity: var(--base-op);
  }
}

.atlas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform-origin: 0 0;
  will-change: transform;
  z-index: 2;
}

/* 纯装饰宇宙氛围层：位于 bg-canvas 之上、atlas 之下 */
.cosmic-ambient-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
}

/* 1. 三层视差星空 */
.star-field {
  position: absolute;
  inset: -120px;
  pointer-events: none;
  will-change: transform;
}

.star-field-far {
  background-image:
    radial-gradient(1px 1px at 40px 60px, rgba(230, 242, 255, 0.7), transparent),
    radial-gradient(1.2px 1.2px at 190px 240px, rgba(190, 215, 255, 0.65), transparent),
    radial-gradient(1px 1px at 340px 120px, rgba(255, 245, 225, 0.6), transparent),
    radial-gradient(1.4px 1.4px at 520px 410px, rgba(210, 230, 255, 0.7), transparent),
    radial-gradient(1px 1px at 280px 500px, rgba(235, 240, 255, 0.6), transparent);
  background-size: 640px 640px;
  opacity: 0.38;
  animation: drift-far 120s linear infinite;
}

.star-field-mid {
  background-image:
    radial-gradient(1.2px 1.2px at 90px 130px, rgba(240, 245, 255, 0.8), transparent),
    radial-gradient(1.6px 1.6px at 290px 330px, rgba(210, 235, 255, 0.75), transparent),
    radial-gradient(1.3px 1.3px at 480px 170px, rgba(255, 230, 190, 0.7), transparent),
    radial-gradient(1.5px 1.5px at 680px 540px, rgba(220, 240, 255, 0.8), transparent);
  background-size: 840px 840px;
  opacity: 0.52;
  animation: drift-mid 80s linear infinite;
}

.star-field-near {
  background-image:
    radial-gradient(1.5px 1.5px at 120px 200px, rgba(255, 255, 255, 0.9), transparent),
    radial-gradient(2px 2px at 400px 440px, rgba(225, 245, 255, 0.85), transparent),
    radial-gradient(1.6px 1.6px at 650px 220px, rgba(255, 240, 210, 0.8), transparent),
    radial-gradient(1.8px 1.8px at 880px 710px, rgba(210, 240, 255, 0.85), transparent);
  background-size: 1080px 1080px;
  opacity: 0.68;
  animation: drift-near 50s linear infinite;
}

@keyframes drift-far {
  0% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(-35px, -20px, 0); }
  100% { transform: translate3d(0, 0, 0); }
}

@keyframes drift-mid {
  0% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(45px, -35px, 0); }
  100% { transform: translate3d(0, 0, 0); }
}

@keyframes drift-near {
  0% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(-60px, 40px, 0); }
  100% { transform: translate3d(0, 0, 0); }
}

/* 2. 闪烁星点 */
.twinkle-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.twinkle-star {
  position: absolute;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 5px rgba(220, 240, 255, 0.85);
  animation-name: star-twinkle;
  animation-iteration-count: infinite;
  animation-timing-function: ease-in-out;
  will-change: opacity, transform;
}
@keyframes star-twinkle {
  0%, 100% { opacity: var(--twinkle-min, 0.1); transform: scale(0.8); }
  50% { opacity: var(--twinkle-max, 0.7); transform: scale(1.25); }
}

/* 3. 流星掠过：严格在上部与下部开阔空域掠过，不穿过卡片文字区域 */
.meteor-item {
  position: absolute;
  width: 140px;
  height: 2px;
  pointer-events: none;
  opacity: 0;
  will-change: transform, opacity;
}
.meteor-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(180, 215, 255, 0.45) 60%, rgba(255, 255, 255, 0.95) 100%);
  border-radius: 1px;
}
.meteor-item::after {
  content: '';
  position: absolute;
  right: -1px;
  top: -1.5px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 6px 2px rgba(230, 245, 255, 0.95);
}

.fate-meteor-upper {
  top: 7%;
  left: 6%;
  animation: fate-meteor-run-upper 16s ease-in infinite;
  animation-delay: 2.8s;
}

.fate-meteor-lower {
  top: 86%;
  left: 12%;
  animation: fate-meteor-run-lower 23s ease-in infinite;
  animation-delay: 11s;
}

@keyframes fate-meteor-run-upper {
  0% {
    opacity: 0;
    transform: rotate(20deg) translate3d(-100px, 0, 0);
  }
  1.5% {
    opacity: 0.9;
  }
  6% {
    opacity: 0.9;
  }
  8% {
    opacity: 0;
    transform: rotate(20deg) translate3d(560px, 0, 0);
  }
  100% {
    opacity: 0;
    transform: rotate(20deg) translate3d(560px, 0, 0);
  }
}

@keyframes fate-meteor-run-lower {
  0% {
    opacity: 0;
    transform: rotate(15deg) translate3d(-80px, 0, 0);
  }
  1.2% {
    opacity: 0.9;
  }
  5% {
    opacity: 0.9;
  }
  6.5% {
    opacity: 0;
    transform: rotate(15deg) translate3d(520px, 0, 0);
  }
  100% {
    opacity: 0;
    transform: rotate(15deg) translate3d(520px, 0, 0);
  }
}

/* 4. 宇宙尘埃粒子 */
.dust-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.dust-particle {
  position: absolute;
  border-radius: 50%;
  background: #cce2ff;
  box-shadow: 0 0 3px rgba(200, 225, 255, 0.6);
  pointer-events: none;
  will-change: transform;
}

.frame {
  position: absolute;
  z-index: 3;
  inset: 8px;
  border: 1px solid rgba(201, 184, 134, 0.28);
  pointer-events: none;
}

.uid {
  position: absolute;
  z-index: 4;
  left: 5.4%;
  bottom: 15px;
  margin: 0;
  color: rgba(235, 230, 212, 0.8);
  font: 10px 'Consolas', 'Cascadia Code', monospace;
  letter-spacing: 0.4px;
  text-shadow: 0 1px 4px #000;
  pointer-events: none;
}

.hint {
  position: absolute;
  z-index: 4;
  right: 5.5%;
  bottom: 14px;
  margin: 0;
  color: rgba(208, 202, 185, 0.55);
  font-size: 10px;
  letter-spacing: 1px;
  pointer-events: none;
}
.hint b {
  color: #c9b886;
  font-weight: 400;
  margin: 0 5px;
}

/* 主线与连线 */
.main-line {
  stroke: #c9b886;
  stroke-width: 1.8;
  stroke-opacity: 0.62;
}

.stage-v-line {
  stroke: #c9b886;
  stroke-width: 1;
  stroke-opacity: 0.5;
}

/* 多卡阶段的左侧连接脊线（不压卡片，也不会被卡片遮住） */
.stage-spine {
  stroke: #c9b886;
  stroke-width: 1;
  stroke-opacity: 0.18;
  stroke-dasharray: 3 5;
}

/* 主线与分支流动光脉冲 */
.main-line-flow {
  stroke: #ffebb0;
  stroke-width: 2.2px;
  stroke-linecap: round;
  stroke-dasharray: 24 380;
  stroke-opacity: 0.72;
  filter: drop-shadow(0 0 5px rgba(255, 235, 176, 0.8));
  animation: fate-line-drift 20s linear infinite;
  pointer-events: none;
  will-change: stroke-dashoffset;
}

@keyframes fate-line-drift {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: -808; /* 从左向右缓慢移动 */
  }
}

.stage-v-flow {
  stroke: #eddca8;
  stroke-width: 1.3px;
  stroke-linecap: round;
  stroke-dasharray: 12 160;
  stroke-opacity: 0.5;
  filter: drop-shadow(0 0 3px rgba(237, 220, 168, 0.6));
  animation: fate-vline-drift 14s linear infinite;
  pointer-events: none;
  will-change: stroke-dashoffset;
}

@keyframes fate-vline-drift {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: -344;
  }
}

/* 阶段节点外圈呼吸光晕与微自转刻度环 */
.stage-node-halo {
  fill: none;
  stroke: rgba(201, 184, 134, 0.35);
  stroke-width: 1.2px;
  filter: drop-shadow(0 0 6px rgba(201, 184, 134, 0.4));
  transform-box: fill-box;
  transform-origin: center;
  animation: stage-halo-breathe 7.5s ease-in-out infinite;
  will-change: transform, opacity;
  pointer-events: none;
}

@keyframes stage-halo-breathe {
  0%, 100% {
    transform: scale(0.92);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.12);
    opacity: 0.85;
  }
}

.stage-node-rotor {
  fill: none;
  stroke: #c9b886;
  stroke-width: 0.9px;
  stroke-dasharray: 3 4;
  stroke-opacity: 0.6;
  transform-box: fill-box;
  transform-origin: center;
  animation: stage-rotor-spin 48s linear infinite;
  will-change: transform;
  pointer-events: none;
}

@keyframes stage-rotor-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 阶段节点 */
.stage-name {
  fill: #f0e7cc;
  font: 500 13px 'Microsoft YaHei', -apple-system, sans-serif;
  letter-spacing: 0.6px;
}

.stage-ring {
  fill: #081324;
  stroke: #c9b886;
  stroke-width: 1.6;
  transition: stroke 0.2s ease, filter 0.2s ease;
}

.stage-node-group:hover .stage-ring {
  stroke: #fff1bd;
  filter: drop-shadow(0 0 6px rgba(240, 224, 168, 0.6));
}

.stage-node-group:hover .stage-node-halo {
  stroke: #fff1bd;
  stroke-opacity: 0.95;
  filter: drop-shadow(0 0 10px rgba(255, 241, 189, 0.8));
  animation-duration: 3.5s;
}

.stage-node-group:hover .stage-node-rotor {
  animation-duration: 16s;
  stroke-opacity: 0.95;
}

.stage-num {
  fill: #f0e7cc;
  font: 600 11px Georgia, 'Consolas', monospace;
}

/* 事件文件卡 */
.card-node a {
  text-decoration: none;
  cursor: pointer;
}

.card-bg {
  fill: #091526;
  fill-opacity: 0.88;
}

.card-thumb {
  opacity: 0.82;
  transition: opacity 0.2s ease;
}

.thumb-divider {
  stroke: rgba(201, 184, 134, 0.24);
  stroke-width: 1;
}

.card-title {
  fill: #e8e2cf;
  font: 11px 'Microsoft YaHei', -apple-system, sans-serif;
  letter-spacing: 0.4px;
  transition: fill 0.2s ease;
}

.card-border {
  fill: none;
  stroke: rgba(201, 184, 134, 0.42);
  stroke-width: 1;
  transition: stroke 0.2s ease, filter 0.2s ease;
}

.card-node:hover .card-border {
  stroke: #f3df9b;
  filter: drop-shadow(0 0 7px rgba(243, 223, 155, 0.6));
}

.card-node:hover .card-thumb {
  opacity: 1;
}

.card-node:hover .card-title {
  fill: #ffffff;
}

/* +N 超出卡 */
.overflow-card {
  pointer-events: auto;
  cursor: pointer;
}

.overflow-card:hover .overflow-bg {
  stroke: rgba(240, 224, 168, 0.85);
  fill: rgba(16, 28, 48, 0.85);
}

.overflow-card:hover .overflow-count {
  fill: #fff2c9;
}

.overflow-bg {
  fill: rgba(8, 16, 30, 0.65);
  stroke: rgba(201, 184, 134, 0.32);
  stroke-width: 1;
  stroke-dasharray: 4 3;
}

.overflow-count {
  fill: #f0e0a8;
  font: 600 16px Georgia, serif;
  letter-spacing: 1px;
}

.overflow-sub {
  fill: rgba(200, 210, 225, 0.52);
  font: 10px 'Microsoft YaHei', sans-serif;
}

/* 占位卡 */
.placeholder-card {
  pointer-events: none;
}

.placeholder-bg {
  fill: rgba(8, 16, 28, 0.42);
  stroke: rgba(160, 180, 205, 0.26);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.placeholder-text {
  fill: rgba(160, 180, 205, 0.45);
  font: 12px 'Microsoft YaHei', sans-serif;
  letter-spacing: 2px;
}

/* 竖屏旋转提示层 */
.rotate-screen-tip {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(4, 9, 20, 0.94);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #f0e7cc;
  pointer-events: auto;
}

.rotate-icon {
  color: #c9b886;
  animation: phone-rotate 2.4s ease-in-out infinite;
}

.rotate-text {
  font-size: 15px;
  letter-spacing: 2px;
  color: #f0e7cc;
  margin: 0;
  text-shadow: 0 0 10px rgba(201, 184, 134, 0.4);
}

@keyframes phone-rotate {
  0%, 100% {
    transform: rotate(0deg);
  }
  30%, 70% {
    transform: rotate(-90deg);
  }
}

/* 移动端媒体查询适配与动效降级 */
@media (max-width: 767px) {
  .frame {
    inset: 6px;
  }
  .uid {
    left: 20px;
    bottom: 10px;
  }
  .hint {
    right: 20px;
    bottom: 10px;
    font-size: 9px;
  }
  /* 移动端降级：禁用视差移动，粒子数量减半，保留呼吸与闪烁 */
  .star-field-far,
  .star-field-mid,
  .star-field-near {
    animation: none !important;
  }
  .dust-particle:nth-child(n+10) {
    display: none !important;
  }
}

/* 动效降级：无障碍模式关闭所有循环动效 */
@media (prefers-reduced-motion: reduce) {
  .particle,
  .star-field-far,
  .star-field-mid,
  .star-field-near,
  .twinkle-star,
  .meteor-item,
  .dust-particle,
  .main-line-flow,
  .stage-v-flow,
  .stage-node-halo,
  .stage-node-rotor,
  .rotate-icon {
    animation: none !important;
  }
  .stage-ring,
  .card-thumb,
  .card-title,
  .card-border {
    transition: none;
  }
  .card-node:hover .card-border {
    filter: none;
  }
  .stage-node-group:hover .stage-ring,
  .stage-node-group:hover .stage-node-halo {
    filter: none;
  }
}
</style>
