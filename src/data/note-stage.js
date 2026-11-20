import stageMap from './note-stages.json';

// Astro 的 content id 会被 github-slugger 小写化（如 AQS -> aqs），
// 因此按 filePath 的原始大小写匹配，缺失时再退化到小写 id。
const lowerIndex = new Map(
  Object.entries(stageMap).map(([key, value]) => [key.toLowerCase(), value]),
);

function stripPrefix(p) {
  return p.replace(/\\/g, '/').replace(/^.*?content\/notes\//, '');
}

export function stageOf(entry) {
  const fromPath = stageMap[stripPrefix(entry.filePath ?? '')];
  if (fromPath) return fromPath;

  const id = entry.id ?? '';
  const direct = stageMap[id] ?? stageMap[`${id}.md`];
  if (direct) return direct;

  return lowerIndex.get(`${id}.md`.toLowerCase()) ?? entry.data.planet;
}
