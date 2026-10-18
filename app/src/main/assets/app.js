// ==========================================
// DietAI v2.0 - 饮食记录 + 日/周/月统计
// ==========================================

const DEFAULT_CONFIG = {
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-flash',
  targetCalories: 2000
};

let appConfig = { ...DEFAULT_CONFIG };
let currentAnalyzedMeal = null;
let mealsHistory = [];
let currentStatsRange = 'week'; // 'week' | 'month' | 'all'

// DOM refs
const totalCalEl = document.getElementById('total-calories');
const targetCalEl = document.getElementById('target-calories');
const remainingCalEl = document.getElementById('remaining-calories');
const calorieRingEl = document.getElementById('calorie-ring');
const proteinValEl = document.getElementById('protein-val');
const carbsValEl = document.getElementById('carbs-val');
const fatValEl = document.getElementById('fat-val');
const proteinBarEl = document.getElementById('protein-bar');
const carbsBarEl = document.getElementById('carbs-bar');
const fatBarEl = document.getElementById('fat-bar');
const mealsListEl = document.getElementById('meals-list');
const currentDateEl = document.getElementById('current-date');
const settingsModal = document.getElementById('settings-modal');
const loadingModal = document.getElementById('loading-modal');
const resultModal = document.getElementById('result-modal');

// ==========================================
// 初始化
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  setupDate();
  loadMeals();
  renderDashboard();
  bindEvents();
  renderStats();
});

// ==========================================
// 页面导航
// ==========================================
function bindEvents() {
  // 底部导航切换
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
      document.getElementById('page-' + page).classList.add('active-page');
      if (page === 'stats') renderStats();
    });
  });

  // 统计区间切换
  document.querySelectorAll('.stats-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentStatsRange = tab.dataset.range;
      renderStats();
    });
  });

  // 设置按钮
  document.getElementById('btn-settings').addEventListener('click', () => settingsModal.classList.remove('hidden'));
  document.getElementById('btn-close-settings').addEventListener('click', () => settingsModal.classList.add('hidden'));
  document.getElementById('btn-save-settings').addEventListener('click', saveConfig);

  // 拍照/相册
  document.getElementById('camera-input').addEventListener('change', e => handleImageSelect(e.target.files[0]));
  document.getElementById('gallery-input').addEventListener('change', e => handleImageSelect(e.target.files[0]));

  // 结果弹窗
  document.getElementById('btn-close-result').addEventListener('click', () => resultModal.classList.add('hidden'));
  document.getElementById('btn-save-meal').addEventListener('click', saveCurrentMeal);

  // 清空今日
  document.getElementById('btn-clear-today').addEventListener('click', () => {
    if (confirm('确定要清空今日的所有饮食记录吗？')) clearTodayMeals();
  });
}

// ==========================================
// 配置读写
// ==========================================
function loadConfig() {
  const saved = localStorage.getItem('diet_ai_config');
  if (saved) {
    try { appConfig = { ...DEFAULT_CONFIG, ...JSON.parse(saved) }; } catch (e) {}
  }
  document.getElementById('api-key-input').value = appConfig.apiKey;
  document.getElementById('api-base-input').value = appConfig.baseUrl;
  document.getElementById('api-model-input').value = appConfig.model;
  document.getElementById('target-cal-input').value = appConfig.targetCalories;
  targetCalEl.textContent = `${appConfig.targetCalories} kcal`;
}

function saveConfig() {
  appConfig.apiKey = document.getElementById('api-key-input').value.trim();
  appConfig.baseUrl = document.getElementById('api-base-input').value.trim() || 'https://api.deepseek.com';
  appConfig.model = document.getElementById('api-model-input').value.trim() || 'deepseek-flash';
  appConfig.targetCalories = parseInt(document.getElementById('target-cal-input').value) || 2000;
  localStorage.setItem('diet_ai_config', JSON.stringify(appConfig));
  targetCalEl.textContent = `${appConfig.targetCalories} kcal`;
  renderDashboard();
  renderStats();
  settingsModal.classList.add('hidden');
}

function setupDate() {
  const now = new Date();
  currentDateEl.textContent = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
}

// ==========================================
// 图片识别
// ==========================================
async function handleImageSelect(file) {
  if (!file) return;
  if (!appConfig.apiKey) {
    alert('请先在右上角【设置】中输入你的 DeepSeek API Key！');
    settingsModal.classList.remove('hidden');
    return;
  }
  try {
    loadingModal.classList.remove('hidden');
    const base64Data = await compressImageToBase64(file, 1024, 0.85);
    const result = await analyzeMealWithDeepSeek(base64Data);
    loadingModal.classList.add('hidden');
    showResultModal(result, base64Data);
  } catch (err) {
    loadingModal.classList.add('hidden');
    alert('识别失败: ' + (err.message || '请检查网络或 API Key'));
    console.error(err);
  } finally {
    document.getElementById('camera-input').value = '';
    document.getElementById('gallery-input').value = '';
  }
}

