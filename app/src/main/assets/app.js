// ==========================================
// DietAI - DeepSeek 智能饮食与卡路里记录逻辑
// ==========================================

const DEFAULT_CONFIG = {
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-flash',
  targetCalories: 2000
};

// 状态管理
let appConfig = { ...DEFAULT_CONFIG };
let currentAnalyzedMeal = null; // 当前正在分析的餐食临时数据
let mealsHistory = []; // 本地记录历史

// DOM 元素引用
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
const emptyStateEl = document.getElementById('empty-state');
const currentDateEl = document.getElementById('current-date');

// 弹窗元素
const settingsModal = document.getElementById('settings-modal');
const loadingModal = document.getElementById('loading-modal');
const resultModal = document.getElementById('result-modal');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  setupDate();
  loadMeals();
  renderDashboard();
  bindEvents();
});

// 加载配置
function loadConfig() {
  const saved = localStorage.getItem('diet_ai_config');
  if (saved) {
    try {
      appConfig = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch (e) {
      console.error(e);
    }
  }
  document.getElementById('api-key-input').value = appConfig.apiKey;
  document.getElementById('api-base-input').value = appConfig.baseUrl;
  document.getElementById('api-model-input').value = appConfig.model;
  document.getElementById('target-cal-input').value = appConfig.targetCalories;
  targetCalEl.textContent = `${appConfig.targetCalories} kcal`;
}

// 保存配置
function saveConfig() {
  appConfig.apiKey = document.getElementById('api-key-input').value.trim();
  appConfig.baseUrl = document.getElementById('api-base-input').value.trim() || 'https://api.deepseek.com';
  appConfig.model = document.getElementById('api-model-input').value.trim() || 'deepseek-flash';
  appConfig.targetCalories = parseInt(document.getElementById('target-cal-input').value) || 2000;

  localStorage.setItem('diet_ai_config', JSON.stringify(appConfig));
  targetCalEl.textContent = `${appConfig.targetCalories} kcal`;
  renderDashboard();
  settingsModal.classList.add('hidden');
  alert('设置已保存！');
}

// 设置日期展示
function setupDate() {
  const now = new Date();
  const options = { month: 'long', day: 'numeric', weekday: 'short' };
  currentDateEl.textContent = now.toLocaleDateString('zh-CN', options);
}

// 绑定事件
function bindEvents() {
  // 设置按钮
  document.getElementById('btn-settings').addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
  });
  document.getElementById('btn-close-settings').addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });
  document.getElementById('btn-save-settings').addEventListener('click', saveConfig);

  // 拍照与相册选择
  const cameraInput = document.getElementById('camera-input');
  const galleryInput = document.getElementById('gallery-input');

  cameraInput.addEventListener('change', (e) => handleImageSelect(e.target.files[0]));
  galleryInput.addEventListener('change', (e) => handleImageSelect(e.target.files[0]));

  // 结果弹窗关闭与保存
  document.getElementById('btn-close-result').addEventListener('click', () => {
    resultModal.classList.add('hidden');
  });
  document.getElementById('btn-save-meal').addEventListener('click', saveCurrentMeal);

  // 清空今日
  document.getElementById('btn-clear-today').addEventListener('click', () => {
    if (confirm('确定要清空今日的所有饮食记录吗？')) {
      clearTodayMeals();
    }
  });
}

// 处理图片选择
async function handleImageSelect(file) {
  if (!file) return;

  if (!appConfig.apiKey) {
    alert('请先在右上角【设置】中输入你的 DeepSeek API Key！');
    settingsModal.classList.remove('hidden');
    return;
  }

  try {
    loadingModal.classList.remove('hidden');
    // 压缩图片并转为 Base64（避免大图上传卡顿和浪费 token）
    const base64Data = await compressImageToBase64(file, 1024, 0.85);

    // 调用 DeepSeek 视觉模型解析
    const result = await analyzeMealWithDeepSeek(base64Data);

    loadingModal.classList.add('hidden');
    showResultModal(result, base64Data);
  } catch (err) {
    loadingModal.classList.add('hidden');
    alert('识别失败: ' + (err.message || '请检查网络或 API Key 是否正确'));
    console.error(err);
  } finally {
    // 重置 input 允许重复选同一张图
    document.getElementById('camera-input').value = '';
    document.getElementById('gallery-input').value = '';
  }
}

