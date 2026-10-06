# 吃什么 · 今天吃什么

一个「帮大学生决定这顿吃什么」的安卓 App。

- 主页标题 **今天吃什么**，副标题 **是啊，吃什么**
- 打开时**不**生成，点「生成」才出结果；出结果后按钮变成「换一餐」
- 内置 170+ 道大学生常见菜，按 早餐 / 正餐 / 夜宵 / 小吃 分类
- **5 套可切换配色**（薄荷 / 晴空 / 蜜桃 / 柠檬 / 深夜），默认是清新的薄荷绿
- 支持**自定义菜谱**，数据存在手机本地，不会因为更新而丢
- 界面是网页，放在你的 GitHub 仓库里，App 启动时自动检查并**热更新**（不用重装）
- 用 GitHub Actions **云端打包 APK**，本机什么都不用装

---

## 一、项目结构

```
what-to-eat/
├─ app/src/main/assets/www/          ← 网页内容：界面 + 内置菜谱（热更新就改这里）
│   ├─ index.html                    界面结构
│   ├─ app.css                       样式
│   ├─ app.js                        随机逻辑 + 内置菜谱 BUILTIN_RAW
│   └─ version.json                  版本号（热更新靠它判断要不要更新）
├─ app/src/main/java/com/whattoeat/app/
│   ├─ MainActivity.java             安卓外壳：全屏 WebView + 本地存储
│   ├─ UpdateManager.java            热更新：拉 version.json、下载新网页、检查新版 APK
│   └─ WebStore.java                 内置网页 / 已更新网页的切换与读写
├─ app/src/main/res/                 图标、主题、App 名称
├─ .github/workflows/build-apk.yml   GitHub Actions 云端打包流水线
├─ build.gradle / settings.gradle / gradle.properties
└─ check.js                          本地自检脚本（可选，改完网页可以跑一下）
```

---

## 二、上传到 GitHub（大约 5 分钟）

### 1. 新建仓库

- 打开 https://github.com/new
- Repository name 随便起，比如 `what-to-eat`
- **必须选 Public（公开）**：私有仓库的热更新文件需要登录才能读，手机端会拉不到；
  公开仓库还能让你直接用浏览器下载 APK，不用登录
- 其他都不勾，点 `Create repository`

### 2. 上传文件

把本项目文件夹**里面的所有内容**（不是最外层文件夹本身）上传上去：

- 仓库页面 → `Add file` → `Upload files`
- 把 `app`、`keystore`、`.github`、`build.gradle`、`settings.gradle`、`gradle.properties`、`README.md`、`.gitignore`、`check.js` 一起拖进去
- ⚠️ **`keystore` 文件夹一定要传**：里面是签名密钥，没有它云端会直接构建失败
- 页面底部点 `Commit changes`

上传后仓库根目录应该长这样：

```
app/            ← 安卓代码 + 网页
keystore/       ← 签名密钥（有且只有这一份）
.github/        ← 自动打包流水线
build.gradle  settings.gradle  gradle.properties  README.md
```

### 3. 特别重要：`.github` 是隐藏文件夹

浏览器拖拽上传有时会**跳过隐藏文件夹**。上传后检查一下仓库里有没有这两层目录：

```
.github/workflows/build-apk.yml
```

**如果没有，就手动建**（这一步不能省，否则不会有自动打包）：

1. 仓库页面 → `Add file` → `Create new file`
2. 文件名框里输入：`.github/workflows/build-apk.yml`（斜杠会自动变成目录）
3. 把项目里 `.github/workflows/build-apk.yml` 的全部内容复制粘贴进去
4. `Commit changes`

---

## 三、云端自动打包

上传完成后：

1. 打开仓库的 `Actions` 标签页，会看到 `构建 APK` 正在运行（第一次约 3~6 分钟）
2. 流水线里有一道「校验签名」的关卡，会检查 APK 是不是用 `keystore/release.p12` 签的。
   如果不是，它会**直接报错停止**，绝不发布一个装不上的包
3. 构建成功后：
   - **手机直接下载地址**（推荐，浏览器打开即可）：
     ```
     https://github.com/你的用户名/仓库名/releases/download/apk-latest/chishenme.apk
     ```
   - 或者在 `Actions` → 最近一次运行页面最下方 `Artifacts` 里下载 `chishenme-apk`

如果构建失败（红色的 ❌），把报错日志截图或粘贴给我，我来改。

---

## 四、小米 / 红米（HyperOS、MIUI）安装指南

