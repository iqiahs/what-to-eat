/* ===========================================================
   今天吃什么 —— 网页层（可被 GitHub 热更新）
   所有联网动作都交给安卓原生层，这里只管界面和随机逻辑。
   =========================================================== */

var NATIVE = window.Native || null;

/* ---------------- 内置菜谱（可直接在这里加菜） ---------------- */
/* 格式：[菜名, 分类, [标签]] */
var BUILTIN_RAW = [
  /* ===== 早餐 ===== */
  ["小笼包 + 豆浆", "早餐", ["食堂", "经典"]],
  ["煎饼果子", "早餐", ["路边摊", "快手"]],
  ["鸡蛋灌饼", "早餐", ["路边摊"]],
  ["肉夹馍", "早餐", ["路边摊", "扛饿"]],
  ["手抓饼 + 里脊", "早餐", ["路边摊"]],
  ["包子 + 小米粥", "早餐", ["食堂"]],
  ["豆腐脑 + 油条", "早餐", ["南北之争"]],
  ["胡辣汤 + 水煎包", "早餐", ["河南"]],
  ["肠粉 + 艇仔粥", "早餐", ["广东"]],
  ["皮蛋瘦肉粥", "早餐", ["清淡"]],
  ["白粥 + 咸鸭蛋", "早餐", ["清淡"]],
  ["小馄饨", "早餐", ["汤水"]],
  ["生煎包", "早餐", ["上海"]],
  ["锅贴 + 玉米粥", "早餐", ["食堂"]],
  ["蒸饺 + 豆浆", "早餐", ["食堂"]],
  ["烧麦 + 豆浆", "早餐", ["食堂"]],
  ["叉烧包 + 豆浆", "早餐", ["广东"]],
  ["糯米鸡", "早餐", ["广东"]],
  ["茶叶蛋 + 玉米", "早餐", ["快手"]],
  ["烤冷面", "早餐", ["东北", "路边摊"]],
  ["鸡蛋饼 + 牛奶", "早餐", ["食堂"]],
  ["三明治 + 咖啡", "早餐", ["西式", "省事"]],
  ["吐司 + 牛奶麦片", "早餐", ["西式"]],
  ["黄油面包 + 酸奶", "早餐", ["西式"]],
  ["水煮蛋 + 牛奶 + 面包", "早餐", ["省事"]],
  ["酸奶 + 水果麦片", "早餐", ["轻食"]],
  ["菜煎饼", "早餐", ["山东"]],
  ["葱油饼 + 豆浆", "早餐", ["香"]],
  ["汤包 + 鸭血粉丝", "早餐", ["南京"]],
  ["米线 + 卤蛋", "早餐", ["云南"]],
  ["油茶 + 麻花", "早餐", ["特色"]],
  ["全麦贝果 + 美式", "早餐", ["西式"]],

  /* ===== 正餐 ===== */
  ["黄焖鸡米饭", "正餐", ["食堂", "外卖", "米饭"]],
  ["宫保鸡丁盖饭", "正餐", ["食堂", "米饭"]],
  ["鱼香肉丝盖饭", "正餐", ["食堂", "米饭"]],
  ["麻婆豆腐盖饭", "正餐", ["食堂", "米饭"]],
  ["番茄炒蛋盖饭", "正餐", ["食堂", "便宜"]],
  ["红烧肉 + 米饭", "正餐", ["食堂", "硬菜"]],
  ["回锅肉 + 米饭", "正餐", ["川菜"]],
  ["糖醋里脊 + 米饭", "正餐", ["酸甜"]],
  ["土豆炖牛肉 + 米饭", "正餐", ["硬菜"]],
  ["青椒肉丝盖饭", "正餐", ["食堂"]],
  ["干煸豆角 + 米饭", "正餐", ["川菜"]],
  ["酸辣土豆丝 + 米饭", "正餐", ["便宜"]],
  ["地三鲜盖饭", "正餐", ["东北"]],
  ["辣子鸡", "正餐", ["川菜", "下饭"]],
  ["水煮肉片", "正餐", ["川菜"]],
  ["水煮鱼", "正餐", ["川菜"]],
  ["酸菜鱼 + 米饭", "正餐", ["下饭"]],
  ["毛血旺", "正餐", ["川菜"]],
  ["农家小炒肉", "正餐", ["湘菜"]],
  ["木须肉", "正餐", ["家常"]],
  ["京酱肉丝", "正餐", ["家常"]],
  ["蚝油生菜 + 米饭", "正餐", ["清淡"]],
  ["蒜蓉西兰花 + 米饭", "正餐", ["清淡"]],
  ["铁板豆腐 + 米饭", "正餐", ["小吃街"]],
  ["干锅花菜", "正餐", ["下饭"]],
  ["大盘鸡 + 皮带面", "正餐", ["新疆", "硬菜"]],
  ["咖喱鸡饭", "正餐", ["食堂"]],
  ["炸鸡饭", "正餐", ["外卖"]],
  ["鸡排饭", "正餐", ["外卖"]],
  ["猪脚饭", "正餐", ["广东", "扛饿"]],
  ["烤肉拌饭", "正餐", ["外卖"]],
  ["石锅拌饭", "正餐", ["韩式"]],
  ["黄焖排骨米饭", "正餐", ["外卖"]],
  ["兰州牛肉面", "正餐", ["面食", "汤水"]],
  ["重庆小面", "正餐", ["面食", "辣"]],
  ["热干面", "正餐", ["武汉"]],
  ["炸酱面", "正餐", ["面食", "北京"]],
  ["油泼面", "正餐", ["陕西"]],
  ["刀削面", "正餐", ["山西"]],
  ["西红柿鸡蛋面", "正餐", ["家常", "省事"]],
  ["担担面", "正餐", ["川菜"]],
  ["螺蛳粉", "正餐", ["广西", "上头"]],
  ["桂林米粉", "正餐", ["广西"]],
  ["过桥米线", "正餐", ["云南"]],
  ["酸辣粉 + 肉夹馍", "正餐", ["小吃街"]],
  ["羊肉泡馍", "正餐", ["陕西"]],
  ["牛肉汤 + 饼", "正餐", ["汤水"]],
  ["鸡公煲 + 米饭", "正餐", ["外卖"]],
  ["麻辣香锅", "正餐", ["下饭", "自由搭配"]],
  ["冒菜 + 米饭", "正餐", ["下饭"]],
  ["麻辣烫", "正餐", ["自由搭配"]],
  ["串串香", "正餐", ["自由搭配"]],
  ["关东煮 + 饭团", "正餐", ["省事"]],
  ["寿司拼盘", "正餐", ["日式"]],
  ["日式咖喱猪排饭", "正餐", ["日式"]],
  ["卤肉饭", "正餐", ["台湾"]],
  ["鸡腿饭 + 青菜", "正餐", ["食堂"]],
  ["食堂两荤一素套餐", "正餐", ["食堂", "经典"]],
  ["食堂一荤两素套餐", "正餐", ["食堂", "便宜"]],
  ["蛋炒饭 + 紫菜汤", "正餐", ["便宜", "省事"]],
  ["扬州炒饭", "正餐", ["米饭"]],
  ["手抓饭", "正餐", ["新疆"]],
  ["煲仔饭", "正餐", ["广东"]],
  ["砂锅米线", "正餐", ["汤水"]],
  ["瓦罐汤 + 米饭", "正餐", ["江西"]],
  ["快餐盖浇饭", "正餐", ["食堂"]],
  ["麻辣拌", "正餐", ["东北"]],
  ["烤鱼 + 米饭", "正餐", ["聚餐"]],
  ["一人食小火锅", "正餐", ["自由搭配"]],
  ["新疆炒米粉", "正餐", ["辣", "上头"]],
  ["凉皮 + 肉夹馍", "正餐", ["陕西", "夏天"]],
  ["披萨", "正餐", ["西式", "外卖"]],
  ["汉堡套餐", "正餐", ["西式", "快"]],
  ["炸鸡 + 可乐", "正餐", ["西式", "快"]],
  ["番茄肉酱意面", "正餐", ["西式"]],
  ["蛋包饭", "正餐", ["日式"]],
  ["铁板炒面", "正餐", ["小吃街"]],
  ["干炒牛河", "正餐", ["广东"]],
  ["炒河粉", "正餐", ["广东"]],
  ["云吞面", "正餐", ["广东", "汤水"]],
  ["自助小炒 + 米饭", "正餐", ["食堂"]],
  ["香锅拌面", "正餐", ["外卖"]],
  ["土豆粉", "正餐", ["汤水"]],
  ["砂锅粥 + 小菜", "正餐", ["清淡"]],
  ["烤鸭饭", "正餐", ["外卖"]],
  ["酸汤肥牛 + 米饭", "正餐", ["下饭"]],

  /* ===== 夜宵 ===== */
  ["烧烤大拼盘", "夜宵", ["聚餐", "啤酒"]],
  ["烤串 + 冰啤酒", "夜宵", ["经典"]],
  ["炸鸡 + 啤酒", "夜宵", ["韩式"]],
  ["麻辣小龙虾", "夜宵", ["夏天", "聚餐"]],
  ["关东煮", "夜宵", ["暖"]],
  ["烤冷面 + 烤肠", "夜宵", ["路边摊"]],
  ["手抓饼 + 里脊", "夜宵", ["路边摊"]],
  ["铁板鱿鱼", "夜宵", ["路边摊"]],
  ["炒面 + 烤肠", "夜宵", ["满足"]],
  ["蛋炒饭 + 紫菜汤", "夜宵", ["省事"]],
  ["螺蛳粉", "夜宵", ["上头"]],
  ["麻辣烫", "夜宵", ["自由搭配"]],
  ["冒菜", "夜宵", ["下饭"]],
  ["串串香", "夜宵", ["自由搭配"]],
  ["小火锅", "夜宵", ["暖"]],
  ["烤鱼", "夜宵", ["聚餐"]],
  ["炸串 + 冰粉", "夜宵", ["路边摊"]],
  ["章鱼小丸子", "夜宵", ["日式"]],
  ["韩式炸鸡", "夜宵", ["甜辣"]],
  ["冷面", "夜宵", ["东北"]],
  ["卤味拼盘", "夜宵", ["啤酒"]],
  ["鸭脖 + 鸭锁骨", "夜宵", ["追剧"]],
  ["柠檬凤爪", "夜宵", ["追剧"]],
  ["烤红薯", "夜宵", ["冬天", "暖"]],
  ["泡面 + 肠 + 蛋", "夜宵", ["宿舍", "经典"]],
  ["自热火锅", "夜宵", ["宿舍"]],
  ["煎饺 + 醋", "夜宵", ["夜市"]],
  ["锅贴", "夜宵", ["夜市"]],
  ["小馄饨", "夜宵", ["暖"]],
  ["酸辣粉", "夜宵", ["夜市"]],
  ["鸭血粉丝汤", "夜宵", ["南京"]],
  ["肉夹馍", "夜宵", ["扛饿"]],
  ["炸鸡 + 奶茶", "夜宵", ["快乐"]],
  ["烤面筋 + 烤玉米", "夜宵", ["路边摊"]],
  ["铁板豆腐 + 烤冷面", "夜宵", ["路边摊"]],
  ["新疆烤包子", "夜宵", ["香"]],
  ["深夜食堂炒饭", "夜宵", ["宿舍"]],

  /* ===== 小吃 ===== */
  ["凉皮", "小吃", ["夏天"]],
  ["鸡蛋仔", "小吃", ["甜"]],
  ["狼牙土豆", "小吃", ["辣"]],
  ["锅巴土豆", "小吃", ["香"]],
  ["脆皮五花肉", "小吃", ["网红"]],
  ["盐酥鸡", "小吃", ["台湾"]],
  ["生煎包", "小吃", ["上海"]],
  ["烤肠", "小吃", ["随手"]],
  ["糖葫芦", "小吃", ["冬天"]],
  ["烤面筋", "小吃", ["路边摊"]],
  ["华夫饼", "小吃", ["甜"]],
  ["冰淇淋", "小吃", ["夏天"]],
  ["奶茶 + 蛋挞", "小吃", ["快乐"]],
  ["柠檬茶 + 水果捞", "小吃", ["夏天"]],
  ["双皮奶", "小吃", ["广东", "甜"]],
  ["蛋挞", "小吃", ["甜"]],
  ["泡芙", "小吃", ["甜"]],
  ["鸡蛋灌饼", "小吃", ["路边摊"]],
  ["肠粉", "小吃", ["广东"]],
  ["鱼蛋 + 萝卜牛杂", "小吃", ["广东"]],
  ["烤冷面", "小吃", ["东北"]],
  ["炸鸡柳", "小吃", ["随手"]],
  ["灌汤包", "小吃", ["汤水"]],
  ["现烤鸡蛋糕", "小吃", ["甜"]],
  ["冰糖雪梨", "小吃", ["润"]]
];

