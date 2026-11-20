// 视图 A：星轨航图节点（坐标基于 1600 x 1000 画布）
export const PLANETS = [
  { id: 'algorithm', title: '算法笔记', sub: '专题 · 模板 · 题单', path: '/docs/algorithm', x: 800, y: 265, size: 40 },
  { id: 'java', title: 'Java 八股', sub: '并发 · JVM · 框架', path: '/docs/java', x: 1125, y: 400, size: 34 },
  { id: 'projects', title: '项目作品集', sub: '博客 · QuillAgent', path: '/docs/projects', x: 690, y: 820, size: 38 },
  { id: 'growth', title: '成长随笔', sub: '周计划 · 复盘', path: '/docs/growth', x: 370, y: 590, size: 30 },
  { id: 'graduation', title: '毕业设计', sub: '选题 · 论文 · 答辩', path: '/docs/graduation', x: 1205, y: 745, size: 32 },
];

// 视图 B：命路歧图里程碑（坐标基于 1840 x 900 画布）
export const ROADMAP = [
  { id: 'java-basic', title: 'Java 基础', sub: '集合 · IO · 泛型', path: '/docs/java-basic', x: 180, y: 700 },
  { id: 'juc', title: 'JUC 并发', sub: '线程池 · AQS', path: '/docs/juc', x: 400, y: 600 },
  { id: 'jvm', title: 'JVM', sub: '内存 · GC · 调优', path: '/docs/jvm', x: 620, y: 520 },
  { id: 'mysql', title: 'MySQL', sub: '索引 · 事务', path: '/docs/mysql', x: 840, y: 600 },
  { id: 'redis', title: 'Redis', sub: '缓存 · 持久化', path: '/docs/redis', x: 1060, y: 520 },
  { id: 'microservice', title: '微服务项目', sub: 'Cloud · 部署', path: '/docs/microservice', x: 1280, y: 440 },
  { id: 'algo-training', title: '算法刷题', sub: 'Hot100 · 模板', path: '/docs/algo-training', x: 1460, y: 640 },
  { id: 'graduation', title: '毕业设计', sub: '论文 · 答辩', path: '/docs/graduation', x: 1660, y: 520 },
];

// 主线：按顺序连接全部里程碑；分线：微服务 → 算法刷题
const link = (a, b) => `M${a.x} ${a.y} C${a.x + 120} ${a.y}, ${b.x - 120} ${b.y}, ${b.x} ${b.y}`;

export const ROADMAP_LINKS = [
  ...ROADMAP.slice(0, -1).map((n, i) => ({ d: link(n, ROADMAP[i + 1]), branch: false })),
  { d: link(ROADMAP[5], ROADMAP[6]), branch: true },
];
