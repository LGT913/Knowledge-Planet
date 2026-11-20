<template>
  <header class="hud-title" aria-label="Knowledge Planet">
    <h1>Knowledge Planet</h1>
    <p>Java 学习路径・后端知识星系</p>
  </header>
</template>

<style scoped>
.hud-title {
  position: absolute;
  z-index: 6;
  left: 4.6%;
  top: 22px;
  padding: 13px 22px 14px;
  background: rgba(8, 17, 32, 0.55);
  border: 1px solid rgba(201, 184, 134, 0.26);
  box-shadow: 0 0 26px rgba(5, 10, 20, 0.55);
  backdrop-filter: blur(2px);
  pointer-events: auto;
}

.hud-title::after {
  content: '';
  position: absolute;
  inset: -1px;
  border: 1px solid rgba(201, 184, 134, 0.4);
  box-shadow: 0 0 18px rgba(201, 184, 134, 0.16);
  opacity: 0.35;
  animation: hud-breathe 9s ease-in-out infinite;
  pointer-events: none;
}

.hud-title h1 {
  margin: 0;
  font-family: 'Georgia', 'Cinzel', 'Microsoft YaHei', serif;
  font-size: 18px;
  font-weight: 400;
  letter-spacing: 4.5px;
  line-height: 1.2;
  color: #f1e4bd;
  text-shadow: 0 0 10px rgba(201, 184, 134, 0.22);
}

.hud-title p {
  margin: 7px 0 0;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 2px;
  color: rgba(196, 216, 238, 0.72);
}

.hud-title:hover::after {
  opacity: 0.8;
  animation-duration: 5.5s;
}

@keyframes hud-breathe {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.62; }
}

@media (max-width: 767px) {
  .hud-title {
    left: 16px;
    top: 58px;
    padding: 9px 14px 10px;
  }
  .hud-title h1 {
    font-size: 14px;
    letter-spacing: 3px;
  }
  .hud-title p {
    margin-top: 5px;
    font-size: 9px;
    letter-spacing: 1px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hud-title::after,
  .hud-title:hover::after {
    animation: none;
    opacity: 0.5;
  }
}
</style>