var BUILTIN = BUILTIN_RAW.map(function (d) {
  return { name: d[0], cat: d[1], tags: d[2] || [], mine: false };
});

/* ---------------- 状态 ---------------- */
var CATS = ["全部", "早餐", "正餐", "夜宵", "小吃"];
var MINE_CAT = "我的食堂";   // 固定排在「全部」右边第一个
var state = {
  filter: "全部",
  custom: [],
  last: null,
  generated: false,
  info: {},
  genCount: 0,      // 没有自定义菜时，点了几次生成
  hintShown: false, // 引导语是否已经给过（每个用户只给一次）
  vibLevel: 2,      // 震动强度 0~3
  sndLevel: 1       // 提示音音量 0~3
};

var $ = function (id) { return document.getElementById(id); };

/* ---------------- 存储 ---------------- */
function loadCustom() {
  try {
    if (NATIVE && NATIVE.loadCustom) {
      var s = NATIVE.loadCustom();
      if (!s || s === "null") return [];
      var arr = JSON.parse(s);
      return Array.isArray(arr) ? arr : [];
    }
    return JSON.parse(localStorage.getItem("customDishes") || "[]");
  } catch (e) { return []; }
}

function saveCustom(list) {
  var s = JSON.stringify(list);
  try {
    if (NATIVE && NATIVE.saveCustom) { NATIVE.saveCustom(s); return true; }
    localStorage.setItem("customDishes", s);
    return true;
  } catch (e) { return false; }
}

