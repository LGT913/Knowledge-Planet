<template>
  <section
    ref="containerRef"
    class="viewport"
    :class="{ grabbing: isDragging }"
    @pointerdown="onPointerDown"
  >
    <div class="frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>

    <!-- 独立固定背景层：不绑定 transform，固定在视口底层 -->
    <svg
      class="bg-canvas"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <!-- 垂直渐变底 -->
        <linearGradient id="bg-vertical-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#122442" />
          <stop offset="48%" stop-color="#0b172a" />
          <stop offset="100%" stop-color="#040914" />
        </linearGradient>

        <!-- 两个低透明度径向渐变星云 -->
        <radialGradient id="bg-nebula-left" cx="28%" cy="38%" r="58%">
          <stop offset="0%" stop-color="#2c6a9c" stop-opacity="0.2" />
          <stop offset="45%" stop-color="#173b61" stop-opacity="0.09" />
          <stop offset="100%" stop-color="#0b172a" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="bg-nebula-right" cx="76%" cy="66%" r="52%">
          <stop offset="0%" stop-color="#673f7c" stop-opacity="0.16" />
          <stop offset="48%" stop-color="#36254f" stop-opacity="0.07" />
          <stop offset="100%" stop-color="#040914" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- 底色与星云 -->
      <rect width="1600" height="1000" fill="url(#bg-vertical-gradient)" />
      <rect width="1600" height="1000" fill="url(#bg-nebula-left)" />
      <rect width="1600" height="1000" fill="url(#bg-nebula-right)" />

      <!-- 固定种子的静态星点 -->
      <g class="bg-stars" fill="#dce8f5">
        <circle
          v-for="(s, i) in stars"
          :key="'star-' + i"
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

      <!-- 2. 少量闪烁星点 (<= 40 个) -->
      <div class="twinkle-container">
        <span
          v-for="s in twinkleStars"
          :key="s.id"
          class="twinkle-star"
          :style="s.style"
        ></span>
      </div>

      <!-- 3. 流星 (2 个掠过拖尾元素) -->
      <div class="meteor-item meteor-1"></div>
      <div class="meteor-item meteor-2"></div>

      <!-- 4. 宇宙尘埃粒子 (<= 24 个，rAF 极慢漂浮) -->
      <div ref="dustContainerRef" class="dust-container">
        <span
          v-for="d in dustList"
          :key="d.id"
          class="dust-particle"
          :style="d.initStyle"
        ></span>
      </div>
    </div>

    <!-- 交互 SVG：承载缩放和平移，仅保留轨道、轨道标记与星系节点 -->
    <svg
      class="atlas"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid meet"
      :style="{ transform }"
      aria-label="星系航图"
    >
      <defs>
        <!-- 月面球裁剪与渐变 -->
        <clipPath id="clip-moon-sphere">
          <circle cx="0" cy="0" r="50" />
        </clipPath>
        <radialGradient id="grad-moon-surface" cx="32%" cy="28%" r="68%">
          <stop offset="0%" stop-color="#f2f5fd" />
          <stop offset="28%" stop-color="#b6c6e2" />
          <stop offset="65%" stop-color="#556b94" />
          <stop offset="100%" stop-color="#162238" />
        </radialGradient>

        <!-- 环世界核心渐变 -->
        <radialGradient id="grad-ringworld-core" cx="45%" cy="45%" r="55%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="25%" stop-color="#9eedff" />
          <stop offset="65%" stop-color="#3187f5" />
          <stop offset="100%" stop-color="#0e2f6c" />
        </radialGradient>

        <!-- 晶体星内部发光渐变 -->
        <radialGradient id="grad-crystal-glow" cx="45%" cy="45%" r="65%">
          <stop offset="0%" stop-color="#c1ffea" stop-opacity="0.9" />
          <stop offset="35%" stop-color="#34caa1" stop-opacity="0.45" />
          <stop offset="100%" stop-color="#0a3930" stop-opacity="0" />
        </radialGradient>

        <!-- 彗核渐变 -->
        <linearGradient id="grad-comet-main" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ffd59e" stop-opacity="0.85" />
          <stop offset="25%" stop-color="#d668ab" stop-opacity="0.5" />
          <stop offset="65%" stop-color="#673994" stop-opacity="0.18" />
          <stop offset="100%" stop-color="#121832" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="grad-comet-wide" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#fff2c9" stop-opacity="0.65" />
          <stop offset="35%" stop-color="#8a53aa" stop-opacity="0.28" />
          <stop offset="100%" stop-color="#121832" stop-opacity="0" />
        </linearGradient>
        <radialGradient id="grad-comet-core" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="35%" stop-color="#ffe6b8" />
          <stop offset="70%" stop-color="#ea73ad" />
          <stop offset="100%" stop-color="#5a236d" />
        </radialGradient>

        <!-- 灯光行星渐变与裁剪 -->
        <clipPath id="clip-growth-sphere">
          <circle cx="0" cy="0" r="36" />
        </clipPath>
        <radialGradient id="grad-growth-planet" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#4ef2bb" />
          <stop offset="35%" stop-color="#20a17e" />
          <stop offset="70%" stop-color="#12594e" />
          <stop offset="100%" stop-color="#062622" />
        </radialGradient>
      </defs>

      <!-- 双层星系轨道：主轨道实线 + 外层虚线刻度圆环 -->
      <g class="orbits" fill="none">
        <!-- 轨道簇 1: (610, 530) -->
        <circle cx="610" cy="530" r="320" class="orbit-solid" />
        <circle cx="610" cy="530" r="344" class="orbit-dashed" />
        <!-- 轨道簇 2: (980, 500) -->
        <circle cx="980" cy="500" r="230" class="orbit-solid" />
        <circle cx="980" cy="500" r="252" class="orbit-dashed" />
        <!-- 宏观星际椭圆 1: (810, 520) rotate(22) -->
        <ellipse cx="810" cy="520" rx="760" ry="290" transform="rotate(22 810 520)" class="orbit-solid" />
        <ellipse cx="810" cy="520" rx="782" ry="308" transform="rotate(22 810 520)" class="orbit-dashed" />
        <!-- 宏观星际椭圆 2: (810, 520) rotate(-30) -->
        <ellipse cx="810" cy="520" rx="640" ry="420" transform="rotate(-30 810 520)" class="orbit-solid faint" />
        <ellipse cx="810" cy="520" rx="658" ry="438" transform="rotate(-30 810 520)" class="orbit-dashed faint" />

        <!-- 轨道流动光脉冲（流动光点效果，克制不闪烁） -->
        <circle cx="610" cy="530" r="320" class="orbit-pulse" />
        <circle cx="980" cy="500" r="230" class="orbit-pulse" />
        <ellipse cx="810" cy="520" rx="760" ry="290" transform="rotate(22 810 520)" class="orbit-pulse" />
        <ellipse cx="810" cy="520" rx="640" ry="420" transform="rotate(-30 810 520)" class="orbit-pulse faint" />
      </g>

      <!-- 航标标记 -->
      <g class="orbit-markers">
        <g v-for="m in orbitMarks" :key="m.id" :transform="`translate(${m.x} ${m.y})`">
          <circle r="12" />
          <circle r="4" />
        </g>
      </g>

      <!-- 五大独立星系节点 -->
      <g
        v-for="g in galaxies"
        :key="g.id"
        class="galaxy"
        :transform="`translate(${g.x} ${g.y})`"
      >
        <a
          :href="g.path"
          @click="onGalaxyClick($event, g)"
          @mouseenter="hovered = g.id"
          @mouseleave="hovered = null"
          @focus="hovered = g.id"
          @blur="hovered = null"
        >
          <!-- 独立艺术造型分块 -->
          <g class="art-layer">
            <!-- 节点外圈呼吸光晕 -->
            <circle
              class="galaxy-halo"
              :cx="g.id === 'blog-dev' ? -8 : 0"
              :cy="g.id === 'blog-dev' ? 8 : 0"
              :r="getGalaxyHaloRadius(g.id)"
            />

            <!-- 1. knowledge: 月面球 -->
            <g v-if="g.id === 'knowledge'" class="art-moon">
              <!-- 外侧金色机械半环 -->
              <g class="moon-mech-ring">
                <path
                  d="M -45.2 45.2 A 64 64 0 0 1 45.2 -45.2"
                  fill="none"
                  stroke="#c9b886"
                  stroke-width="1.2"
                />
                <!-- 两端小方块 -->
                <rect
                  x="-48.2"
                  y="42.2"
                  width="6"
                  height="6"
                  fill="#e8d9a8"
                  stroke="#c9b886"
                  stroke-width="1"
                  transform="rotate(45 -45.2 45.2)"
                />
                <rect
                  x="42.2"
                  y="-48.2"
                  width="6"
                  height="6"
                  fill="#e8d9a8"
                  stroke="#c9b886"
                  stroke-width="1"
                  transform="rotate(45 45.2 -45.2)"
                />
                <!-- 机械刻度标记 -->
                <line x1="-54" y1="36" x2="-59" y2="39" stroke="#c9b886" stroke-width="1" stroke-opacity="0.8" />
                <line x1="36" y1="-54" x2="39" y2="-59" stroke="#c9b886" stroke-width="1" stroke-opacity="0.8" />
              </g>

              <!-- 球体主圆 -->
              <circle cx="0" cy="0" r="50" fill="url(#grad-moon-surface)" />

              <!-- 4 个月面陨石坑（暗色椭圆 + 亮边） -->
              <g class="craters">
                <g transform="translate(-16, -14) rotate(-18)">
                  <ellipse cx="0" cy="0" rx="10" ry="6.5" fill="#25324d" opacity="0.85" />
                  <path d="M -9 1 A 9.5 6 0 0 0 9 2" fill="none" stroke="#d5e2f7" stroke-width="0.9" opacity="0.8" />
                </g>
                <g transform="translate(14, 16) rotate(22)">
                  <ellipse cx="0" cy="0" rx="13" ry="8" fill="#1c253d" opacity="0.9" />
                  <path d="M -12 2 A 12.5 7.5 0 0 0 12 3" fill="none" stroke="#adc0dc" stroke-width="0.85" opacity="0.75" />
                </g>
                <g transform="translate(-8, 22) rotate(-10)">
                  <ellipse cx="0" cy="0" rx="7" ry="4.8" fill="#232d44" opacity="0.8" />
                  <path d="M -6.5 1 A 6.5 4.5 0 0 0 6.5 1.5" fill="none" stroke="#bed0ed" stroke-width="0.8" opacity="0.7" />
                </g>
                <g transform="translate(20, -18) rotate(15)">
                  <ellipse cx="0" cy="0" rx="8.5" ry="5.5" fill="#2c3954" opacity="0.85" />
                  <path d="M -8 1 A 8 5 0 0 0 8 1.5" fill="none" stroke="#d5e4fc" stroke-width="0.85" opacity="0.8" />
                </g>
              </g>

              <!-- 明暗终止线阴影 -->
              <path
                d="M 0 -50 A 50 50 0 0 1 0 50 C 30 32 30 -32 0 -50 Z"
                fill="#060c18"
                opacity="0.6"
                clip-path="url(#clip-moon-sphere)"
              />
            </g>

            <!-- 2. algorithm: 机械环世界 -->
            <g v-else-if="g.id === 'algorithm'" class="art-ringworld">
              <!-- 金色支架与端点卡榫 -->
              <g class="mech-struts">
                <line x1="0" y1="-18" x2="0" y2="-56" stroke="#c9b886" stroke-width="1.2" stroke-opacity="0.85" />
                <line x1="0" y1="18" x2="0" y2="56" stroke="#c9b886" stroke-width="1.2" stroke-opacity="0.85" />
                <line x1="-18" y1="0" x2="-56" y2="0" stroke="#c9b886" stroke-width="1.2" stroke-opacity="0.85" />
                <line x1="18" y1="0" x2="56" y2="0" stroke="#c9b886" stroke-width="1.2" stroke-opacity="0.85" />

                <rect x="-3" y="-57.5" width="6" height="2.5" fill="#e8d9a8" stroke="#c9b886" stroke-width="0.6" />
                <rect x="-3" y="55" width="6" height="2.5" fill="#e8d9a8" stroke="#c9b886" stroke-width="0.6" />
                <rect x="-57.5" y="-3" width="2.5" height="6" fill="#e8d9a8" stroke="#c9b886" stroke-width="0.6" />
                <rect x="55" y="-3" width="2.5" height="6" fill="#e8d9a8" stroke="#c9b886" stroke-width="0.6" />
              </g>

              <!-- 缓慢公转的机械环圈与小节点 -->
              <g class="ringworld-rotator">
                <!-- 三层同心机械环（含虚线刻度环） -->
                <circle cx="0" cy="0" r="29" fill="none" stroke="#71bcf5" stroke-width="0.9" stroke-opacity="0.55" />
                <circle cx="0" cy="0" r="43" fill="none" stroke="#c9b886" stroke-width="1.2" stroke-dasharray="3 5" stroke-opacity="0.95" />
                <circle cx="0" cy="0" r="56" fill="none" stroke="#a4c4e8" stroke-width="1.1" stroke-opacity="0.75" />

                <!-- 环绕的 3 个小节点 -->
                <g transform="translate(35.2, 24.7)">
                  <circle r="3.6" fill="#0d1f38" stroke="#e8d9a8" stroke-width="1" />
                  <circle r="1.6" fill="#ffd875" />
                </g>
                <g transform="translate(-39.0, 18.2)">
                  <circle r="3.6" fill="#0d1f38" stroke="#e8d9a8" stroke-width="1" />
                  <circle r="1.6" fill="#ffd875" />
                </g>
                <g transform="translate(3.7, -42.8)">
                  <circle r="3.6" fill="#0d1f38" stroke="#e8d9a8" stroke-width="1" />
                  <circle r="1.6" fill="#ffd875" />
                </g>
              </g>

              <!-- 中心小核心 -->
              <circle cx="0" cy="0" r="18" fill="none" stroke="#8ae8ff" stroke-width="0.8" opacity="0.6" />
              <circle cx="0" cy="0" r="13" fill="url(#grad-ringworld-core)" />
            </g>

            <!-- 3. projects: 晶体星 -->
            <g v-else-if="g.id === 'projects'" class="art-crystal">
              <!-- 内部发光 -->
              <circle cx="-2" cy="4" r="32" fill="url(#grad-crystal-glow)" />

              <!-- 缓慢自转的切面多面体 -->
              <g class="crystal-rotator">
                <!-- 六边形/多面体切面（若干三角面，明暗不同） -->
                <g class="crystal-facets">
                  <path d="M 0 -48 L -40 -10 L -3 6 Z" fill="#48d4a4" opacity="0.75" />
                  <path d="M 0 -48 L 40 -10 L -3 6 Z" fill="#7dfcd2" opacity="0.9" />
                  <path d="M 40 -10 L 30 26 L -3 6 Z" fill="#229b76" opacity="0.85" />
                  <path d="M 30 26 L 0 48 L -3 6 Z" fill="#105742" opacity="0.95" />
                  <path d="M 0 48 L -30 26 L -3 6 Z" fill="#176a52" opacity="0.9" />
                  <path d="M -30 26 L -40 -10 L -3 6 Z" fill="#2fa580" opacity="0.8" />
                </g>

                <!-- 外切棱与金色轮廓 -->
                <path
                  d="M 0 -48 L 40 -10 L 30 26 L 0 48 L -30 26 L -40 -10 Z"
                  fill="none"
                  stroke="#c9b886"
                  stroke-width="0.9"
                  stroke-opacity="0.65"
                />
                <path d="M -40 -10 L -3 6 L 40 -10" fill="none" stroke="#e8fdf5" stroke-width="1" stroke-opacity="0.75" />

                <!-- 一条贯穿的高光棱线 -->
                <path
                  d="M 0 -48 L -3 6 L 0 48"
                  fill="none"
                  stroke="#ffffff"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  class="crystal-spine"
                />
                <circle cx="-3" cy="6" r="2.6" fill="#ffffff" class="crystal-star" />
              </g>
            </g>

            <!-- 4. blog-dev: 彗核 -->
            <g v-else-if="g.id === 'blog-dev'" class="art-comet">
              <!-- 向后拖出的多层锥形渐变彗尾 -->
              <path
                d="M -16 12 C 14 6 56 -24 94 -48 C 46 -18 10 -2 -6 20 Z"
                fill="url(#grad-comet-wide)"
              />
              <path
                d="M -13 5 C 10 -15 44 -40 86 -68 C 54 -30 20 -4 -4 15 Z"
                fill="url(#grad-comet-main)"
              />

              <!-- 散落小颗粒 -->
              <g class="comet-dust">
                <circle cx="16" cy="-10" r="1.4" fill="#ffe8aa" opacity="0.8" />
                <circle cx="32" cy="-26" r="1.2" fill="#f2b5d4" opacity="0.65" />
                <circle cx="45" cy="-18" r="0.9" fill="#ffd59e" opacity="0.55" />
                <circle cx="56" cy="-42" r="1.3" fill="#c9b886" opacity="0.6" />
                <circle cx="70" cy="-50" r="0.8" fill="#e8d9a8" opacity="0.45" />
                <circle cx="28" cy="-4" r="1.0" fill="#ffd285" opacity="0.55" />
                <circle cx="80" cy="-60" r="0.7" fill="#ffffff" opacity="0.4" />
                <circle cx="42" cy="-35" r="1.1" fill="#ffecb8" opacity="0.5" />
              </g>

              <!-- 偏长的核心 -->
              <ellipse
                cx="-8"
                cy="8"
                rx="20"
                ry="12"
                transform="rotate(-40 -8 8)"
                fill="url(#grad-comet-core)"
                opacity="0.9"
                class="comet-core-glow"
              />
              <ellipse
                cx="-8"
                cy="8"
                rx="12"
                ry="7"
                transform="rotate(-40 -8 8)"
                fill="#ffffff"
                class="comet-nucleus"
              />
              <path
                d="M -18 16 A 16 9 0 0 1 -2 2"
                fill="none"
                stroke="#e8d9a8"
                stroke-width="1.1"
                opacity="0.8"
                transform="rotate(-40 -8 8)"
              />
            </g>

            <!-- 5. growth: 灯光行星 -->
            <g v-else-if="g.id === 'growth'" class="art-citylights">
              <!-- 球体 -->
              <circle cx="0" cy="0" r="36" fill="url(#grad-growth-planet)" />

              <!-- 夜面暗部 -->
              <path
                d="M 0 -36 A 36 36 0 0 1 0 36 C 22 22 22 -22 0 -36 Z"
                fill="#040c14"
                opacity="0.8"
                clip-path="url(#clip-growth-sphere)"
              />

              <!-- 8~12 个暖色小光点（城市灯光） -->
              <g class="city-lights">
                <circle cx="6" cy="-16" r="1.3" fill="#ffe699" opacity="0.9" />
                <circle cx="12" cy="-8" r="1.6" fill="#ffd573" opacity="0.95" />
                <circle cx="18" cy="-14" r="1.1" fill="#ffbe52" opacity="0.85" />
                <circle cx="15" cy="2" r="1.5" fill="#ffe9a8" opacity="0.9" />
                <circle cx="8" cy="10" r="1.4" fill="#ffd678" opacity="0.85" />
                <circle cx="21" cy="12" r="1.2" fill="#ffc85a" opacity="0.8" />
                <circle cx="14" cy="20" r="1.3" fill="#ffe494" opacity="0.9" />
                <circle cx="4" cy="22" r="1.1" fill="#ffd36e" opacity="0.75" />
                <circle cx="23" cy="-4" r="1.0" fill="#ffbc48" opacity="0.8" />
                <circle cx="18" cy="24" r="0.9" fill="#ffeaa8" opacity="0.7" />
              </g>

              <!-- 外圈大气辉光 -->
              <circle
                cx="0"
                cy="0"
                r="39.5"
                fill="none"
                stroke="#60fed2"
                stroke-width="2.2"
                stroke-opacity="0.4"
                class="atmosphere-glow"
              />
            </g>
          </g>

          <!-- 标签区：星系名称 + 细金线 + 副标题（自适应造型高度，不压住图形） -->
          <text class="label" :y="GALAXY_ART_CONFIG[g.id].labelY">{{ g.title }}</text>
          <line
            class="label-rule"
            :x1="-48"
            :y1="GALAXY_ART_CONFIG[g.id].ruleY"
            :x2="48"
            :y2="GALAXY_ART_CONFIG[g.id].ruleY"
          />
          <text class="sub" :y="GALAXY_ART_CONFIG[g.id].subY">{{ g.sub }}</text>
        </a>
      </g>

      <!-- 点击星系产生的扩散波纹 -->
      <circle
        v-if="clickRipple"
        :key="clickRipple.id"
        :cx="clickRipple.x"
        :cy="clickRipple.y"
        r="50"
        class="galaxy-click-ripple"
      />
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

    <p class="uid">UID:147730179</p>
    <p class="hint">拖拽平移 <b>·</b> 滚轮缩放 <b>·</b> 点击星系进入星球</p>

    <!-- 星系档案：悬浮或聚焦星系时显示对应知识文件 -->
    <aside v-if="hoverGalaxy" class="galaxy-panel" aria-live="polite">
      <p class="gp-eyebrow">星系档案</p>
      <h3 class="gp-title">{{ hoverGalaxy.title }}</h3>
      <p class="gp-sub">{{ hoverGalaxy.sub }}</p>
      <p class="gp-count">{{ hoverNotes.length }} 篇文档</p>
      <ul v-if="hoverNotes.length" class="gp-list">
        <li v-for="n in hoverNotes.slice(0, 3)" :key="n.href">{{ n.title }}</li>
      </ul>
      <p v-else class="gp-empty">该星系暂无文档，等待归档</p>
      <p class="gp-more">点击进入星系 →</p>
    </aside>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { usePanZoom } from '../composables/usePanZoom';
