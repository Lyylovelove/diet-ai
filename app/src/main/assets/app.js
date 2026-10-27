// DietAI v4.0
function toast(msg) {
  var el = document.getElementById('toast');
  if (!el) { return; }
  el.textContent = msg;
  el.style.display = 'block';
  if (window._toastTimer) clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(function() { el.style.display = 'none'; }, 4000);
}
window.onerror = function(msg, src, line) { toast('脚本错误: ' + msg + ' (行' + line + ')'); return false; };
// DietAI v2.1 — WebView 兼容版
// 所有交互通过全局函数 + onclick 绑定，彻底规避 WebView addEventListener 失效问题

var appConfig = {
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-flash',
  targetCalories: 2000
};
var mealsHistory = [];
var pendingMeal = null;
var currentStatsRange = 'week';

// ==========================================
// 启动初始化
// ==========================================
window.onload = function() {
  loadConfig();
  loadMeals();
  setupDate();
  renderDashboard();

  // 首次使用：没有 API Key 就自动弹出设置
  if (!appConfig.apiKey) {
    document.getElementById('settings-title').textContent = '🚀 欢迎使用 DietAI';
    document.getElementById('settings-hint').textContent = '第一步：填入你的 DeepSeek API Key，保存后即可拍照识别食物热量';
    document.getElementById('modal-settings').style.display = 'flex';
  }
};

// ==========================================
// 页面导航
// ==========================================
function switchPage(page, btn) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active-page'); });
  document.querySelectorAll('.nav-item').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('page-' + page).classList.add('active-page');
  btn.classList.add('active');
  if (page === 'stats') renderStats();
}

function switchStats(range, btn) {
  currentStatsRange = range;
  document.querySelectorAll('.stats-tab').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
  renderStats();
}

// ==========================================
// 设置面板
// ==========================================
function openSettings() {
  document.getElementById('settings-title').textContent = '⚙️ 设置';
  document.getElementById('settings-hint').textContent = '修改 API Key 和使用配置';
  document.getElementById('api-key-input').value = appConfig.apiKey;
  document.getElementById('api-base-input').value = appConfig.baseUrl;
  document.getElementById('api-model-input').value = appConfig.model;
  document.getElementById('target-cal-input').value = appConfig.targetCalories;
  document.getElementById('modal-settings').style.display = 'flex';
}

function closeSettings() {
  if (!appConfig.apiKey) {
    toast('请先填入 DeepSeek API Key 才能使用拍照识别功能');
    return;
  }
  document.getElementById('modal-settings').style.display = 'none';
}

function saveSettings() {
  var key = document.getElementById('api-key-input').value.trim();
  if (!key) {
    toast('请填入 DeepSeek API Key');
    return;
  }
  appConfig.apiKey = key;
  appConfig.baseUrl = document.getElementById('api-base-input').value.trim() || 'https://api.deepseek.com';
  appConfig.model = document.getElementById('api-model-input').value.trim() || 'deepseek-flash';
  appConfig.targetCalories = parseInt(document.getElementById('target-cal-input').value) || 2000;
  localStorage.setItem('diet_ai_config', JSON.stringify(appConfig));
  document.getElementById('target-calories').textContent = appConfig.targetCalories + ' kcal';
  document.getElementById('modal-settings').style.display = 'none';
  renderDashboard();
  toast('✅ 保存成功！现在可以拍照识别了');
}

function loadConfig() {
  try {
    var saved = localStorage.getItem('diet_ai_config');
    if (saved) { appConfig = JSON.parse(saved); if (appConfig.model === 'deepseek-chat') appConfig.model = 'deepseek-flash'; }
  } catch(e) {}
  document.getElementById('target-calories').textContent = appConfig.targetCalories + ' kcal';
}

// ==========================================
// 拍照 / 相册处理
// ==========================================
function handleFile(file) {
  if (!file) return;
  if (!appConfig.apiKey) {
    toast('请先点击右上角⚙️设置，填入 DeepSeek API Key');
    openSettings();
    return;
  }
  // 重置 input
  document.getElementById('camera-input').value = '';
  document.getElementById('gallery-input').value = '';

  document.getElementById('modal-loading').style.display = 'flex';

  compressImage(file, function(base64) {
    callDeepSeek(base64, function(result, err) {
      document.getElementById('modal-loading').style.display = 'none';
      if (err) { toast('识别失败：' + err); return; }
      showResult(result, base64);
    });
  });
}