/* ---------------- 通用偏好（配色等） ----------------
   优先存到安卓原生（SharedPreferences），这样即使网页存储被清掉也不会丢。
   老版本 App 没有这两个原生方法，会自动退回 localStorage。 */
function loadPref(key, def) {
  try {
    if (NATIVE && NATIVE.getSetting) {
      var v = NATIVE.getSetting(key);
      if (v !== null && v !== undefined && v !== "") return v;
    }
  } catch (e) {}
  try {
    var v2 = localStorage.getItem("pref_" + key);
    if (v2 !== null && v2 !== undefined && v2 !== "") return v2;
  } catch (e) {}
  return def;
}

function savePref(key, value) {
  try {
    if (NATIVE && NATIVE.setSetting) { NATIVE.setSetting(key, value); return; }
  } catch (e) {}
  try { localStorage.setItem("pref_" + key, value); } catch (e) {}
}

/* 档位选择控件（震动/音量）：4 个按钮，选中项高亮 */
function bindSeg(id, stateKey, prefKey, onChange) {
  var box = $(id);
  if (!box) return;
  var btns = box.querySelectorAll("button");
  function paint() {
    Array.prototype.forEach.call(btns, function (b) {
      b.className = (Number(b.getAttribute("data-v")) === state[stateKey]) ? "on" : "";
    });
  }
  Array.prototype.forEach.call(btns, function (b) {
    b.onclick = function () {
      state[stateKey] = Number(b.getAttribute("data-v"));
      savePref(prefKey, String(state[stateKey]));
      paint();
      if (onChange) onChange(state[stateKey]);
    };
  });
  paint();
}