function compressImageToBase64(file, maxWidth = 1024, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) { height = Math.round(height * maxWidth / width); width = maxWidth; }
          else { width = Math.round(width * maxWidth / height); height = maxWidth; }
        }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function analyzeMealWithDeepSeek(base64Image) {
  const prompt = `你是专业营养师，请仔细分析这张食物照片（对中餐有精准认知），估算分量并拆解营养。
严格以 JSON 格式输出，不含任何 Markdown 标记：
{
  "dish_name": "菜品名称",
  "total_calories": 580,
  "protein": 22.5,
  "carbs": 82.0,
  "fat": 18.0,
  "ingredients": [
    {"name": "熟米饭", "weight": "220g", "calories": 255}
  ],
  "health_tip": "营养建议"
}`;

  const endpoint = appConfig.baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${appConfig.apiKey}` },
    body: JSON.stringify({
      model: appConfig.model || 'deepseek-flash',
      messages: [{ role: 'user', content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: base64Image } }
      ]}],
      temperature: 0.3
    })
  });
  if (!response.ok) throw new Error(`API 报错 (${response.status}): ${await response.text()}`);
  const data = await response.json();
  let raw = (data.choices[0]?.message?.content || '{}').trim();
  if (raw.startsWith('```json')) raw = raw.substring(7);
  else if (raw.startsWith('```')) raw = raw.substring(3);
  if (raw.endsWith('```')) raw = raw.substring(0, raw.length - 3);
  return JSON.parse(raw.trim());
}

// ==========================================
// 结果弹窗
// ==========================================
function showResultModal(result, imageSrc) {
  currentAnalyzedMeal = {
    id: Date.now(),
    date: getTodayStr(),
    timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    name: result.dish_name || '美味餐食',
    calories: Math.round(result.total_calories || 0),
    protein: Math.round(result.protein || 0),
    carbs: Math.round(result.carbs || 0),
    fat: Math.round(result.fat || 0),
    ingredients: result.ingredients || [],
    healthTip: result.health_tip || '饮食营养均衡很重要！',
    image: imageSrc
  };

  document.getElementById('result-dish-name').textContent = currentAnalyzedMeal.name;
  document.getElementById('result-preview-img').src = imageSrc;
  document.getElementById('res-total-cal').textContent = currentAnalyzedMeal.calories;
  document.getElementById('res-protein').textContent = currentAnalyzedMeal.protein + 'g';
  document.getElementById('res-carbs').textContent = currentAnalyzedMeal.carbs + 'g';
  document.getElementById('res-fat').textContent = currentAnalyzedMeal.fat + 'g';
  document.getElementById('health-tip-text').textContent = currentAnalyzedMeal.healthTip;

  const ingListEl = document.getElementById('ingredients-list');
  ingListEl.innerHTML = '';
  currentAnalyzedMeal.ingredients.forEach(ing => {
    const div = document.createElement('div');
    div.className = 'ing-row';
    div.innerHTML = `<span class="ing-name">${ing.name} <small style="color:#8E9BAE">(${ing.weight})</small></span><span class="ing-cal">${ing.calories} kcal</span>`;
    ingListEl.appendChild(div);
  });

  const hour = new Date().getHours();
  const picker = document.getElementById('meal-type-picker');
  if (hour < 10) picker.value = '早餐';
  else if (hour < 15) picker.value = '午餐';
  else if (hour < 21) picker.value = '晚餐';
  else picker.value = '加餐/零食';

  resultModal.classList.remove('hidden');
}

function saveCurrentMeal() {
  if (!currentAnalyzedMeal) return;
  currentAnalyzedMeal.type = document.getElementById('meal-type-picker').value;
  mealsHistory.unshift(currentAnalyzedMeal);
  persistMeals();
  renderDashboard();
  resultModal.classList.add('hidden');
  currentAnalyzedMeal = null;
}