import { GALAXIES } from '../data/galaxies';

const galaxies = GALAXIES;

const props = defineProps({
  notes: { type: Array, default: () => [] },
});

const hovered = ref(null);
const hoverGalaxy = computed(() => galaxies.find((g) => g.id === hovered.value) || null);
const hoverNotes = computed(() => {
  const g = hoverGalaxy.value;
  if (!g) return [];
  return props.notes.filter((n) => g.planets.includes(n.planet));
});

const containerRef = ref(null);
const isMobile = ref(false); // 恒为 false，确保移动端触摸拖拽可用
const { state, isDragging, onPointerDown, isClick } = usePanZoom(containerRef, isMobile);
const transform = computed(() => `translate(${state.x}px, ${state.y}px) scale(${state.scale})`);
const onNodeClick = (e) => { if (!isClick()) e.preventDefault(); };

// 外圈光晕半径映射
const getGalaxyHaloRadius = (id) => {
  switch (id) {
    case 'knowledge': return 58;
    case 'algorithm': return 58;
    case 'projects': return 50;
    case 'blog-dev': return 34;
    case 'growth': return 43;
    default: return 50;
  }
};

// 点击星系波纹扩散状态
const clickRipple = ref(null);
let rippleTimer = null;
const triggerRipple = (g) => {
  clickRipple.value = { x: g.x, y: g.y, id: Date.now() };
  if (rippleTimer) clearTimeout(rippleTimer);
  rippleTimer = setTimeout(() => {
    clickRipple.value = null;
  }, 900);
};