/* ---------------- 配色主题 ---------------- */
/* 用低饱和的实物色，而不是糖果色渐变：更接近正常 App 的观感 */
var THEMES = [
  { id: "celadon", name: "青瓷", dot: "#3E7F6A", bg: "#F3F7F5" },
  { id: "indigo",  name: "靛蓝", dot: "#3B5487", bg: "#F4F6FA" },
  { id: "clay",    name: "陶土", dot: "#B45A3C", bg: "#FBF6F2" },
  { id: "apricot", name: "杏黄", dot: "#A87C22", bg: "#FBF9F3" },
  { id: "ink",     name: "墨黑", dot: "#D9A441", bg: "#16181A" }
];

var themeId = "celadon";

function themeById(id) {
  for (var i = 0; i < THEMES.length; i++) {
    if (THEMES[i].id === id) return THEMES[i];
  }
  return THEMES[0];
}

function applyTheme(id, persist) {
  var t = themeById(id);
  themeId = t.id;
  document.documentElement.setAttribute("data-theme", t.id);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", t.bg);
  if (persist) savePref("theme", t.id);
  renderSwatches();
}

function renderSwatches() {
  var box = $("swatches");
  if (!box) return;
  box.innerHTML = "";
  THEMES.forEach(function (t) {
    var wrap = document.createElement("div");
    wrap.className = "swatch-wrap";

    var b = document.createElement("button");
    b.className = "swatch" + (t.id === themeId ? " on" : "");
    b.style.background = t.dot;
    b.setAttribute("aria-label", t.name);
    b.onclick = function () {
      applyTheme(t.id, true);
      toast("已换成「" + t.name + "」配色");
    };

    var n = document.createElement("div");
    n.className = "swatch-name";
    n.textContent = t.name;

    wrap.appendChild(b);
    wrap.appendChild(n);
    box.appendChild(wrap);
  });
}

