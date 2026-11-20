export type PlanetKey = 'algorithm' | 'system' | 'projects' | 'blog-dev' | 'growth';

export interface Planet {
  key: PlanetKey;
  name: string;
  en: string;
  desc: string;
}

export const PLANETS: Planet[] = [
  { key: 'algorithm', name: '算法星球', en: 'ALGORITHM', desc: '二分 · 滑窗 · 单调栈 · BFS · 回溯' },
  { key: 'system', name: '八股星球', en: 'SYSTEM', desc: 'Java · 并发 · MySQL · Redis · JVM' },
  { key: 'projects', name: '项目星球', en: 'PROJECTS', desc: '博客系统 · QuillAgent' },
];

export const planetByKey = (key: string) => PLANETS.find((p) => p.key === key);