const onGalaxyClick = (e, g) => {
  if (!isClick()) {
    e.preventDefault();
    return;
  }
  triggerRipple(g);
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

// 32 个闪烁星点 (6~12s 周期 opacity 变化，不同 animation-delay)
const twinkleRng = createLcg(5201314);
const twinkleStars = Array.from({ length: 32 }, (_, i) => {
  const x = (twinkleRng() * 96 + 2).toFixed(1);
  const y = (twinkleRng() * 92 + 4).toFixed(1);
  const size = (twinkleRng() * 1.5 + 1.2).toFixed(1);
  const duration = (twinkleRng() * 6 + 6).toFixed(1);
  const delay = (-twinkleRng() * 12).toFixed(1);
  const minOp = (twinkleRng() * 0.12 + 0.06).toFixed(2);
  const maxOp = (twinkleRng() * 0.45 + 0.45).toFixed(2);
  return {
    id: `twinkle-${i}`,
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

// 20 个宇宙尘埃微粒 (rAF 极慢漂浮，只改 transform，速度极慢)
const DUST_COUNT = 20;
const dustRng = createLcg(7721839);
const dustList = Array.from({ length: DUST_COUNT }, (_, i) => {
  const x = dustRng() * 100;
  const y = dustRng() * 100;
  const size = (0.8 + dustRng() * 1.6).toFixed(1);
  const opacity = (0.15 + dustRng() * 0.32).toFixed(2);
  return {
    id: `dust-${i}`,
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
    const angle = dustRng() * Math.PI * 2;
    const speed = 0.06 + dustRng() * 0.08; // 极慢漂浮: 0.06 ~ 0.14 px/frame
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
  if (rippleTimer) {
    clearTimeout(rippleTimer);
    rippleTimer = null;
  }
});

// 五大星系艺术造型与自适应标签排版映射表
const GALAXY_ART_CONFIG = {
  knowledge: {
    type: 'moon',
    scale: 1.25,
    labelY: 90,
    ruleY: 102,
    subY: 120,
  },
  algorithm: {
    type: 'ringworld',
    scale: 1.16,
    labelY: 84,
    ruleY: 96,
    subY: 114,
  },
  projects: {
    type: 'crystal',
    scale: 1.02,
    labelY: 74,
    ruleY: 86,
    subY: 104,
  },
  'blog-dev': {
    type: 'comet',
    scale: 0.92,
    labelY: 68,
    ruleY: 80,
    subY: 98,
  },
  growth: {
    type: 'citylights',
    scale: 0.86,
    labelY: 62,
    ruleY: 74,
    subY: 92,
  },
};

  // 130 个静态星点
  const starRng = createLcg(147730179);
const stars = Array.from({ length: 130 }, () => {
  const x = starRng();
  const y = starRng();
  return {
    x: Math.round(x * 1600 * 10) / 10,
    y: Math.round(y * 1000 * 10) / 10,
    r: Math.round((0.45 + x * 1.05) * 100) / 100,
    o: Math.round((0.16 + y * 0.52) * 100) / 100,
  };
});

// 40 个缓慢漂移粒子：固定种子生成，内联 style 包含位移和明暗呼吸周期
const particleRng = createLcg(88926310);
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
    x: Math.round(px * 1600 * 10) / 10,
    y: Math.round(py * 1000 * 10) / 10,
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

const orbitMarks = [
  { id: 'a', x: 300, y: 530 }, { id: 'b', x: 980, y: 270 },
  { id: 'c', x: 1300, y: 530 }, { id: 'd', x: 980, y: 730 },
  { id: 'e', x: 200, y: 200 }, { id: 'f', x: 1400, y: 850 },
];
</script>

<style scoped>
.viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
  background-color: #040914;
  touch-action: none;
}
.viewport.grabbing {
  cursor: grabbing;
}

/* 独立固定背景层 */
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

/* 交互 SVG 航图 */
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
    radial-gradient(1px 1px at 35px 50px, rgba(230, 242, 255, 0.7), transparent),
    radial-gradient(1.2px 1.2px at 180px 220px, rgba(190, 215, 255, 0.65), transparent),
    radial-gradient(1px 1px at 320px 110px, rgba(255, 245, 225, 0.6), transparent),
    radial-gradient(1.4px 1.4px at 490px 380px, rgba(210, 230, 255, 0.7), transparent),
    radial-gradient(1px 1px at 260px 470px, rgba(235, 240, 255, 0.6), transparent);
  background-size: 620px 620px;
  opacity: 0.38;
  animation: drift-far 120s linear infinite;
}

.star-field-mid {
  background-image:
    radial-gradient(1.2px 1.2px at 85px 120px, rgba(240, 245, 255, 0.8), transparent),
    radial-gradient(1.6px 1.6px at 270px 310px, rgba(210, 235, 255, 0.75), transparent),
    radial-gradient(1.3px 1.3px at 450px 160px, rgba(255, 230, 190, 0.7), transparent),
    radial-gradient(1.5px 1.5px at 640px 520px, rgba(220, 240, 255, 0.8), transparent),
    radial-gradient(1.2px 1.2px at 150px 610px, rgba(200, 225, 255, 0.65), transparent);
  background-size: 820px 820px;
  opacity: 0.52;
  animation: drift-mid 80s linear infinite;
}

.star-field-near {
  background-image:
    radial-gradient(1.5px 1.5px at 110px 190px, rgba(255, 255, 255, 0.9), transparent),
    radial-gradient(2px 2px at 380px 420px, rgba(225, 245, 255, 0.85), transparent),
    radial-gradient(1.6px 1.6px at 620px 210px, rgba(255, 240, 210, 0.8), transparent),
    radial-gradient(1.8px 1.8px at 840px 680px, rgba(210, 240, 255, 0.85), transparent),
    radial-gradient(1.4px 1.4px at 290px 790px, rgba(240, 245, 255, 0.75), transparent);
  background-size: 1060px 1060px;
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

/* 3. 流星掠过 (斜向拖尾，轨迹从左上到右下，不遮挡中心节点) */
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

.meteor-1 {
  top: 7%;
  left: 8%;
  animation: meteor-sweep-1 16s ease-in infinite;
  animation-delay: 2.5s;
}

.meteor-2 {
  top: 56%;
  left: 20%;
  animation: meteor-sweep-2 23s ease-in infinite;
  animation-delay: 10s;
}

@keyframes meteor-sweep-1 {
  0% {
    opacity: 0;
    transform: rotate(30deg) translate3d(-100px, 0, 0);
  }
  1.5% {
    opacity: 0.9;
  }
  6% {
    opacity: 0.9;
  }
  8% {
    opacity: 0;
    transform: rotate(30deg) translate3d(580px, 0, 0);
  }
  100% {
    opacity: 0;
    transform: rotate(30deg) translate3d(580px, 0, 0);
  }
}

@keyframes meteor-sweep-2 {
  0% {
    opacity: 0;
    transform: rotate(26deg) translate3d(-80px, 0, 0);
  }
  1.2% {
    opacity: 0.9;
  }
  5% {
    opacity: 0.9;
  }
  6.5% {
    opacity: 0;
    transform: rotate(26deg) translate3d(520px, 0, 0);
  }
  100% {
    opacity: 0;
    transform: rotate(26deg) translate3d(520px, 0, 0);
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

/* 5. 轨道流动光脉冲 */
.orbit-pulse {
  fill: none;
  stroke: #ffebb0;
  stroke-width: 1.6px;
  stroke-linecap: round;
  stroke-dasharray: 8 460;
  stroke-opacity: 0.7;
  filter: drop-shadow(0 0 4px rgba(255, 235, 176, 0.8));
  animation: orbit-flow-run 45s linear infinite;
  will-change: stroke-dashoffset;
  pointer-events: none;
}
.orbit-pulse.faint {
  stroke: #bde0fe;
  stroke-width: 1.2px;
  stroke-dasharray: 6 560;
  stroke-opacity: 0.45;
  filter: drop-shadow(0 0 3px rgba(189, 224, 254, 0.6));
  animation-duration: 60s;
  animation-direction: reverse;
}
@keyframes orbit-flow-run {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -936; }
}

/* 6 & 7. 星系外圈光晕呼吸与自转 */
.galaxy-halo {
  fill: none;
  stroke: rgba(201, 184, 134, 0.52);
  stroke-width: 1.8px;
  filter: drop-shadow(0 0 10px rgba(201, 184, 134, 0.55));
  animation: galaxy-halo-breathe 8s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
  will-change: transform, opacity;
  pointer-events: none;
}
.galaxy:nth-child(1) .galaxy-halo { animation-duration: 7s; animation-delay: -1s; }
.galaxy:nth-child(2) .galaxy-halo { animation-duration: 8.5s; animation-delay: -3.2s; }
.galaxy:nth-child(3) .galaxy-halo { animation-duration: 6.8s; animation-delay: -2s; }
.galaxy:nth-child(4) .galaxy-halo { animation-duration: 9.2s; animation-delay: -4.5s; }
.galaxy:nth-child(5) .galaxy-halo { animation-duration: 8s; animation-delay: -2.8s; }

@keyframes galaxy-halo-breathe {
  0%, 100% {
    transform: scale(0.93);
    opacity: 0.32;
  }
  50% {
    transform: scale(1.14);
    opacity: 0.92;
  }
}

.moon-mech-ring {
  transform-origin: 0 0;
  animation: spin-cw 90s linear infinite;
  will-change: transform;
}
.ringworld-rotator {
  transform-origin: 0 0;
  animation: spin-ccw 45s linear infinite;
  will-change: transform;
}
.crystal-rotator {
  transform-origin: 0 0;
  animation: spin-cw 75s linear infinite;
  will-change: transform;
}
.comet-dust {
  transform-origin: -8px 8px;
  animation: spin-ccw 55s linear infinite;
  will-change: transform;
}
.city-lights {
  transform-origin: 0 0;
  animation: spin-cw 100s linear infinite;
  will-change: transform;
}

@keyframes spin-cw {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes spin-ccw {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}

/* 8. 点击波纹扩散环 */
.galaxy-click-ripple {
  fill: none;
  stroke: #ffebb8;
  stroke-width: 2px;
  pointer-events: none;
  transform-box: fill-box;
  transform-origin: center;
  animation: ripple-spread 0.85s cubic-bezier(0.12, 0.8, 0.2, 1) forwards;
  will-change: transform, opacity;
}
@keyframes ripple-spread {
  0% {
    transform: scale(0.25);
    opacity: 0.95;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

.frame {
  position: absolute;
  z-index: 3;
  inset: 8px;
  border: 1px solid rgba(201, 184, 134, 0.34);
  pointer-events: none;
}
.frame i {
  position: absolute;
  width: 28px;
  height: 28px;
  border-color: rgba(201, 184, 134, 0.56);
  border-style: solid;
}
.frame i:nth-child(1) { top: -1px; left: -1px; border-width: 2px 0 0 2px; }
.frame i:nth-child(2) { top: -1px; right: -1px; border-width: 2px 2px 0 0; }
.frame i:nth-child(3) { bottom: -1px; left: -1px; border-width: 0 0 2px 2px; }
.frame i:nth-child(4) { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }

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

/* 星系档案悬浮面板 */
.galaxy-panel {
  display: none;
}
@media (min-width: 768px) {
  .galaxy-panel {
    position: absolute;
    z-index: 7;
    right: 4.6%;
    top: 34%;
    display: block;
    width: 236px;
    padding: 16px 18px 14px;
    background: rgba(8, 17, 32, 0.82);
    border: 1px solid rgba(201, 184, 134, 0.28);
    border-radius: 3px;
    box-shadow: 0 12px 40px rgba(3, 7, 15, 0.65);
    pointer-events: none;
    animation: panel-in 0.28s ease both;
  }
}
.gp-eyebrow {
  margin: 0 0 6px;
  color: rgba(201, 184, 134, 0.6);
  font-size: 10px;
  letter-spacing: 3px;
}
.gp-title {
  margin: 0 0 4px;
  color: #f1e4bd;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 2px;
}
.gp-sub {
  margin: 0 0 10px;
  color: rgba(168, 186, 210, 0.68);
  font-size: 11px;
  letter-spacing: 0.6px;
}
.gp-count {
  margin: 0 0 8px;
  color: #8ab4ff;
  font-size: 11px;
  letter-spacing: 1px;
}
.gp-list {
  margin: 0 0 10px;
  padding: 0;
  list-style: none;
  border-top: 1px solid rgba(201, 184, 134, 0.14);
}
.gp-list li {
  padding: 6px 0;
  border-bottom: 1px solid rgba(84, 118, 166, 0.14);
  color: rgba(198, 212, 232, 0.8);
  font-size: 11px;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gp-empty {
  margin: 0 0 10px;
  color: rgba(150, 164, 186, 0.55);
  font-size: 11px;
}
.gp-more {
  margin: 0;
  color: rgba(201, 184, 134, 0.55);
  font-size: 10px;
  letter-spacing: 1px;
}
@keyframes panel-in {
  from { opacity: 0; transform: translateX(8px); }
  to { opacity: 1; transform: translateX(0); }
}

/* 双层轨道：主轨道实线 + 外层虚线刻度圆环 */
.orbits {
  fill: none;
}
.orbit-solid {
  stroke: #c7b587;
  stroke-width: 1.05px;
  stroke-opacity: 0.32;
}
.orbit-dashed {
  stroke: #e8d9a8;
  stroke-width: 0.85px;
  stroke-opacity: 0.22;
  stroke-dasharray: 4 8;
}
.orbits .faint.orbit-solid {
  stroke-width: 0.8px;
  stroke-opacity: 0.18;
}
.orbits .faint.orbit-dashed {
  stroke-width: 0.7px;
  stroke-opacity: 0.14;
  stroke-dasharray: 3 7;
}

.orbit-markers {
  fill: none;
  stroke: #c9b886;
  stroke-width: 0.9px;
  stroke-opacity: 0.5;
}

/* 星系节点交互与造型 */
.galaxy a {
  text-decoration: none;
  display: block;
}
.galaxy {
  cursor: pointer;
  transition: filter 0.28s ease;
}

/* 造型细节发光 */
.crystal-spine {
  filter: drop-shadow(0 0 3px #afffdc);
}
.crystal-star {
  filter: drop-shadow(0 0 4px #ffffff);
}
.comet-core-glow {
  filter: drop-shadow(0 0 8px #ffba7a);
}
.comet-nucleus {
  filter: drop-shadow(0 0 3px #ffffff);
}
.city-lights {
  filter: drop-shadow(0 0 2px #ffc84a);
}
.atmosphere-glow {
  filter: drop-shadow(0 0 4px #3be5b0);
}

/* Hover 状态：整体提亮发光，加速自转 */
.galaxy:hover {
  filter: drop-shadow(0 0 16px rgba(201, 184, 134, 0.45)) brightness(1.22);
}
.galaxy:hover .galaxy-halo {
  stroke: #fff1bd;
  stroke-opacity: 0.95;
  filter: drop-shadow(0 0 16px rgba(255, 241, 189, 0.85));
  animation-duration: 3.5s;
}
.galaxy:hover .moon-mech-ring {
  animation-duration: 25s;
}
.galaxy:hover .ringworld-rotator {
  animation-duration: 15s;
}
.galaxy:hover .crystal-rotator {
  animation-duration: 22s;
}
.galaxy:hover .comet-dust {
  animation-duration: 18s;
}
.galaxy:hover .city-lights {
  animation-duration: 28s;
}
.galaxy:hover .label {
  fill: #ffffff;
  text-shadow: 0 0 8px rgba(232, 217, 168, 0.55);
}
.galaxy:hover .label-rule {
  stroke: #e8d9a8;
  stroke-opacity: 0.85;
}
.galaxy:hover .sub {
  fill: #c4d3e3;
}

/* 标签排版 */
.label {
  fill: #eee7d5;
  font: 18px Georgia, 'Microsoft YaHei', serif;
  text-anchor: middle;
  letter-spacing: 1.5px;
  transition: fill 0.2s ease, text-shadow 0.2s ease;
}
.label-rule {
  stroke: #d1c39a;
  stroke-opacity: 0.55;
  stroke-width: 1px;
  transition: stroke 0.2s ease, stroke-opacity 0.2s ease;
}
.sub {
  fill: #9eacbd;
  font: 11px 'Microsoft YaHei', sans-serif;
  text-anchor: middle;
  letter-spacing: 0.8px;
  transition: fill 0.2s ease;
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
  .dust-particle:nth-child(n+11) {
    display: none !important;
  }
}

/* 无障碍偏好：关闭所有循环动效与过度过渡 */
@media (prefers-reduced-motion: reduce) {
  .particle,
  .star-field-far,
  .star-field-mid,
  .star-field-near,
  .twinkle-star,
  .meteor-item,
  .dust-particle,
  .orbit-pulse,
  .galaxy-halo,
  .moon-mech-ring,
  .ringworld-rotator,
  .crystal-rotator,
  .comet-dust,
  .city-lights,
  .rotate-icon {
    animation: none !important;
  }
  .galaxy-click-ripple {
    display: none !important;
  }
  .galaxy {
    transition: none;
  }
  .galaxy:hover {
    filter: none;
  }
  .label,
  .label-rule,
  .sub {
    transition: none;
  }
}
</style>