/* ---------------- 提示 ---------------- */
var toastTimer = null;
function toast(msg) {
  var el = $("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.hidden = true; }, 2200);
}

/* ---------------- 分类栏 ---------------- */
function renderChips() {
  var box = $("chips");
  box.innerHTML = "";
  // 顺序：全部 → 我的食堂 → 早餐 → 正餐 → 夜宵 → 小吃
  var cats = ["全部", MINE_CAT, "早餐", "正餐", "夜宵", "小吃"];
  cats.forEach(function (c) {
    var b = document.createElement("button");
    b.className = "chip" + (state.filter === c ? " on" : "");
    b.textContent = c + (c === MINE_CAT && state.custom.length > 0 ? " " + state.custom.length : "");
    b.onclick = function () {
      state.filter = c;
      renderChips();
      updateHint();
    };
    box.appendChild(b);
  });
}

/* ---------------- 候选菜池 ---------------- */
function pool() {
  var all = BUILTIN.concat(state.custom.map(function (c) {
    return { name: c.name, cat: c.cat || "正餐", tags: [], mine: true };
  }));
  var picked;
  if (state.filter === "全部") picked = all;
  else if (state.filter === MINE_CAT) picked = all.filter(function (d) { return d.mine; });
  else picked = all.filter(function (d) { return d.cat === state.filter; });

  // 同一道菜可能同时属于多个分类（比如螺蛳粉既是正餐也是夜宵），按名字去重
  var seen = {}, out = [];
  picked.forEach(function (d) {
    if (seen[d.name]) return;
    seen[d.name] = true;
    out.push(d);
  });
  return out;
}

function updateHint() {
  $("poolCount").textContent = pool().length;
  // 选中「我的食堂」时，把"添加/管理"入口显示出来
  var mr = $("manageRow");
  if (mr) mr.hidden = (state.filter !== MINE_CAT);
}

/* ---------------- 震动 & 提示音 ---------------- */
var audioCtx = null;

function doFeedback() {
  // 震动优先走原生（Android 需要 VIBRATE 权限，网页版没有就忽略）
  var lv = state.vibLevel;
  if (lv > 0) {
    try {
      if (NATIVE && NATIVE.vibrate) NATIVE.vibrate(lv);
      else if (navigator.vibrate) navigator.vibrate(10 * lv);
    } catch (e) {}
  }
  playTick(state.sndLevel);
}

/* 很轻的一声"嗒"，用 Web Audio 现场合成，不需要任何音频文件 */
function playTick(level) {
  if (level <= 0) return;
  try {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended" && audioCtx.resume) audioCtx.resume();
    var t = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 520 + level * 90;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.015 + level * 0.022, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09 + level * 0.02);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.12 + level * 0.03);
  } catch (e) {}
}

