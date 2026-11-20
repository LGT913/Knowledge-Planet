---
title: "微服务pom后续："
date: 2026-08-12
planet: blog-dev
tags: ["后端", "实战"]
summary: "1. 升级 SCA 到 2025.1.0.0，Nacos 端点异常解决，不再需要 exclude NacosConfigEndpointAutoConfigurationSpring Clo...。 2. 但是 Redisson 不要用 s"
private: false
---
# 微服务pom后续：

目前形势：落到你项目现实可行的两条路线

### 路线一：维持 SpringBoot 4.x（你现在 pom 的选择）

1. 升级 SCA 到 `2025.1.0.0`，Nacos 端点异常解决，**不再需要 exclude NacosConfigEndpointAutoConfiguration**Spring Clo...。
2. **但是 Redisson 不要用 starter！** 即便有 4.1.0 版本，它和 Spring‑Data‑Redis4 还有兼容 bug。
3. 直接用原生`redisson`核心包，手写`RedissonClient`配置类。

> 总结：SCA 可以升级解决 Nacos 问题，Redisson 只能走原生手写 Bean，不能用 starter。

### 路线二（更稳妥，企业实际大多这么选，强烈建议优先评估）

> **把整个项目降级到 SpringBoot 3.5.x + SCA 2025.0.0.0 + Redisson‑starter 3.31.0** 全套生态全部打磨完毕，所有 starter 都正常工作，**不用任何 exclude，不用手写 RedissonConfig**，没有各种临时 hack，没有第三方库适配缺口。