// 图片压缩为 Base64
function compressImageToBase64(file, maxWidth = 1024, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 调用 DeepSeek 视觉模型接口
async function analyzeMealWithDeepSeek(base64Image) {
  const prompt = `你是一个资深的专业营养师和食物热量分析专家。请仔细观察这张食物照片（特别对中餐、常见中式家常菜、米饭面条、快餐等有精准认知）。
请估算食物分量，拆解食材成分并计算营养。

你必须严格以 JSON 格式输出，不要包含任何额外的 Markdown 解释文字或 \`\`\`json 标记。
JSON 格式要求如下：
{
  "dish_name": "菜品名称（如：西红柿鸡蛋盖浇饭）",
  "total_calories": 580,
  "protein": 22.5,
  "carbs": 82.0,
  "fat": 18.0,
  "ingredients": [
    {"name": "熟米饭", "weight": "220g", "calories": 255},
    {"name": "炒鸡蛋", "weight": "100g (约2个)", "calories": 150},
    {"name": "番茄", "weight": "120g", "calories": 25},
    {"name": "烹调油", "weight": "16g", "calories": 150}
  ],
  "health_tip": "蛋白质摄入良好，主食偏多，建议搭配少油绿叶蔬菜以补充膳食纤维。"
}`;

  let endpoint = appConfig.baseUrl.replace(/\/+$/, '') + '/chat/completions';

  const payload = {
    model: appConfig.model || 'deepseek-flash',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: { url: base64Image }
          }
        ]
      }
    ],
    temperature: 0.3
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${appConfig.apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API 报错 (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawContent = data.choices[0]?.message?.content || '{}';

  // 清洗可能存在的 Markdown 代码块标记
  let cleanJson = rawContent.trim();
  if (cleanJson.startsWith('```json')) {
    cleanJson = cleanJson.substring(7);
  } else if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.substring(3);
  }
  if (cleanJson.endsWith('```')) {
    cleanJson = cleanJson.substring(0, cleanJson.length - 3);
  }

  return JSON.parse(cleanJson.trim());
}

// 显示识别结果弹窗
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

  // 渲染食材列表
  const ingListEl = document.getElementById('ingredients-list');
  ingListEl.innerHTML = '';
  currentAnalyzedMeal.ingredients.forEach(ing => {
    const div = document.createElement('div');
    div.className = 'ing-row';
    div.innerHTML = `
      <span class="ing-name">${ing.name} <small style="color:#8E9BAE">(${ing.weight})</small></span>
      <span class="ing-cal">${ing.calories} kcal</span>
    `;
    ingListEl.appendChild(div);
  });

  // 智能推测默认餐次
  const currentHour = new Date().getHours();
  const picker = document.getElementById('meal-type-picker');
  if (currentHour < 10) picker.value = '早餐';
  else if (currentHour < 15) picker.value = '午餐';
  else if (currentHour < 21) picker.value = '晚餐';
  else picker.value = '加餐/零食';

  resultModal.classList.remove('hidden');
}

// 确认保存当前餐食
function saveCurrentMeal() {
  if (!currentAnalyzedMeal) return;

  currentAnalyzedMeal.type = document.getElementById('meal-type-picker').value;
  mealsHistory.unshift(currentAnalyzedMeal);
  persistMeals();
  renderDashboard();

  resultModal.classList.add('hidden');
  currentAnalyzedMeal = null;
}

// 渲染面板数据与列表
function renderDashboard() {
  const todayStr = getTodayStr();
  const todayMeals = mealsHistory.filter(m => m.date === todayStr);

  let totalCal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  todayMeals.forEach(m => {
    totalCal += m.calories;
    totalProtein += m.protein;
    totalCarbs += m.carbs;
    totalFat += m.fat;
  });

  totalCalEl.textContent = totalCal;
  const remaining = appConfig.targetCalories - totalCal;
  remainingCalEl.textContent = (remaining >= 0 ? remaining : 0) + ' kcal';

  // 卡路里进度圆环
  const target = appConfig.targetCalories || 2000;
  const pct = Math.min(1, Math.max(0, totalCal / target));
  const circumference = 2 * Math.PI * 54; // r=54 -> ~339.29
  const offset = circumference - (pct * circumference);
  calorieRingEl.style.strokeDashoffset = offset;

  // 三大宏量
  proteinValEl.textContent = totalProtein + 'g';
  carbsValEl.textContent = totalCarbs + 'g';
  fatValEl.textContent = totalFat + 'g';

  // 宏量百分比条（按常见健康参考值：蛋白质100g、碳水250g、脂肪60g）
  proteinBarEl.style.width = Math.min(100, (totalProtein / 100) * 100) + '%';
  carbsBarEl.style.width = Math.min(100, (totalCarbs / 250) * 100) + '%';
  fatBarEl.style.width = Math.min(100, (totalFat / 60) * 100) + '%';

  // 渲染列表
  mealsListEl.innerHTML = '';
  if (todayMeals.length === 0) {
    emptyStateEl.style.display = 'block';
    mealsListEl.appendChild(emptyStateEl);
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
        <button class="meal-del-btn" data-id="${meal.id}" title="删除记录">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      `;

      card.querySelector('.meal-del-btn').addEventListener('click', (e) => {
        deleteMeal(meal.id);
      });

      mealsListEl.appendChild(card);
    });
  }
}

// 删除单条餐食
function deleteMeal(id) {
  mealsHistory = mealsHistory.filter(m => m.id !== id);
  persistMeals();
  renderDashboard();
}

// 清空今日
function clearTodayMeals() {
  const todayStr = getTodayStr();
  mealsHistory = mealsHistory.filter(m => m.date !== todayStr);
  persistMeals();
  renderDashboard();
}

// 本地存储
function persistMeals() {
  localStorage.setItem('diet_ai_meals', JSON.stringify(mealsHistory));
}

function loadMeals() {
  const saved = localStorage.getItem('diet_ai_meals');
  if (saved) {
    try {
      mealsHistory = JSON.parse(saved);
    } catch (e) {
      mealsHistory = [];
    }
  }
}

function getTodayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