/* ---------------- 生成 ---------------- */
/* 没有自定义菜、又生成满 3 次时，给一次引导；每个用户只给一次（重装才会再有） */
function showCustomTip() {
  $("placeholder").hidden = true;
  $("result").hidden = true;
  var box = $("tipMsg");
  box.innerHTML = "";
  box.appendChild(document.createTextNode("没有想吃的？试一试上面第二个"));
  var hl = document.createElement("span");
  hl.className = "hl";
  hl.textContent = "「我的食堂」";
  box.appendChild(hl);
  box.appendChild(document.createTextNode("，可以把食堂或者餐馆的菜填进去哦"));
  box.hidden = false;

  state.hintShown = true;
  savePref("hintShown", "1");
  $("genBtn").textContent = "换一餐";
}

function generate() {
  var counting = (state.custom.length === 0 && state.filter !== MINE_CAT);
  if (counting) {
    state.genCount++;
    savePref("genCount", String(state.genCount));
    if (!state.hintShown && state.genCount >= 3) {
      doFeedback();
      showCustomTip();
      return;
    }
  }

  var list = pool();
  if (list.length === 0) {
    if (state.filter === MINE_CAT) {
      // 我的食堂还是空的，直接把添加页面打开，别让用户卡在这
      openSheet("mineSheet");
    } else {
      toast("这个分类还没有菜");
    }
    return;
  }
  var d = list[Math.floor(Math.random() * list.length)];
  var tries = 0;
  while (list.length > 1 && state.last && d.name === state.last.name && tries < 12) {
    d = list[Math.floor(Math.random() * list.length)];
    tries++;
  }
  state.last = d;
  state.generated = true;

  $("placeholder").hidden = true;
  $("tipMsg").hidden = true;
  $("result").hidden = false;
  $("dishName").textContent = d.name;

  // 只有一个标签：菜品类别（原来自定义菜会重复出现两个一样的标签）
  var meta = $("dishMeta");
  meta.innerHTML = "";
  var s = document.createElement("span");
  s.className = "tag";
  s.textContent = d.cat;
  meta.appendChild(s);

  var nameEl = $("dishName");
  nameEl.style.animation = "none";
  void nameEl.offsetWidth;
  nameEl.style.animation = "";

  $("genBtn").textContent = "换一餐";

  doFeedback();
}