function compressImage(file, callback) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var maxW = 1024;
      var w = img.width, h = img.height;
      if (w > maxW || h > maxW) {
        if (w > h) { h = Math.round(h * maxW / w); w = maxW; }
        else { w = Math.round(w * maxW / h); h = maxW; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function callDeepSeek(base64, callback) {
  var prompt = '你是专业营养师，请分析这张食物照片（熟悉中餐）。严格输出 JSON，不含 Markdown 标记：\n{"dish_name":"菜名","total_calories":500,"protein":20,"carbs":60,"fat":15,"ingredients":[{"name":"食材","weight":"100g","calories":200}],"health_tip":"营养建议"}';

  var endpoint = (appConfig.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '') + '/chat/completions';

  var xhr = new XMLHttpRequest();
  xhr.open('POST', endpoint, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', 'Bearer ' + appConfig.apiKey);
  xhr.timeout = 30000;

  xhr.onload = function() {
    try {
      var data = JSON.parse(xhr.responseText);
      var raw = (data.choices[0].message.content || '{}').trim();
      raw = raw.replace(/^```json\s*/,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
      callback(JSON.parse(raw), null);
    } catch(e) {
      callback(null, '解析失败: ' + xhr.responseText.substring(0, 200));
    }
  };
  xhr.onerror = function() { callback(null, '网络连接失败，请检查网络'); };
  xhr.ontimeout = function() { callback(null, '请求超时，请重试'); };

  xhr.send(JSON.stringify({
    model: appConfig.model || 'deepseek-flash',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: base64 } }
      ]
    }],
    temperature: 0.3
  }));
}

// ==========================================
// 识别结果弹窗
// ==========================================
function showResult(result, imageSrc) {
  var now = new Date();
  pendingMeal = {
    id: now.getTime(),
    date: toDateStr(now),
    timestamp: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    name: result.dish_name || '美味餐食',
    calories: Math.round(result.total_calories || 0),
    protein: Math.round(result.protein || 0),
    carbs: Math.round(result.carbs || 0),
    fat: Math.round(result.fat || 0),
    ingredients: result.ingredients || [],
    healthTip: result.health_tip || '饮食均衡，继续保持！',
    image: imageSrc
  };

  document.getElementById('result-dish-name').textContent = pendingMeal.name;
  document.getElementById('result-img').src = imageSrc;
  document.getElementById('res-cal').textContent = pendingMeal.calories;
  document.getElementById('res-protein').textContent = pendingMeal.protein + 'g';
  document.getElementById('res-carbs').textContent = pendingMeal.carbs + 'g';
  document.getElementById('res-fat').textContent = pendingMeal.fat + 'g';
  document.getElementById('health-tip').textContent = pendingMeal.healthTip;

  var listEl = document.getElementById('ingredients-list');
  listEl.innerHTML = '';
  (result.ingredients || []).forEach(function(ing) {
    var d = document.createElement('div');
    d.className = 'ing-row';
    d.innerHTML = '<span class="ing-name">' + ing.name + ' <small>(' + ing.weight + ')</small></span><span class="ing-cal">' + ing.calories + ' kcal</span>';
    listEl.appendChild(d);
  });

  var h = now.getHours();
  var picker = document.getElementById('meal-type-picker');
  picker.value = h < 10 ? '早餐' : h < 15 ? '午餐' : h < 21 ? '晚餐' : '加餐/零食';

  document.getElementById('modal-result').style.display = 'flex';
}

function closeResult() {
  document.getElementById('modal-result').style.display = 'none';
}

function saveMeal() {
  if (!pendingMeal) return;
  pendingMeal.type = document.getElementById('meal-type-picker').value;
  mealsHistory.unshift(pendingMeal);
  persistMeals();
  renderDashboard();
  document.getElementById('modal-result').style.display = 'none';
  pendingMeal = null;
}

// ==========================================
// 今日看板
// ==========================================
function renderDashboard() {
  var today = toDateStr(new Date());
  var todayMeals = mealsHistory.filter(function(m) { return m.date === today; });
  var cal = 0, pro = 0, carb = 0, fat = 0;
  todayMeals.forEach(function(m) { cal += m.calories; pro += m.protein; carb += m.carbs; fat += m.fat; });

  document.getElementById('total-calories').textContent = cal;
  document.getElementById('remaining-calories').textContent = Math.max(0, appConfig.targetCalories - cal) + ' kcal';

  var pct = Math.min(1, cal / (appConfig.targetCalories || 2000));
  var circ = 2 * Math.PI * 54;
  document.getElementById('calorie-ring').style.strokeDashoffset = circ - pct * circ;

  document.getElementById('protein-val').textContent = pro + 'g';
  document.getElementById('carbs-val').textContent = carb + 'g';
  document.getElementById('fat-val').textContent = fat + 'g';
  document.getElementById('protein-bar').style.width = Math.min(100, pro / 100 * 100) + '%';
  document.getElementById('carbs-bar').style.width = Math.min(100, carb / 250 * 100) + '%';
  document.getElementById('fat-bar').style.width = Math.min(100, fat / 60 * 100) + '%';

  var listEl = document.getElementById('meals-list');
  listEl.innerHTML = '';
  if (todayMeals.length === 0) {
    listEl.innerHTML = '<div class="empty-state"><span class="empty-icon">🍽️</span><p>今天还没有记录</p><small>点上方拍照开始记录</small></div>';
    return;
  }
  todayMeals.forEach(function(meal) {
    var card = document.createElement('div');
    card.className = 'meal-card';
    card.innerHTML =
      '<img class="meal-thumb" src="' + (meal.image || '') + '" />' +
      '<div class="meal-details">' +
        '<div class="meal-top"><span class="meal-name">' + meal.name + '</span>' +
        '<span class="meal-type-tag">' + meal.type + ' · ' + meal.timestamp + '</span></div>' +
        '<div class="meal-meta"><span class="meal-cal">' + meal.calories + ' kcal</span>' +
        '<span>蛋 ' + meal.protein + 'g</span><span>碳 ' + meal.carbs + 'g</span><span>脂 ' + meal.fat + 'g</span></div>' +
      '</div>' +
      '<button class="meal-del-btn" onclick="deleteMeal(' + meal.id + ')">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
      '</button>';
    listEl.appendChild(card);
  });
}

function deleteMeal(id) {
  mealsHistory = mealsHistory.filter(function(m) { return m.id !== id; });
  persistMeals();
  renderDashboard();
}

function clearToday() {
  if (!confirm('确定清空今日所有记录吗？')) return;
  var today = toDateStr(new Date());
  mealsHistory = mealsHistory.filter(function(m) { return m.date !== today; });
  persistMeals();
  renderDashboard();
}

// ==========================================
// 统计页
// ==========================================
function renderStats() {
  var meals = getFilteredMeals();
  var byDate = {};
  meals.forEach(function(m) {
    if (!byDate[m.date]) byDate[m.date] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    byDate[m.date].calories += m.calories;
    byDate[m.date].protein += m.protein;
    byDate[m.date].carbs += m.carbs;
    byDate[m.date].fat += m.fat;
  });

  var dates = Object.keys(byDate).sort();
  var n = dates.length;

  if (n === 0) {
    ['stat-avg-cal','stat-total-cal','stat-days','stat-on-target','stat-over-target','stat-under-target','stat-max-day','stat-min-day'].forEach(function(id) {
      document.getElementById(id).textContent = '--';
    });
    ['stat-max-date','stat-min-date'].forEach(function(id) { document.getElementById(id).textContent = '暂无数据'; });
    ['stat-avg-protein','stat-avg-carbs','stat-avg-fat'].forEach(function(id) { document.getElementById(id).textContent = '--g'; });
    document.getElementById('bar-chart').innerHTML = '<div class="no-data-tip">还没有记录，快去拍照吧！</div>';
    document.getElementById('meal-type-stats').innerHTML = '<div class="no-data-tip">暂无数据</div>';
    return;
  }

  var totalCal = dates.reduce(function(s,d) { return s + byDate[d].calories; }, 0);
  var avgCal = Math.round(totalCal / n);
  var target = appConfig.targetCalories || 2000;

  var onTarget = dates.filter(function(d) { return byDate[d].calories >= target * 0.8 && byDate[d].calories <= target * 1.15; }).length;
  var overTarget = dates.filter(function(d) { return byDate[d].calories > target * 1.15; }).length;
  var underTarget = dates.filter(function(d) { return byDate[d].calories < target * 0.8; }).length;

  var maxEntry = dates.reduce(function(a, d) { return byDate[d].calories > a.cal ? { date: d, cal: byDate[d].calories } : a; }, { date: dates[0], cal: byDate[dates[0]].calories });
  var minEntry = dates.reduce(function(a, d) { return byDate[d].calories < a.cal ? { date: d, cal: byDate[d].calories } : a; }, { date: dates[0], cal: byDate[dates[0]].calories });

  var avgPro = Math.round(dates.reduce(function(s,d) { return s + byDate[d].protein; }, 0) / n);
  var avgCarb = Math.round(dates.reduce(function(s,d) { return s + byDate[d].carbs; }, 0) / n);
  var avgFat = Math.round(dates.reduce(function(s,d) { return s + byDate[d].fat; }, 0) / n);

  document.getElementById('stat-avg-cal').textContent = avgCal;
  document.getElementById('stat-total-cal').textContent = Math.round(totalCal);
  document.getElementById('stat-days').textContent = n;
  document.getElementById('stat-on-target').textContent = onTarget;
  document.getElementById('stat-over-target').textContent = overTarget;
  document.getElementById('stat-under-target').textContent = underTarget;
  document.getElementById('stat-max-day').textContent = maxEntry.cal + ' kcal';
  document.getElementById('stat-max-date').textContent = fmtDate(maxEntry.date);
  document.getElementById('stat-min-day').textContent = minEntry.cal + ' kcal';
  document.getElementById('stat-min-date').textContent = fmtDate(minEntry.date);
  document.getElementById('stat-avg-protein').textContent = avgPro + 'g';
  document.getElementById('stat-avg-carbs').textContent = avgCarb + 'g';
  document.getElementById('stat-avg-fat').textContent = avgFat + 'g';

  renderBarChart(dates, byDate, target);
  renderMealTypeStats(meals);
}

function renderBarChart(dates, byDate, target) {
  var show = dates.slice(-14);
  var maxCal = Math.max(target * 1.3, show.reduce(function(m,d) { return Math.max(m, byDate[d].calories); }, 0));
  var html = '<div class="bar-chart-wrap">';
  show.forEach(function(d) {
    var cal = byDate[d].calories;
    var pct = Math.min(100, cal / maxCal * 100);
    var color = cal > target * 1.15 ? 'var(--macro-fat)' : cal < target * 0.8 ? 'var(--macro-carbs)' : 'var(--primary)';
    html += '<div class="bar-item">' +
      '<div class="bar-val">' + (cal >= 1000 ? (cal/1000).toFixed(1)+'k' : cal) + '</div>' +
      '<div class="bar-col-wrap"><div class="bar-col" style="height:' + pct + '%;background:' + color + '"></div></div>' +
      '<div class="bar-label">' + fmtShort(d) + '</div></div>';
  });
  html += '</div><div class="bar-legend">' +
    '<span class="legend-dot" style="background:var(--primary)"></span><span>达标</span>' +
    '<span class="legend-dot" style="background:var(--macro-fat)"></span><span>超标</span>' +
    '<span class="legend-dot" style="background:var(--macro-carbs)"></span><span>不足</span></div>';
  document.getElementById('bar-chart').innerHTML = html;
}

function renderMealTypeStats(meals) {
  var types = {};
  var totalCal = 0;
  meals.forEach(function(m) {
    if (!types[m.type]) types[m.type] = { calories: 0, count: 0 };
    types[m.type].calories += m.calories;
    types[m.type].count++;
    totalCal += m.calories;
  });
  var colors = { '早餐': '#3B82F6', '午餐': '#10B981', '晚餐': '#F59E0B', '加餐/零食': '#EF4444' };
  var html = '';
  Object.keys(types).forEach(function(type) {
    var d = types[type];
    var pct = totalCal > 0 ? Math.round(d.calories / totalCal * 100) : 0;
    var color = colors[type] || '#8E9BAE';
    html += '<div class="meal-type-row">' +
      '<div class="mt-left"><span class="mt-dot" style="background:' + color + '"></span><span class="mt-name">' + type + '</span><span class="mt-count">(' + d.count + '次)</span></div>' +
      '<div class="mt-right"><div class="mt-bar-wrap"><div class="mt-bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div><span class="mt-pct">' + pct + '%</span></div></div>';
  });
  document.getElementById('meal-type-stats').innerHTML = html || '<div class="no-data-tip">暂无数据</div>';
}

function getFilteredMeals() {
  if (currentStatsRange === 'all') return mealsHistory;
  var days = currentStatsRange === 'week' ? 7 : 30;
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  var cutoffStr = toDateStr(cutoff);
  return mealsHistory.filter(function(m) { return m.date >= cutoffStr; });
}

// ==========================================
// 工具函数
// ==========================================
function setupDate() {
  var now = new Date();
  document.getElementById('current-date').textContent = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
}

function toDateStr(d) {
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function fmtDate(str) { if (!str) return '--'; var p = str.split('-'); return parseInt(p[1]) + '月' + parseInt(p[2]) + '日'; }
function fmtShort(str) { var p = str.split('-'); return parseInt(p[1]) + '/' + parseInt(p[2]); }
function persistMeals() { localStorage.setItem('diet_ai_meals', JSON.stringify(mealsHistory)); }
function loadMeals() {
  try { var s = localStorage.getItem('diet_ai_meals'); if (s) mealsHistory = JSON.parse(s); } catch(e) {}
}
