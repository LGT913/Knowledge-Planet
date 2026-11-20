// 星系 = 星球分组（对应 notes 中的文件夹）
// 每个星系下包含若干星球（planet id），每个星球对应一个文件夹里的多篇笔记

export const GALAXIES = [
  {
    id: 'knowledge',
    title: '知识星系',
    sub: '系统知识 · 后端 · 中间件',
    path: '/galaxy/knowledge',
    x: 410,
    y: 392,
    size: 64,
    // 此星系下包含的星球文件夹
    planets: ['system'],
  },
  {
    id: 'algorithm',
    title: '算法星系',
    sub: 'LeetCode · 模板 · 题单',
    path: '/galaxy/algorithm',
    x: 1160,
    y: 212,
    size: 56,
    planets: ['algorithm'],
  },
  {
    id: 'projects',
    title: '作品星系',
    sub: '博客 · QuillAgent',
    path: '/galaxy/projects',
    x: 1180,
    y: 710,
    size: 58,
    planets: ['projects'],
  },
  {
    id: 'blog-dev',
    title: '工程星系',
    sub: '部署 · 运维 · 架构',
    path: '/galaxy/blog-dev',
    x: 825,
    y: 562,
    size: 52,
    planets: ['blog-dev'],
  },
  {
    id: 'growth',
    title: '成长星系',
    sub: '周计划 · 复盘',
    path: '/galaxy/growth',
    x: 370,
    y: 720,
    size: 48,
    planets: ['growth'],
  },
];

// 星系与星球文件夹的交叉索引（供详情页反向查询）
export const PLANET_TO_GALAXY = Object.fromEntries(
  GALAXIES.flatMap((g) => g.planets.map((p) => [p, g.id])),
);
