import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(root, '..');
const target = path.join(root, 'public', 'media');
await fs.mkdir(target, { recursive: true });
await fs.mkdir(path.join(root, 'src'), { recursive: true });
// Generated project folders are disposable. Recreate them so deleted, moved,
// renamed, or replaced source files cannot leave stale artwork in the site.
for (const entry of await fs.readdir(target, { withFileTypes: true })) {
  if (entry.isDirectory() && /^(visual|brand|type|poster|ai)-\d+$/.test(entry.name)) {
    await fs.rm(path.join(target, entry.name), { recursive: true, force: true });
  }
}
const collator = new Intl.Collator('zh-CN', { numeric: true });
async function images(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries.sort((a, b) => collator.compare(a.name, b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...await images(full));
    else if (/\.(jpe?g|png|webp)$/i.test(entry.name)) results.push(full);
  }
  return results;
}
const categories = [
  ['visual', '视觉设计', '视觉设计作品'],
  ['brand', '品牌设计', '品牌设计作品'],
  ['type', '标志 & 字体', '标志&字体设计作品'],
  ['poster', '海报设计', '海报设计作品'],
  ['ai', 'AI 协同设计', 'AI协同设计'],
];
const projects = [];
for (const [category, categoryName, folder] of categories) {
  const base = path.join(source, folder);
  let groups;
  if (category === 'type') groups = [{ title: '标志与字体设计', dir: base }];
  else if (category === 'ai') groups = [
    { title: '多语种海报', dir: path.join(base, '短剧作品', '海报设计作品') },
    { title: '弹窗视觉', dir: path.join(base, '短剧作品', '弹窗设计作品') },
  ];
  else groups = (await fs.readdir(base, { withFileTypes: true }))
    .filter(e => e.isDirectory())
    .sort((a,b) => collator.compare(a.name,b.name))
    .map(e => ({ title: e.name.replace(/^项目\d+[：:]/, ''), dir: path.join(base, e.name) }))
    .filter(group => category !== 'poster' || !['起亚', '海狮'].includes(group.title));
  let index = 0;
  for (const group of groups) {
    const id = `${category}-${++index}`;
    let files = await images(group.dir);
    if (group.direct) files = files.filter(f => path.dirname(f) === group.dir);
    if (!files.length) continue;
    if (category === 'visual') files.sort((a,b) => Number(!/kv/i.test(path.basename(a))) - Number(!/kv/i.test(path.basename(b))));
    const items = [];
    const out = path.join(target, id);
    await fs.mkdir(out, { recursive: true });
    let n = 0;
    for (const file of files) {
      const imageId = String(++n).padStart(2, '0');
      const name = path.basename(file, path.extname(file));
      const output = path.join(out, `${imageId}.webp`);
      await sharp(file, { limitInputPixels: false }).rotate().resize({ width: 2200, height: 14000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86, effort: 4 }).toFile(output);
      const meta = await sharp(output).metadata();
      const section = category === 'visual' ? (/现场照片/.test(file) ? '现场呈现' : /kv/i.test(name) ? '主视觉' : /倒计时|邀请函|kol/i.test(name) ? '线上传播' : '线下物料') : '设计作品';
      items.push({ src: `/media/${id}/${imageId}.webp`, name, width: meta.width, height: meta.height, section });
    }
    await sharp(files[0], { limitInputPixels: false }).rotate().resize({ width: 1100, height: 850, fit: 'inside', withoutEnlargement: true }).webp({ quality: 83 }).toFile(path.join(out, 'cover.webp'));
    let description = '';
    if (category === 'visual') description = `围绕${group.title.replace(/-/g, ' · ')}，将主视觉延展至线上传播与现场物料，构建完整、一致的活动视觉体验。`;
    if (category === 'brand') description = '从品牌识别到应用延展，探索标识、色彩与版式之间的秩序，让品牌在不同触点保持一致的表达。';
    if (category === 'type') description = '以文字与符号建立识别。从字形结构、笔画节奏到标志构成，寻找简洁而鲜明的视觉语言。';
    if (category === 'poster') description = `围绕${group.title}的品牌表达与传播场景，探索图像、字体和信息层级的配合。`;
    if (category === 'ai') description = '将 Prompt 协作融入视觉创作，在方向探索、素材生成、人工精修与版式适配之间建立可复用的设计流程。';
    const tags = category === 'visual' ? ['主 KV', '全案视觉', '线下物料'] : category === 'brand' ? ['品牌识别', 'VI 系统'] : category === 'type' ? ['标志设计', '字体设计'] : category === 'ai' ? (index === 1 ? ['Prompt 协作', '多语种', 'AI 辅助'] : ['Prompt 协作', 'AI 辅助']) : ['海报设计', '视觉传播'];
    projects.push({ id, title: group.title, category, categoryName, description, role: category === 'visual' ? '全案视觉设计' : category === 'ai' ? 'AI 协同 / 视觉设计' : '视觉设计', type: category === 'visual' ? '大型线下活动' : categoryName, tags, cover: `/media/${id}/cover.webp`, images: items });
    console.log(`${id}: ${group.title} — ${items.length} images`);
  }
}
await sharp(path.join(source, '头像.jpg')).resize({ width: 600, withoutEnlargement: true }).webp({ quality: 90 }).toFile(path.join(target, 'portrait.webp'));
await fs.writeFile(path.join(root, 'src', 'projects.json'), JSON.stringify(projects, null, 2));
console.log(`Prepared ${projects.length} projects, ${projects.reduce((n,p) => n + p.images.length, 0)} images.`);
