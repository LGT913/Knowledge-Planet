import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const JOBS = [
  {
    src: 'C:/Users/lenovo/Desktop/leetcode',
    out: 'src/content/notes/algorithm',
    planet: 'algorithm',
    tags: ['算法'],
  },
  {
    src: 'C:/Users/lenovo/Desktop/My-notes/面试知识体系/docs',
    out: 'src/content/notes/system',
    planet: 'system',
    tags: ['八股'],
  },
];

const slugify = (s) =>
  s
    .replace(/\.md$/i, '')
    .trim()
    .replace(/[\s+_]+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

const ymd = (d) => new Date(d).toISOString().slice(0, 10);

for (const job of JOBS) {
  await mkdir(job.out, { recursive: true });
  const names = (await readdir(job.src)).filter((n) => n.endsWith('.md'));

  for (const name of names) {
    const full = path.join(job.src, name);
    const raw = await readFile(full, 'utf8');
    const info = await stat(full);

    const h1 = raw.match(/^#\s+(.+)$/m);
    const title = (h1 ? h1[1] : path.basename(name, '.md')).trim();
    const body = (h1 ? raw.replace(h1[0], '') : raw)
      .trimStart()
      .replace(/\]\(images\//g, '](/images/');

    const fm = [
      '---',
      `title: ${JSON.stringify(title)}`,
      `date: ${ymd(info.mtime)}`,
      `planet: ${job.planet}`,
      `tags: [${job.tags.join(', ')}]`,
      'summary: ""',
      'private: false',
      '---',
      '',
    ].join('\n');

    const file = path.join(job.out, `${slugify(name)}.md`);
    await writeFile(file, fm + body + '\n', 'utf8');
    console.log(`  + ${path.basename(file)}`);
  }
  console.log(`${job.planet}: ${names.length} 篇`);
}
