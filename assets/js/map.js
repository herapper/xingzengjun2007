/* Load the map library and geography only when the map approaches the viewport. */
(() => {
  "use strict";
  const chartDom = document.getElementById('china-map');
  if (!chartDom) return;
  let started = false;
  function showError() {
    chartDom.replaceChildren();
    const message = document.createElement('p');
    message.textContent = '地图暂时无法加载。';
    const link = document.createElement('a');
    link.href = 'aerospace.html';
    link.textContent = '浏览全部拍摄地点 →';
    chartDom.append(message, link);
  }
  function initialize() {
  const chart = echarts.init(chartDom, 'dark');

  // 拍摄地点数据：[经度, 纬度, 地点名, 照片数, 链接]
  const points = [
    [110.35, 20.02, '海口 · 美兰', 52, 'aerospace.html#airport-HAK'],
    [109.51, 18.25, '三亚 · 凤凰', 64, 'aerospace.html#airport-SYX'],
    [110.8, 19.6, '文昌 · 航天发射场', 1, 'aerospace.html#airport-Wenchang-Space-Launch-Site'],
    [117.12, 36.65, '济南 · 遥墙', 37, 'aerospace.html#airport-TNA'],
    [116.40, 39.90, '北京', 17, 'aerospace.html#airport-PEK'],
    [121.47, 31.23, '上海 · 浦东', 29, 'aerospace.html#airport-PVG'],
    [113.27, 23.13, '广州 · 白云', 5, 'aerospace.html#airport-CAN'],
    [114.06, 22.55, '深圳 · 宝安', 1, 'aerospace.html#airport-SZX'],
    [104.07, 30.57, '成都 · 双流', 7, 'aerospace.html#airport-CTU'],
    [125.32, 43.82, '长春 · 龙嘉', 1, 'aerospace.html#airport-CGQ'],
    [108.94, 34.34, '西安 · 咸阳', 3, 'aerospace.html#airport-XIY'],
    [113.62, 34.75, '郑州 · 新郑', 10, 'aerospace.html#airport-CGO'],
    [91.14, 29.65, '拉萨 · 贡嘎', 11, 'aerospace.html#airport-LXA'],
    [114.17, 22.32, '香港', 24, 'aerospace.html#airport-HKG']
  ];

  fetch('china.json')
    .then(res => { if (!res.ok) throw new Error('Map unavailable'); return res.json(); })
    .then(geoJson => {
      echarts.registerMap('china', geoJson);

      const option = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          backgroundColor: '#1a1b1c',
          borderColor: '#ffffff20',
          textStyle: { color: '#f2f1ed' },
          formatter: function(p) {
            if (p.seriesType === 'effectScatter') {
              return `<b>${p.data.value[2]}</b><br/>${p.data.value[3]} 张作品`;
            }
            return p.name;
          }
        },
        geo: {
          map: 'china',
          roam: true,
          zoom: 1.15,
          label: { show: false },
          itemStyle: {
            areaColor: '#161718',
            borderColor: '#ffffff15',
            borderWidth: 1
          },
          emphasis: {
            itemStyle: { areaColor: '#1e1f20' },
            label: { show: false }
          }
        },
        series: [{
          name: '拍摄地点',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          data: points.map(p => ({
            value: [p[0], p[1], p[2], p[3]],
            link: p[4]
          })),
          symbolSize: function(val) {
            return Math.max(8, Math.min(20, 6 + val[3] / 5));
          },
          rippleEffect: { brushType: 'stroke', scale: 2.5 },
          itemStyle: {
            color: '#c9a96e',
            shadowBlur: 10,
            shadowColor: '#c9a96e'
          },
          label: {
            show: true,
            position: 'right',
            formatter: function(p) { return p.data.value[2]; },
            color: '#eee',
            fontSize: 11
          },
          emphasis: {
            itemStyle: { color: '#e6c98a' }
          }
        }]
      };

      chart.setOption(option);

      // 点击跳转
      chart.on('click', function(params) {
        if (params.data && params.data.link) {
          window.location.href = params.data.link;
        }
      });
    }).catch(() => {
      chart.dispose();
      showError();
    });

  // 自适应窗口大小
  window.addEventListener('resize', () => chart.resize());

  }
  function start() {
    if (started) return;
    started = true;
    const script = document.createElement('script');
    script.src = 'assets/vendor/echarts.min.js';
    script.onload = initialize;
    script.onerror = showError;
    document.head.append(script);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); start(); }
    }, { rootMargin: '200px' });
    observer.observe(chartDom);
  } else {
    start();
  }
})();