// ==========================================
// 今日看板渲染
// ==========================================
function renderDashboard() {
  const todayStr = getTodayStr();
  const todayMeals = mealsHistory.filter(m => m.date === todayStr);
  let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
  todayMeals.forEach(m => {
    totalCal += m.calories; totalProtein += m.protein; totalCarbs += m.carbs; totalFat += m.fat;
  });

  totalCalEl.textContent = totalCal;
  remainingCalEl.textContent = Math.max(0, appConfig.targetCalories - totalCal) + ' kcal';

  const pct = Math.min(1, Math.max(0, totalCal / appConfig.targetCalories));
  const circumference = 2 * Math.PI * 54;
  calorieRingEl.style.strokeDashoffset = circumference - pct * circumference;

  proteinValEl.textContent = totalProtein + 'g';
  carbsValEl.textContent = totalCarbs + 'g';
  fatValEl.textContent = totalFat + 'g';
  proteinBarEl.style.width = Math.min(100, totalProtein / 100 * 100) + '%';
  carbsBarEl.style.width = Math.min(100, totalCarbs / 250 * 100) + '%';
  fatBarEl.style.width = Math.min(100, totalFat / 60 * 100) + '%';

  mealsListEl.innerHTML = '';
  if (todayMeals.length === 0) {
    const es = document.getElementById('empty-state');
    es.style.display = 'block';
    mealsListEl.appendChild(es);
  } else {
    todayMeals.forEach(meal => {
      const card = document.createElement('div');
      card.className = 'meal-card';
      card.innerHTML = `
        <img class="meal-thumb" src="${meal.image || ''}" alt="${meal.name}" />
        <div class="meal-details">
          <div class="meal-top">
            <span class="meal-name">${meal.name}</span>
            <span class="meal-type-tag">${meal.type} · ${meal.timestamp}</span>
          </div>
          <div class="meal-meta">
            <span class="meal-cal">${meal.calories} kcal</span>
            <span>蛋 ${meal.protein}g</span>
            <span>碳 ${meal.carbs}g</span>
            <span>脂 ${meal.fat}g</span>
          </div>
        </div>
        <button class="meal-del-btn" data-id="${meal.id}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>`;
      card.querySelector('.meal-del-btn').addEventListener('click', () => deleteMeal(meal.id));
      mealsListEl.appendChild(card);
    });
  }
}