/* ---------------- 我的菜谱 ---------------- */
function renderMine() {
  var ul = $("mineList");
  ul.innerHTML = "";
  if (state.custom.length === 0) {
    var li = document.createElement("li");
    li.className = "empty";
    li.textContent = "还没有自定义的菜";
    ul.appendChild(li);
    return;
  }
  state.custom.forEach(function (c, i) {
    var li = document.createElement("li");
    var left = document.createElement("span");
    left.textContent = c.name;
    var cat = document.createElement("span");
    cat.className = "cat";
    cat.textContent = c.cat || "正餐";
    left.appendChild(cat);

    var del = document.createElement("button");
    del.className = "del";
    del.textContent = "删除";
    del.onclick = function () {
      state.custom.splice(i, 1);
      saveCustom(state.custom);
      renderMine();
      renderChips();
      updateHint();
      toast("已删除");
    };
    li.appendChild(left);
    li.appendChild(del);
    ul.appendChild(li);
  });
}

function addDish() {
  var input = $("newDish");
  var name = (input.value || "").trim();
  if (!name) { toast("先输入菜名"); return; }
  if (name.length > 20) { toast("菜名太长啦"); return; }
  var exists = state.custom.some(function (c) { return c.name === name; });
  if (exists) { toast("这道菜已经在你的菜谱里了"); return; }
  state.custom.push({ name: name, cat: $("newCat").value });
  saveCustom(state.custom);
  input.value = "";
  renderMine();
  renderChips();
  updateHint();
  toast("已添加：" + name);
}

/* ---------------- 弹层 ---------------- */
var openSheetId = null;

function openSheet(id) {
  $("mineSheet").hidden = true;
  $("setSheet").hidden = true;
  $(id).hidden = false;
  $("mask").hidden = false;
  openSheetId = id;
  if (NATIVE && NATIVE.setBackHandled) NATIVE.setBackHandled(true);
}

function closeSheets() {
  $("mineSheet").hidden = true;
  $("setSheet").hidden = true;
  $("mask").hidden = true;
  openSheetId = null;
  if (NATIVE && NATIVE.setBackHandled) NATIVE.setBackHandled(false);
}

window.closeTopSheet = function () { closeSheets(); };

/* ---------------- 设置 ---------------- */
function applyInfo(info) {
  state.info = info || {};
  var s = state.info;
  var box = $("infoBox");
  if (!box) return;

  var lastCheck = s.lastCheck ? new Date(s.lastCheck).toLocaleString() : "—";
  box.innerHTML =
    "内置网页版本：<b>v" + (s.builtinWebVersion || 1) + "</b><br>" +
    "当前网页版本：<b>v" + (s.webVersion || s.builtinWebVersion || 1) + "</b>" +
    (s.remoteWebVersion ? "（仓库最新 v" + s.remoteWebVersion + "）" : "") + "<br>" +
    "App 版本：<b>v" + (s.appVersion || "-") + "</b> (" + (s.appVersionCode || "-") + ")<br>" +
    "更新源：<b>" + (s.source ? s.source : "未设置") + "</b><br>" +
    "上次检查：" + lastCheck + "<br>" +
    "状态：" + (s.message || "—");

  var banner = $("banner");
  if (s.hasApkUpdate) {
    banner.hidden = false;
    $("bannerText").textContent = "发现新版本 App，建议更新";
  } else {
    banner.hidden = true;
  }
}

function checkUpdate() {
  if (NATIVE && NATIVE.checkUpdate) {
    NATIVE.checkUpdate();
    toast("正在检查…");
  } else {
    toast("浏览器里无法检查更新");
  }
}

