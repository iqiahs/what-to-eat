// 本地自检脚本：只在开发机上跑，用来校验网页层资源和配置
const fs = require('fs');
const path = require('path');

const root = __dirname;
const www = path.join(root, 'app', 'src', 'main', 'assets', 'www');
let bad = 0;

function ok(m) { console.log('OK   ' + m); }
function fail(m) { bad++; console.log('FAIL ' + m); }

// 1. JSON 文件
for (const p of [path.join(www, 'version.json')]) {
  try { JSON.parse(fs.readFileSync(p, 'utf8')); ok('JSON ' + p); }
  catch (e) { fail('JSON ' + p + ' -> ' + e.message); }
}

// 2. app.js 能否被解析并取出菜谱
const js = fs.readFileSync(path.join(www, 'app.js'), 'utf8');
let dishes = null;
try {
  const sandbox = { window: {}, document: undefined, localStorage: undefined };
  const fn = new Function('window', 'document', 'localStorage', 'setTimeout', 'clearTimeout',
    js.replace(/if \(document\.readyState[\s\S]*$/, '') + '\nreturn BUILTIN;');
  dishes = fn(sandbox.window, { readyState: 'complete', addEventListener() {} },
    { getItem: () => null, setItem() {} }, () => {}, () => {});
} catch (e) {
  fail('app.js 运行/解析失败 -> ' + e.message);
}
if (dishes) {
  ok('app.js 解析成功，内置菜谱 ' + dishes.length + ' 道');
  const byCat = {};
  const seen = new Set();
  let dup = 0;
  for (const d of dishes) {
    byCat[d.cat] = (byCat[d.cat] || 0) + 1;
    const key = d.cat + '/' + d.name;
    if (seen.has(key)) { dup++; console.log('     同分类重复菜名: ' + key); }
    seen.add(key);
  }
  console.log('     分类统计: ' + JSON.stringify(byCat));
  if (dup) fail('同分类内存在 ' + dup + ' 个重复菜名');
  for (const d of dishes) {
    if (!d.name || !d.cat) fail('字段缺失: ' + JSON.stringify(d));
  }
}

// 3. 引用的文件都存在
for (const f of ['index.html', 'app.css', 'app.js', 'version.json']) {
  if (fs.existsSync(path.join(www, f))) ok('文件存在 ' + f);
  else fail('缺少文件 ' + f);
}

// 4. version.json 的 web 版本要和 UpdateManager 里的常量一致
const vj = JSON.parse(fs.readFileSync(path.join(www, 'version.json'), 'utf8'));
const um = fs.readFileSync(path.join(root, 'app', 'src', 'main', 'java', 'com', 'whattoeat', 'app', 'UpdateManager.java'), 'utf8');
const m = um.match(/BUILTIN_WEB_VERSION\s*=\s*(\d+)/);
if (m && Number(m[1]) === vj.web) ok('内置网页版本号一致: v' + vj.web);
else fail('版本号不一致: version.json=' + vj.web + ' UpdateManager=' + (m ? m[1] : '?'));

// 5. version.json 的 files 列表和 UpdateManager 的下载列表
const fm = um.match(/FILE_LIST\s*=\s*\{([^}]*)\}/);
if (fm) {
  const list = fm[1].split(',').map(s => s.trim().replace(/"/g, '')).filter(Boolean);
  const same = list.length === vj.files.length && list.every(f => vj.files.includes(f));
  if (same) ok('热更新文件列表一致: ' + list.join(', '));
  else fail('热更新文件列表不一致: java=' + list.join(',') + ' json=' + vj.files.join(','));
}

// 6. JS 调用的原生方法和 Java 暴露的方法必须一一对应
//    （这类名字写错的话，热更新/自定义菜谱会在手机上静默失效，本机很难发现）
const javaDir = path.join(root, 'app', 'src', 'main', 'java', 'com', 'whattoeat', 'app');
const javaAll = ['MainActivity.java', 'UpdateManager.java', 'WebStore.java']
  .map(f => fs.readFileSync(path.join(javaDir, f), 'utf8')).join('\n');

const javaBridge = new Set(
  [...javaAll.matchAll(/@JavascriptInterface\s+public\s+[\w<>\[\]]+\s+(\w+)\s*\(/g)].map(m => m[1])
);
const jsCalls = new Set(
  [...js.matchAll(/NATIVE\.(\w+)\s*\(/g)].map(m => m[1])
);

const jsMissingInJava = [...jsCalls].filter(n => !javaBridge.has(n));
const javaUnused = [...javaBridge].filter(n => !jsCalls.has(n));

if (jsMissingInJava.length) fail('JS 调用了 Java 里没有的原生方法: ' + jsMissingInJava.join(', '));
else ok('JS 调用的 ' + jsCalls.size + ' 个原生方法在 Java 里都存在');

if (javaUnused.length) console.log('     提示: Java 暴露但 JS 未使用（无害）: ' + javaUnused.join(', '));

// 7. 反向回调：Java -> JS
const javaToJs = [...javaAll.matchAll(/window\.(\w+)\s*&&|window\.(\w+)\(/g)]
  .map(m => m[1] || m[2]).filter(Boolean);
const jsGlobals = new Set([...js.matchAll(/window\.(\w+)\s*=/g)].map(m => m[1]));
const missingCallback = [...new Set(javaToJs)].filter(n => !jsGlobals.has(n));
if (missingCallback.length) fail('Java 会回调但 JS 未定义: ' + missingCallback.join(', '));
else ok('Java -> JS 回调均已定义: ' + [...new Set(javaToJs)].join(', '));

// 8. Java 文件括号配平（用状态机逐字符扫描，正确跳过注释/字符串/字符字面量）
//    注意：不能先用正则删注释再删字符串——URL 里的 "//" 会被当成行注释，导致误报
function balanceOf(src) {
  let brace = 0, paren = 0, bad = false;
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { i += 2; while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '"') { i++; while (i < n && src[i] !== '"') { if (src[i] === '\\') i++; i++; } i++; continue; }
    if (c === "'") { i++; while (i < n && src[i] !== "'") { if (src[i] === '\\') i++; i++; } i++; continue; }
    if (c === '{') brace++;
    else if (c === '}') { brace--; if (brace < 0) bad = true; }
    else if (c === '(') paren++;
    else if (c === ')') { paren--; if (paren < 0) bad = true; }
    i++;
  }
  return { brace, paren, bad };
}

for (const f of ['MainActivity.java', 'UpdateManager.java', 'WebStore.java']) {
  const src = fs.readFileSync(path.join(javaDir, f), 'utf8');
  const b = balanceOf(src);
  if (b.bad || b.brace !== 0 || b.paren !== 0) {
    fail(`${f} 括号不配平 (花括号差 ${b.brace}, 圆括号差 ${b.paren})`);
  } else {
    ok(`${f} 括号配平，共 ${src.split('\n').length} 行`);
  }
}

// 9. 每个被 Java 用到的自有类都必须真实存在
const ownClasses = ['WebStore', 'UpdateManager', 'MainActivity', 'BuildConfig'];
const declared = new Set();
for (const f of ['MainActivity.java', 'UpdateManager.java', 'WebStore.java']) {
  const src = fs.readFileSync(path.join(javaDir, f), 'utf8');
  const mm = src.match(/class\s+(\w+)/g) || [];
  mm.forEach(x => declared.add(x.replace('class ', '').trim()));
}
const missingClasses = ownClasses.filter(c => !declared.has(c) && c !== 'BuildConfig');
if (missingClasses.length) fail('引用了不存在的类: ' + missingClasses.join(', '));
else ok('自有类引用完整: ' + ownClasses.join(', '));

// 10. app.js 引用的元素 ID 必须真实存在于 index.html
//     （打错一个字母 → boot() 抛异常 → 整个页面白屏，这是最难查的一类错）
const html = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
const idRefs = new Set([
  ...[...js.matchAll(/\$\("([^"]+)"\)/g)].map(m => m[1]),
  ...[...js.matchAll(/getElementById\("([^"]+)"\)/g)].map(m => m[1]),
  ...[...js.matchAll(/querySelector\("#([\w-]+)"\)/g)].map(m => m[1]),
]);
const missingIds = [...idRefs].filter(id => !htmlIds.has(id));
if (missingIds.length) fail('app.js 引用了 index.html 里不存在的 ID: ' + missingIds.join(', '));
else ok(`app.js 引用的 ${idRefs.size} 个元素 ID 全部存在`);

const closeTargets = [...html.matchAll(/data-close="([^"]+)"/g)].map(m => m[1]);
const badClose = closeTargets.filter(id => !htmlIds.has(id));
if (badClose.length) fail('data-close 指向不存在的 ID: ' + badClose.join(', '));
else ok('弹层关闭按钮指向正确');

// 11. 语法兼容性：老手机上的 WebView 可能很旧，ES6+ 语法会直接白屏
const ES6 = [
  [/=>/, '箭头函数'], [/`/, '模板字符串'],
  [/(^|[\s;{(])let\s+[A-Za-z_$]/, 'let'], [/(^|[\s;{(])const\s+[A-Za-z_$]/, 'const'],
  [/\bclass\s+[A-Za-z_$]/, 'class'], [/\basync\s+function|\bawait\s/, 'async/await'],
  [/\.\.\.[A-Za-z_$]/, '展开运算符'], [/\?\.[A-Za-z_$]/, '可选链'], [/\?\?/, '空值合并'],
  [/Object\.assign|Array\.from|\.includes\(/, 'ES6+ 内置方法'],
];
const es6Used = ES6.filter(([re]) => re.test(js)).map(([, n]) => n);
if (es6Used.length) {
  fail('网页脚本用了 ES6+ 语法，老 WebView 可能白屏: ' + es6Used.join(' / '));
} else {
  ok('网页脚本是 ES5 语法，兼容所有安卓 WebView');
}

// 12. 文件名大小写审计
//     Windows 不区分大小写、Linux 区分。你本地能编译、上传到 GitHub Actions
//     却失败，十有八九是这里：某个引用的文件名大小写和真实文件对不上。
function exactExists(rel) {
  const parts = rel.split('/').filter(Boolean);
  let cur = root;
  for (const part of parts) {
    if (!fs.existsSync(cur)) return false;
    const entries = fs.readdirSync(cur);
    if (!entries.includes(part)) return false;
    cur = path.join(cur, part);
  }
  return true;
}
const caseTargets = [
  'app/src/main/AndroidManifest.xml',
  'app/src/main/assets/www/index.html',
  'app/src/main/assets/www/app.css',
  'app/src/main/assets/www/app.js',
  'app/src/main/assets/www/version.json',
  'app/src/main/java/com/whattoeat/app/MainActivity.java',
  'app/src/main/java/com/whattoeat/app/UpdateManager.java',
  'app/src/main/java/com/whattoeat/app/WebStore.java',
  'app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
  'app/src/main/res/drawable/ic_launcher_fg.xml',
  'keystore/release.p12',
  '.github/workflows/build-apk.yml',
];
// 先验证检查器本身不是空转
if (exactExists('APP/src/main/AndroidManifest.xml') !== false) {
  fail('大小写检查器失效（把 APP/ 也当成存在）');
} else {
  const wrongCase = caseTargets.filter(f => !exactExists(f));
  if (wrongCase.length) fail('文件名大小写与引用不一致（Linux 上会失败）: ' + wrongCase.join(', '));
  else ok(`文件名大小写全部正确（检查了 ${caseTargets.length} 个关键路径）`);
}

// 13. Android 资源引用必须都有对应定义
const resRoot = path.join(root, 'app', 'src', 'main', 'res');
const allXml = [];
const manifestPath = path.join(root, 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) allXml.push(manifestPath);
(function walkRes(d) {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walkRes(p);
    else if (e.name.endsWith('.xml')) allXml.push(p);
  }
})(resRoot);
const xmlJoined = allXml.map(f => fs.readFileSync(f, 'utf8')).join('\n');
const defined = { drawable: new Set(), mipmap: new Set(), color: new Set(), string: new Set(), style: new Set() };
(function collect(d) {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (/^(drawable|mipmap)/.test(e.name)) {
        const kind = e.name.startsWith('mipmap') ? 'mipmap' : 'drawable';
        for (const f of fs.readdirSync(p)) defined[kind].add(f.replace(/\.[a-z]+$/i, ''));
      }
      collect(p);
    } else if (e.name === 'colors.xml' || e.name === 'strings.xml' || e.name === 'themes.xml') {
      const c = fs.readFileSync(p, 'utf8');
      for (const m of c.matchAll(/<color name="([^"]+)"/g)) defined.color.add(m[1]);
      for (const m of c.matchAll(/<string name="([^"]+)"/g)) defined.string.add(m[1]);
      for (const m of c.matchAll(/<style name="([^"]+)"/g)) defined.style.add(m[1]);
    }
  }
})(resRoot);
const missingRes = [];
for (const m of xmlJoined.matchAll(/@(drawable|mipmap|color|string|style)\/([\w.]+)/g)) {
  if (!defined[m[1]].has(m[2])) missingRes.push(m[0]);
}
if (missingRes.length) fail('资源引用找不到定义: ' + [...new Set(missingRes)].join(', '));
else ok(`Android 资源引用全部有定义（检查了 ${new Set([...xmlJoined.matchAll(/@(drawable|mipmap|color|string|style)\/([\w.]+)/g)].map(m => m[0])).size} 处）`);

console.log(bad === 0 ? '\n全部检查通过' : '\n有 ' + bad + ' 项失败');
process.exit(bad === 0 ? 0 : 1);