// ==========================================
// 统计页面渲染
// ==========================================
function renderStats() {
  const meals = getFilteredMeals();

  // 按日期分组
  const byDate = {};
  meals.forEach(m => {
    if (!byDate[m.date]) byDate[m.date] = { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
    byDate[m.date].calories += m.calories;
    byDate[m.date].protein += m.protein;
    byDate[m.date].carbs += m.carbs;
    byDate[m.date].fat += m.fat;
    byDate[m.date].count++;
  });

  const dates = Object.keys(byDate).sort();
  const numDays = dates.length;

  if (numDays === 0) {
    document.getElementById('stat-avg-cal').textContent = '--';
    document.getElementById('stat-total-cal').textContent = '--';
    document.getElementById('stat-days').textContent = '0';
    document.getElementById('stat-on-target').textContent = '--';
    document.getElementById('stat-over-target').textContent = '--';
    document.getElementById('stat-under-target').textContent = '--';
    document.getElementById('stat-max-day').textContent = '--';
    document.getElementById('stat-max-date').textContent = '暂无数据';
    document.getElementById('stat-min-day').textContent = '--';
    document.getElementById('stat-min-date').textContent = '暂无数据';
    document.getElementById('stat-avg-protein').textContent = '--g';
    document.getElementById('stat-avg-carbs').textContent = '--g';
    document.getElementById('stat-avg-fat').textContent = '--g';
    document.getElementById('bar-chart').innerHTML = '<div class="no-data-tip">还没有记录，快去拍照吧！</div>';
    document.getElementById('meal-type-stats').innerHTML = '';
    return;
  }

  const totalCal = dates.reduce((s, d) => s + byDate[d].calories, 0);
  const avgCal = Math.round(totalCal / numDays);
  const target = appConfig.targetCalories;

  const onTarget = dates.filter(d => byDate[d].calories >= target * 0.8 && byDate[d].calories <= target * 1.15).length;
  const overTarget = dates.filter(d => byDate[d].calories > target * 1.15).length;
  const underTarget = dates.filter(d => byDate[d].calories < target * 0.8).length;

  const calsByDay = dates.map(d => ({ date: d, cal: byDate[d].calories }));
  const maxEntry = calsByDay.reduce((a, b) => a.cal >= b.cal ? a : b);
  const minEntry = calsByDay.reduce((a, b) => a.cal <= b.cal ? a : b);

  const avgProtein = Math.round(dates.reduce((s, d) => s + byDate[d].protein, 0) / numDays);
  const avgCarbs = Math.round(dates.reduce((s, d) => s + byDate[d].carbs, 0) / numDays);
  const avgFat = Math.round(dates.reduce((s, d) => s + byDate[d].fat, 0) / numDays);

  // 写入 DOM
  document.getElementById('stat-avg-cal').textContent = avgCal;
  document.getElementById('stat-total-cal').textContent = Math.round(totalCal);
  document.getElementById('stat-days').textContent = numDays;
  document.getElementById('stat-on-target').textContent = onTarget;
  document.getElementById('stat-over-target').textContent = overTarget;
  document.getElementById('stat-under-target').textContent = underTarget;
  document.getElementById('stat-max-day').textContent = maxEntry.cal + ' kcal';
  document.getElementById('stat-max-date').textContent = formatDateLabel(maxEntry.date);
  document.getElementById('stat-min-day').textContent = minEntry.cal + ' kcal';
  document.getElementById('stat-min-date').textContent = formatDateLabel(minEntry.date);
  document.getElementById('stat-avg-protein').textContent = avgProtein + 'g';
  document.getElementById('stat-avg-carbs').textContent = avgCarbs + 'g';
  document.getElementById('stat-avg-fat').textContent = avgFat + 'g';

  renderBarChart(dates, byDate, target);
  renderMealTypeStats(meals);
}

// 柱状图（纯 CSS + HTML，不依赖第三方库）
function renderBarChart(dates, byDate, target) {
  const container = document.getElementById('bar-chart');
  const showDates = dates.slice(-14); // 最多展示14天
  const maxCal = Math.max(target * 1.3, ...showDates.map(d => byDate[d].calories));

  container.innerHTML = `
    <div class="bar-chart-wrap">
      ${showDates.map(d => {
        const cal = byDate[d].calories;
        const pct = Math.min(100, (cal / maxCal) * 100);
        const isOver = cal > target * 1.15;
        const isUnder = cal < target * 0.8;
        const color = isOver ? 'var(--macro-fat)' : isUnder ? 'var(--macro-carbs)' : 'var(--primary)';
        return `
          <div class="bar-item">
            <div class="bar-val">${cal >= 1000 ? (cal/1000).toFixed(1)+'k' : cal}</div>
            <div class="bar-col-wrap">
              <div class="bar-col" style="height:${pct}%;background:${color}"></div>
            </div>
            <div class="bar-label">${formatShortDate(d)}</div>
          </div>`;
      }).join('')}
    </div>
    <div class="bar-legend">
      <span class="legend-dot" style="background:var(--primary)"></span><span>达标</span>
      <span class="legend-dot" style="background:var(--macro-fat)"></span><span>超标</span>
      <span class="legend-dot" style="background:var(--macro-carbs)"></span><span>不足</span>
    </div>`;
}

// 餐次分布统计
function renderMealTypeStats(meals) {
  const container = document.getElementById('meal-type-stats');
  const types = {};
  meals.forEach(m => {
    if (!types[m.type]) types[m.type] = { calories: 0, count: 0 };
    types[m.type].calories += m.calories;
    types[m.type].count++;
  });
  const totalCal = meals.reduce((s, m) => s + m.calories, 0);
  const typeColors = { '早餐': '#3B82F6', '午餐': '#10B981', '晚餐': '#F59E0B', '加餐/零食': '#EF4444' };

  container.innerHTML = Object.entries(types).map(([type, data]) => {
    const pct = totalCal > 0 ? Math.round(data.calories / totalCal * 100) : 0;
    const color = typeColors[type] || '#8E9BAE';
    return `
      <div class="meal-type-row">
        <div class="mt-left">
          <span class="mt-dot" style="background:${color}"></span>
          <span class="mt-name">${type}</span>
          <span class="mt-count">(${data.count} 次)</span>
        </div>
        <div class="mt-right">
          <div class="mt-bar-wrap">
            <div class="mt-bar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
          <span class="mt-pct">${pct}%</span>
        </div>
      </div>`;
  }).join('') || '<div class="no-data-tip">暂无数据</div>';
}

// 根据时间范围过滤记录
function getFilteredMeals() {
  const now = new Date();
  if (currentStatsRange === 'all') return mealsHistory;
  const days = currentStatsRange === 'week' ? 7 : 30;
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1);
  const cutoffStr = dateToStr(cutoff);
  return mealsHistory.filter(m => m.date >= cutoffStr);
}

// ==========================================
// 工具函数
// ==========================================
function deleteMeal(id) {
  mealsHistory = mealsHistory.filter(m => m.id !== id);
  persistMeals(); renderDashboard();
}

function clearTodayMeals() {
  mealsHistory = mealsHistory.filter(m => m.date !== getTodayStr());
  persistMeals(); renderDashboard();
}

function persistMeals() { localStorage.setItem('diet_ai_meals', JSON.stringify(mealsHistory)); }

function loadMeals() {
  const saved = localStorage.getItem('diet_ai_meals');
  if (saved) { try { mealsHistory = JSON.parse(saved); } catch (e) { mealsHistory = []; } }
}

function getTodayStr() { return dateToStr(new Date()); }

function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(str) {
  if (!str) return '--';
  const [y, m, d] = str.split('-');
  return `${parseInt(m)}月${parseInt(d)}日`;
}

function formatShortDate(str) {
  const [, m, d] = str.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}
