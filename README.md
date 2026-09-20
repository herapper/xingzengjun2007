# 邢增俊 · HERAPPER 摄影作品集

这是可直接部署到 GitHub Pages 的静态网站。根目录 HTML 和 `assets/` 已生成，浏览网站不需要 Node.js、Python 或服务器端程序。

## 目录

| 路径 | 用途 |
| --- | --- |
| `src/pages/` | 页面源文件，新增文字、替换照片时编辑这里 |
| `aviation-catalog.json` | 航空照片的地点、日期和原图路径；机场导航、数量和相册由它生成 |
| `assets/js/` | 导航、图片加载状态、查看器、机场切换、首页轮播、地图，各自独立 |
| `assets/css/` | 与功能对应的样式文件 |
| `assets/vendor/` | 本地地图依赖 |
| `images/`、`profile.jpg` | 原始照片，保留原画质供下载 |
| `assets/images/` | 自动生成的 WebP 和清单，请勿手动修改 |
| `scripts/build.py` | 图片压缩与静态页面生成 |
| `scripts/check.py` | 链接、照片尺寸、目录完整性检查 |

## 更新照片与页面

1. 将新照片放入 `images/` 下对应的系列目录。
2. 航空照片更新 `aviation-catalog.json` 的 `places` 和 `photos`；其他系列编辑 `src/pages/` 中的 `<img>` 和原图链接。航空页的两个 `{{ AIRPORT_* }}` 标记由脚本替换。
3. 用 Python 3.10 或更新版本运行：

   ```sh
   python -m pip install -r requirements.txt
   python scripts/build.py
   python scripts/check.py
   ```

4. 提交源文件、生成的根目录 HTML、清单和 WebP 文件。不要直接修改根目录 HTML，下次构建会覆盖它。

构建保留照片比例和嵌入的色彩配置，按 EXIF 方向校正显示方向，输出最多 480、1280、1920 像素宽的 WebP，不放大小照片，也不改写原图。浏览器根据屏幕尺寸选择图片；首屏封面优先加载，画廊按需加载。点击照片后加载网页大图，右上角下载按钮仍指向原始文件。

清单记录原图摘要，重复构建会跳过未变化的图片。地图库和地图数据在滚动接近地图时加载；查看器及缩略图在打开照片后创建。JavaScript 不可用时，各机场相册和原图链接仍可访问。

## 本地预览和浏览器检查

```sh
python -m http.server 8000
```

访问 `http://localhost:8000`，检查手机和桌面尺寸、机场切换、大图浏览及原图下载。请通过 HTTP 预览，地图读取 JSON 需要 HTTP。

浏览器回归检查需要 Node.js 20 或更新版本，以及 pnpm：

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test
```

先保持本地预览服务器运行。也可设置 `SITE_URL` 为其他预览地址，或设置 `BROWSER_CHANNEL=msedge` 使用已安装的 Edge。

网站保留原有页面地址和照片原文件路径，现有外部链接继续有效。