你之前自己做的 APK 被系统拦住，通常是三个原因：**targetSdk 太低**、**签名不合规**、**被安全中心/纯净模式拦截**。
本项目已经针对性地处理：

| 你之前遇到的问题 | 本项目的处理 |
| --- | --- |
| 安卓 14+ 直接拒绝安装（要求 targetSdk ≥ 23） | `targetSdk 35`、`compileSdk 35` |
| 提示「安装包解析错误 / 无法安装」 | 完整 **v2 + v3** 签名（安卓 8.0 以上要求 v2 起） |
| 被判定「未经安全检测」 | 不申请存储/相机/定位等敏感权限，只申请联网；无第三方 SDK、无广告 |

安装步骤：

1. **用手机自带浏览器**打开上面的下载链接（微信里打开会提示"用其他浏览器打开"，要用浏览器）
2. 下载完成后点安装包，如果提示「未知来源应用」→ 选择**允许 / 仍要安装**
3. 如果提示「应用未经安全检测」：
   - 等它检测完，点 **继续安装**；或
   - **先关掉 WiFi 和流量再点安装**，很多 MIUI 版本靠联网检测来拦截，断网就过了
4. 如果被「纯净模式 / 安全守护」直接拦下：
   - 设置 → 安全 → 纯净模式 → 关闭
   - 或 设置 → 应用设置 → 权限管理 → 安装未知应用 → 允许「浏览器」「文件管理」
5. 如果提示「应用签名不一致 / 无法覆盖安装」：
   - 说明你手机上还装着以前那个旧版 App，先在桌面长按**卸载**旧版，再装这个

> 注意：HarmonyOS NEXT（纯血鸿蒙 5.x）不支持 APK，任何安卓包都装不了；
> 老的 EMUI / 鸿蒙 4.x 可以装。

---

## 五、怎么改内容（不用重装 App 的热更新）

App 每次启动会去你的仓库读 `app/src/main/assets/www/version.json`，
发现仓库里的 `web` 版本号比手机上的大，就自动把 `index.html`、`app.css`、`app.js` 下载到手机，
下次打开就是新版。**改文字、加菜、改样式都不需要重新安装 APK。**

### 加菜 / 改菜（最简单）

1. 打开仓库里的 `app/src/main/assets/www/app.js`
2. 找到 `BUILTIN_RAW`，照着格式加一行：

   ```js
   ["烤鸭饭", "正餐", ["外卖"]],
   ```

   格式是 `[菜名, 分类, [标签]]`，分类只能是 `早餐` / `正餐` / `夜宵` / `小吃`
3. 点右上角铅笔图标 → 编辑 → `Commit changes`

### 让改动生效（必须做）

1. 打开 `app/src/main/assets/www/version.json`
2. 把 `"web": 1` 改成 `"web": 2`（**每次改动都要 +1，不然手机不会更新**）
3. 提交。然后手机上打开 App 或杀掉重开，会提示「网页已更新到 v2」

### 改配色

App 里已经能直接换：**设置 → 界面配色**，点一下立即生效，选择会记在手机上。

想改颜色本身（比如把薄荷绿换成别的绿），打开 `app/src/main/assets/www/app.css`，
最上面就是 5 套主题，每套一串变量：

```css
[data-theme="mint"] {
  --bg: #F1FAF6;        /* 页面背景 */
  --card: #FFFFFF;      /* 卡片背景 */
  --accent: #34C79A;    /* 主色：按钮、选中态 */
  --accent2: #5FD6B4;   /* 主色渐变的高光端 */
  --text: #21403A;      /* 正文文字 */
  --muted: #7C9C93;     /* 次要文字 */
  --on-accent: #FFFFFF; /* 主色上面的文字色 */
}
```

改完记得把 `version.json` 的 `web` 加 1，手机才会热更新到（见下一节）。

想加一套全新配色：在 `app.css` 里照抄一段 `[data-theme="xxx"]`，再在 `app.js` 的 `THEMES`
数组里加一行即可（`id` 要一致），配色块会自动出现在设置里。

### 什么时候需要重新打 APK

只有改这些才需要（因为它们不在网页里）：
- App 名字：`app/src/main/res/values/strings.xml`
- 图标：`app/src/main/res/drawable/ic_launcher_fg.xml`
- 包名 / 版本号：`app/build.gradle`

改完提交即可，Actions 会自动重新打包。

顺带一提：如果你把 `app/build.gradle` 里的 `versionCode` 加 1，
再把 `version.json` 里的 `apkVersionCode` 也加 1，App 里就会弹出「有新版本可以安装」的提示条。