/* ---------------- 原生回调 ---------------- */
window.onNativeStatus = function (json) {
  var info;
  try { info = typeof json === "string" ? JSON.parse(json) : json; }
  catch (e) { return; }
  applyInfo(info);

  if (info.state === "diag") {
    // 自检结果：直接把多行报告摊在设置里，不要弹 toast
    var box = $("diagBox");
    if (box) { box.textContent = info.message || "（没有结果）"; box.hidden = false; }
    return;
  }
  if (info.state === "updated") {
    // 真的更新了，这个无论手动还是自动都值得说一声
    toast("网页已更新到 v" + info.remoteWebVersion);
    return;
  }
  // 其余状态只在"用户主动点检查"时才弹提示，
  // 否则每次开 App 都会蹦一句"已经是最新版"，很烦
  if (!info.manual) return;
  if (info.state === "up-to-date") toast("已经是最新版");
  else if (info.state === "error") toast(info.message || "检查失败");
  else if (info.state === "no-source") toast("还没设置更新源");
};

/* ---------------- 启动 ---------------- */
function boot() {
  state.custom = loadCustom();

  // 配色：先按存过的值贴上，再画可选色块
  themeId = themeById(loadPref("theme", "celadon")).id;
  applyTheme(themeId, false);

  // 其它偏好（都存在手机本地，热更新不会丢）
  state.genCount = parseInt(loadPref("genCount", "0"), 10) || 0;
  state.hintShown = loadPref("hintShown", "") === "1";
  var vv = parseInt(loadPref("vib", "2"), 10);
  state.vibLevel = isNaN(vv) ? 2 : vv;
  var ss = parseInt(loadPref("snd", "1"), 10);
  state.sndLevel = isNaN(ss) ? 1 : ss;

  bindSeg("vibSeg", "vibLevel", "vib", function (lv) { if (lv > 0) doFeedback(); });
  bindSeg("sndSeg", "sndLevel", "snd", function (lv) { playTick(lv); });

  renderChips();
  renderMine();
  updateHint();
  $("genBtn").textContent = "生成";
  $("placeholder").hidden = false;
  $("result").hidden = true;

  $("genBtn").onclick = generate;
  $("addBtn").onclick = addDish;
  $("newDish").addEventListener("keydown", function (e) {
    if (e.key === "Enter") addDish();
  });
  $("manageRow").onclick = function () { openSheet("mineSheet"); };
  $("openSet").onclick = function () { openSheet("setSheet"); };
  $("mask").onclick = closeSheets;
  Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (b) {
    b.onclick = closeSheets;
  });

  $("checkBtn").onclick = checkUpdate;

  $("diagBtn").onclick = function () {
    var box = $("diagBox");
    if (NATIVE && NATIVE.diagnose) {
      if (box) { box.textContent = "正在逐个测试，请稍候…"; box.hidden = false; }
      NATIVE.diagnose();
    } else {
      toast("当前 App 版本太旧，不支持自检，重新安装新版即可");
    }
  };

  $("apkBtn").onclick = function () {
    var url = (state.info && state.info.apkUrl) || "";
    if (!url) { toast("还没有设置更新源"); return; }
    if (NATIVE && NATIVE.openUrl) NATIVE.openUrl(url);
  };

  $("bannerBtn").onclick = function () {
    var url = (state.info && state.info.apkUrl) || "";
    if (url && NATIVE && NATIVE.openUrl) NATIVE.openUrl(url);
  };

  $("resetBtn").onclick = function () {
    if (NATIVE && NATIVE.resetWeb) {
      NATIVE.resetWeb();
      toast("已恢复内置版本");
    } else {
      toast("浏览器里无需恢复");
    }
  };

  $("clearMine").onclick = function () {
    if (state.custom.length === 0) { toast("本来就是空的"); return; }
    state.custom = [];
    saveCustom(state.custom);
    renderMine();
    renderChips();
    updateHint();
    toast("已清空");
  };

  if (NATIVE && NATIVE.getInfo) {
    var info = null;
    try { info = JSON.parse(NATIVE.getInfo()); } catch (e) {}
    if (info) applyInfo(info);
  } else {
    applyInfo({ builtinWebVersion: 5, webVersion: 5, appVersion: "浏览器预览", source: "" });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
