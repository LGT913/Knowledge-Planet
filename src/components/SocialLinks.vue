<template>
  <div class="social-links" aria-label="仓库与联系方式">
    <a
      class="social-icon"
      href="https://github.com/LGT913"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="GitHub 仓库"
      title="GitHub"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
      </svg>
    </a>
    <a
      class="social-icon"
      href="https://mail.qq.com/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="QQ 邮箱 2921361233@qq.com"
      title="邮箱 2921361233@qq.com"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3.5 7 8.5 6 8.5-6" />
      </svg>
    </a>
  </div>
</template>

<style scoped>
.social-links {
  position: absolute;
  z-index: 5;
  right: calc(5.5% + 240px);
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 14px;
  pointer-events: auto;
}

.social-icon {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  color: rgba(240, 244, 248, 0.88);
  transition: color 0.6s ease, filter 0.6s ease;
  filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0));
}

.social-icon svg {
  width: 20px;
  height: 20px;
  display: block;
}

.social-icon:hover,
.social-icon:focus-visible {
  color: #ffffff;
  filter: drop-shadow(0 0 7px rgba(255, 255, 255, 0.55));
  animation: social-glow 3.8s ease-in-out infinite;
}

.social-icon:focus-visible {
  outline: 1px solid rgba(201, 184, 134, 0.6);
  outline-offset: 4px;
  border-radius: 2px;
}

@keyframes social-glow {
  0%, 100% {
    filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.28));
  }
  50% {
    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.7));
  }
}

@media (max-width: 767px) {
  .social-links {
    right: calc(20px + 210px);
    bottom: 8px;
    gap: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .social-icon,
  .social-icon:hover {
    animation: none;
    transition: none;
  }
}
</style>