---

## 六、填写更新源

第一次装好后，App 还不知道要去哪个仓库找更新，需要告诉它：

- App → 底部「设置」→ 更新源 → 填 `你的用户名/仓库名`（例如 `zhangsan/what-to-eat`）→ 保存

想让它**开箱即用**（不用手动填），可以直接在代码里写死默认值：

```java
// app/src/main/java/com/whattoeat/app/UpdateManager.java
public static final String DEFAULT_SOURCE = "你的用户名/what-to-eat";
```

改完提交，Actions 重新打包，以后装的新版就自带更新源了。

> 国内直连 `raw.githubusercontent.com` 有时会失败，代码里内置了 `gh-proxy.com` 和
> `ghproxy.net` 两个镜像，会按顺序自动重试，通常总有一个能通。
> （2026-10 实测已失效、**不要**照网上教程往回加的：jsDelivr、gitmirror、ghfast.top、
> gh.llkk.cc、raw.githack.com。）

> 想更安全一点：可以在 `version.json` 里加 `sha256` 段（文件名 → 哈希值），
> App 下载完会先校验再替换，对不上就放弃更新。不写这段也能正常用。
> 生成哈希命令：`certutil -hashfile app.js SHA256`（Windows）。

---

## 七、常见问题

**Q：构建报「缺少 keystore/release.p12」？**
说明密钥文件没传上去。密钥是**唯一**的：没有它就不能签名，构建会故意直接失败，
而不是偷偷用调试密钥签一个装不上的包。把项目里的 `keystore/release.p12` 补传到仓库即可。

**Q：关于签名密钥的安全（有空再看）**
密钥和密码都放在公开仓库里，理论上任何人拿到它都能签一个"能覆盖升级你手机 App"的假包。
对一个自己用的小工具来说风险很低，但你可以这样加固：
到仓库 `Settings` → `Secrets and variables` → `Actions` → 新建一个 `RELEASE_KEYSTORE_B64`
（内容是密钥文件的 base64），然后按 `.github/workflows/build-apk.yml` 里的注释改成从 Secret 读取，
并把 `keystore/` 加进 `.gitignore`。**已经装过一次之后不要随便换密钥**，换了就只能卸载重装。

**Q：改了版本号，但 App 一直没更新怎么办？**
App → 设置 → **「测试更新源」**，它会逐个源测一遍并把结果摊开给你看，例如：

```
更新源：zhangsan/what-to-eat
分支：main

✓ 官方 raw.githubusercontent   正常，仓库版本 v4  (1820ms)
✗ 镜像 gh-proxy.com   连不上或超时 (6004ms)
✓ 镜像 ghproxy.net   正常，仓库版本 v4  (4310ms)

手机上当前网页版本：v2
结论：仓库版本更新，点上面的「立即检查网页更新」就能升级。
```

对着结论排查就行：
- **仓库版本比手机低或一样** → 忘了改 `version.json` 里的 `web`
- **三个源全不通** → 换网络（比如切手机流量），或确认仓库是 Public、名字没写错
- **能连上但读不到 version.json** → 文件不在 `app/src/main/assets/www/` 下

**Q：App 打不开 / 白屏？**
代码里做了兜底：热更新内容如果加载失败，会自动回退到 APK 内置的版本，并在设置里提供「恢复内置版本」。

**Q：换一餐会不会换到同一道菜？**
会尽量避开刚出现过的那道；候选只有一道时才会重复。

**Q：自定义的菜存在哪？**
存在 App 私有目录 `custom_dishes.json`（不是网页缓存），卸载 App 才会丢。

**Q：怎么本地自检改完的网页有没有写错？**
装了 Node.js 的话，在项目根目录执行：

```
node check.js
```

会检查菜谱格式、JSON、文件是否齐全、版本号是否对得上。

---

## 八、技术要点（给自己看的）

- minSdk 26（Android 8.0+），targetSdk 35，AGP 8.7.3，Gradle 8.10.2，JDK 17
- 零第三方依赖，只用系统 WebView 和 `HttpURLConnection`
- 联网全部在原生层做，网页层不发起任何网络请求，因此没有跨域、CORS、权限问题
- 本地存储走 `@JavascriptInterface` 桥接写文件；在浏览器里预览时自动降级为 localStorage
- 热更新采用「先下载到临时目录、全部成功后再整体替换」的方式，避免更新到一半变砖
- 签名密钥由 CI 首次构建时生成并回写仓库，保证每次构建签名一致、可覆盖安装
