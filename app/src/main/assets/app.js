// ====== 全局异常捕获 ======
window.onerror = function(msg, url, line) {
  console.error('JS Error:', msg, 'at line', line);
  return false;
};

// ====== 自定义顶部轻提示（兼容三星 WebView） ======
var toastTimer = null;
function toast(msg, duration) {
  duration = duration || 3000;
  var el = document.getElementById('app-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-toast';
    el.style.cssText = 'position:fixed;top:18px;left:50%;-webkit-transform:translateX(-50%);transform:translateX(-50%);background:rgba(15,21,33,0.96);color:#F8FAFC;border:1px solid rgba(52,211,153,0.45);padding:11px 18px;border-radius:99px;font-size:13px;font-weight:600;z-index:9999;max-width:90%;text-align:center;box-shadow:0 12px 28px rgba(0,0,0,0.6);-webkit-transition:opacity 0.22s;transition:opacity 0.22s;pointer-events:none;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  el.style.display = 'block';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function() {
    el.style.opacity = '0';
    setTimeout(function() { el.style.display = 'none'; }, 240);
  }, duration);
}

// ====== HTML 转义 ======
function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ====== 状态与本地存储（同时兼容 v12 diet_ai_config 与 v13/v15 diet_cfg） ======
var config = {
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  usdaKey: '',
  model: 'deepseek-flash',
  themeMode: 'marvel',
  gender: 'male',
  age: 25,
  height: 175,
  weight: 70,
  goalType: 'cut',
  activity: 1.375,
  calGoal: 2000,
  pGoal: 150,
  cGoal: 200,
  fGoal: 65
};

function loadSavedConfig() {
  try {
    var raw13 = localStorage.getItem('diet_cfg');
    var raw12 = localStorage.getItem('diet_ai_config');
    var c13 = raw13 ? JSON.parse(raw13) : null;
    var c12 = raw12 ? JSON.parse(raw12) : null;
    var saved = c13 || c12;
    if (saved) {
      config.apiKey    = saved.apiKey || (c12 && c12.apiKey) || '';
      config.baseUrl   = saved.baseUrl || (c12 && c12.baseUrl) || 'https://api.deepseek.com';
      config.usdaKey   = saved.usdaKey || (c12 && c12.usdaKey) || '';
      config.model     = saved.model || (c12 && c12.model) || 'deepseek-flash';
      if (config.model === 'deepseek-chat') config.model = 'deepseek-flash';
      config.themeMode = saved.themeMode || 'marvel';
      if (!localStorage.getItem('diet_marvel_v17_1')) {
        config.themeMode = 'marvel';
        localStorage.setItem('diet_marvel_v17_1', '1');
      }
      config.gender    = saved.gender || 'male';
      config.age       = Number(saved.age) || 25;
      config.height    = Number(saved.height) || 175;
      config.weight    = Number(saved.weight) || 70;
      config.goalType  = saved.goalType || saved.goal || 'cut';
      config.activity  = Number(saved.activity) || 1.375;
      config.calGoal   = Number(saved.calGoal || saved.targetCalories) || 2000;
      config.pGoal     = Number(saved.pGoal || saved.targetProtein) || 150;
      config.cGoal     = Number(saved.cGoal || saved.targetCarbs) || 200;
      config.fGoal     = Number(saved.fGoal || saved.targetFat) || 65;
    }
  } catch (e) { console.warn('读取配置失败:', e); }
}
loadSavedConfig();

// ====== 主题引擎：默认跟随手机系统深浅色 + 支持手动切换 ======
function detectSystemDark() {
  try {
    if (window.AndroidTheme && typeof window.AndroidTheme.isSystemDark === 'function') {
      return !!window.AndroidTheme.isSystemDark();
    }
  } catch (e) {}
  try {
    if (window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  } catch (e2) {}
  return true;
}

function isEffectiveDark(overrideSysDark) {
  var mode = config.themeMode || 'marvel';
  if (mode === 'marvel' || mode === 'dark') return true;
  if (mode === 'light') return false;
  if (typeof overrideSysDark === 'boolean') return overrideSysDark;
  return detectSystemDark();
}

function applyTheme(overrideSysDark) {
  var mode = config.themeMode || 'marvel';
  var isDark = isEffectiveDark(overrideSysDark);
  var attrTheme = mode === 'marvel' ? 'marvel' : (isDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', attrTheme);

  var metaEl = document.getElementById('meta-theme-color');
  if (metaEl) metaEl.setAttribute('content', mode === 'marvel' ? '#09060C' : (isDark ? '#070A10' : '#F4F7FB'));

  try {
    if (window.AndroidTheme && typeof window.AndroidTheme.syncBars === 'function') {
      window.AndroidTheme.syncBars(isDark);
    }
  } catch (e) {}

  var iconWrap = document.getElementById('theme-icon-wrap');
  var labelEl = document.getElementById('theme-mode-label');
  if (labelEl) {
    labelEl.textContent = mode === 'marvel' ? '漫威版' : (mode === 'system' ? '随系统' : (mode === 'light' ? '浅色' : '深色'));
  }
  if (iconWrap) {
    if (mode === 'marvel') {
      iconWrap.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
    } else if (mode === 'system') {
      iconWrap.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 7l5 5"/><path d="M12 12l4 4"/></svg>';
    } else if (mode === 'light') {
      iconWrap.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    } else {
      iconWrap.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
  }
}

window.onNativeThemeChanged = function(sysIsDark) {
  applyTheme(!!sysIsDark);
};

try {
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) {
      mq.addEventListener('change', function(e) { applyTheme(e.matches); });
    } else if (mq.addListener) {
      mq.addListener(function(e) { applyTheme(e.matches); });
    }
  }
} catch (e) {}

function cycleThemeMode() {
  var cur = config.themeMode || 'marvel';
  var next = cur === 'marvel' ? 'system' : (cur === 'system' ? 'light' : (cur === 'light' ? 'dark' : 'marvel'));
  setThemeMode(next, true);
}

function setThemeMode(mode, showTip) {
  config.themeMode = mode || 'marvel';
  try { localStorage.setItem('diet_cfg', JSON.stringify(config)); } catch (e) {}
  applyTheme();
  renderDashboard();
  var sel = document.getElementById('input-theme-mode');
  if (sel) sel.value = config.themeMode;
  if (showTip) {
    var nameMap = {
      'marvel': '漫威特别版',
      'system': '跟随系统',
      'light':  '浅色模式',
      'dark':   '深色模式'
    };
    toast('已切换至' + nameMap[config.themeMode]);
  }
}
applyTheme();

var mealsHistory = [];
function loadSavedMeals() {
  try {
    var m13 = localStorage.getItem('diet_meals');
    var m12 = localStorage.getItem('diet_ai_meals');
    var arr13 = m13 ? JSON.parse(m13) : [];
    var arr12 = m12 ? JSON.parse(m12) : [];
    var map = {};
    var merged = [];
    (Array.isArray(arr13) ? arr13 : []).concat(Array.isArray(arr12) ? arr12 : []).forEach(function(m) {
      if (!m || !m.id) return;
      if (!map[m.id]) {
        map[m.id] = true;
        merged.push({
          id: m.id,
          date: m.date,
          time: m.time || m.timestamp || '',
          name: m.name || '饮食记录',
          mealType: m.mealType || m.type || '正餐',
          calories: Number(m.calories) || 0,
          protein: Number(m.protein) || 0,
          carbs: Number(m.carbs) || 0,
          fat: Number(m.fat) || 0,
          img: m.img || m.image || ''
        });
      }
    });
    merged.sort(function(a, b) { return (b.id || 0) - (a.id || 0); });
    mealsHistory = merged;
  } catch (e) { console.warn('读取历史记录失败:', e); }
}
loadSavedMeals();

function persistMeals() {
  try {
    var str = JSON.stringify(mealsHistory);
    localStorage.setItem('diet_meals', str);
    return true;
  } catch (e) {
    for (var i = mealsHistory.length - 1; i >= 0; i--) {
      if (mealsHistory[i].img) {
        mealsHistory[i].img = '';
        try {
          localStorage.setItem('diet_meals', JSON.stringify(mealsHistory));
          return true;
        } catch (e2) {}
      }
    }
    toast('本地存储已满，请导出备份或清理旧记录');
    return false;
  }
}

// ====== 日期工具与当前选中日期 ======
function toDateStr(d) {
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1);
  if (m.length < 2) m = '0' + m;
  var day = String(d.getDate());
  if (day.length < 2) day = '0' + day;
  return y + '-' + m + '-' + day;
}

var selectedDate = toDateStr(new Date());
var currentStatsPeriod = 7;
var tempMealResult = null;
var stagedImageBase64 = '';

function formatChineseDate(dateStr) {
  var parts = String(dateStr || '').split('-');
  if (parts.length !== 3) return dateStr;
  return parseInt(parts[1], 10) + '月' + parseInt(parts[2], 10) + '日';
}

function getWeekDayName(dateStr) {
  var parts = String(dateStr || '').split('-');
  var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  var days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[d.getDay()] || '';
}

function shiftDate(deltaDays) {
  var parts = selectedDate.split('-');
  var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  d.setDate(d.getDate() + deltaDays);
  var nextStr = toDateStr(d);
  var todayStr = toDateStr(new Date());
  if (nextStr > todayStr) {
    toast('不能选择未来的日期');
    return;
  }
  selectedDate = nextStr;
  renderDashboard();
}

function pickDate(val) {
  if (!val) return;
  var todayStr = toDateStr(new Date());
  if (val > todayStr) {
    toast('不能选择未来的日期');
    document.getElementById('date-picker').value = selectedDate;
    return;
  }
  selectedDate = val;
  renderDashboard();
}

function resetToToday() {
  selectedDate = toDateStr(new Date());
  renderDashboard();
}

// ====== 初始化 ======
function initApp() {
  applyTheme();
  var now = new Date();
  var opts = { month: 'long', day: 'numeric', weekday: 'short' };
  document.getElementById('current-date').textContent = now.toLocaleDateString('zh-CN', opts);
  selectedDate = toDateStr(now);
  populateSettingsForm();
  renderDashboard();
  if (!config.apiKey) setTimeout(function() { switchTab('settings'); }, 350);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// ====== Tab 切换 ======
function switchTab(tab) {
  document.querySelectorAll('.tab-page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(b) { b.classList.remove('active'); });
  var pageEl = document.getElementById('tab-' + tab);
  if (pageEl) pageEl.classList.add('active');
  var navEl = document.getElementById('nav-' + tab);
  if (navEl) navEl.classList.add('active');
  if (tab === 'stats') renderStats(currentStatsPeriod);
  if (tab === 'settings') populateSettingsForm();
  window.scrollTo(0, 0);
}

// ====== 首页渲染 ======
function renderDashboard() {
  var todayStr = toDateStr(new Date());
  var isToday = (selectedDate === todayStr);

  var pickerEl = document.getElementById('date-picker');
  if (pickerEl) {
    pickerEl.value = selectedDate;
    pickerEl.max = todayStr;
  }
  var labelEl = document.getElementById('selected-date-label');
  if (labelEl) {
    labelEl.textContent = isToday
      ? ('今天 · ' + formatChineseDate(selectedDate))
      : (formatChineseDate(selectedDate) + ' ' + getWeekDayName(selectedDate));
  }
  var backBtn = document.getElementById('btn-back-today');
  if (backBtn) backBtn.style.display = isToday ? 'none' : 'inline-block';
  var nextBtn = document.getElementById('btn-next-date');
  if (nextBtn) nextBtn.disabled = isToday;
  var recTitle = document.getElementById('records-date-title');
  if (recTitle) recTitle.textContent = isToday ? '今日记录' : (formatChineseDate(selectedDate) + ' 记录');

  var dayMeals = mealsHistory.filter(function(m) { return m.date === selectedDate; });

  var eatenCal = 0, eatenP = 0, eatenC = 0, eatenF = 0;
  dayMeals.forEach(function(m) {
    eatenCal += Number(m.calories) || 0;
    eatenP   += Number(m.protein)  || 0;
    eatenC   += Number(m.carbs)    || 0;
    eatenF   += Number(m.fat)      || 0;
  });

  eatenCal = Math.round(eatenCal);
  eatenP   = Math.round(eatenP * 10) / 10;
  eatenC   = Math.round(eatenC * 10) / 10;
  eatenF   = Math.round(eatenF * 10) / 10;

  var remaining = Math.max(config.calGoal - eatenCal, 0);
  var isOver = eatenCal > config.calGoal;
  var pct = config.calGoal > 0 ? Math.round((eatenCal / config.calGoal) * 100) : 0;

  document.getElementById('cal-eaten').textContent     = eatenCal;
  document.getElementById('cal-goal').textContent      = config.calGoal;
  document.getElementById('cal-remaining').textContent = isOver ? (eatenCal - config.calGoal) : remaining;
  var statusLabel = document.getElementById('cal-status-label');
  if (statusLabel) {
    statusLabel.textContent = isOver ? '已超标 kcal' : (isToday ? '剩余千卡' : '当日剩余');
    statusLabel.style.color = isOver ? '#FB7185' : '';
  }
  var pctEl = document.getElementById('cal-pct');
  if (pctEl) pctEl.textContent = pct + '%';

  // 圆环进度 (r=54 => 周长 339.3)
  var circumference = 339.3;
  var ratio = config.calGoal > 0 ? Math.min(eatenCal / config.calGoal, 1) : 0;
  var ring = document.getElementById('cal-ring');
  ring.style.strokeDashoffset = circumference - ratio * circumference;
  ring.style.stroke = isOver ? 'url(#ringOverGrad)' : ((config.themeMode || 'marvel') === 'marvel' ? 'url(#ringMarvelGrad)' : 'url(#ringGrad)');

  // 三大营养素
  document.getElementById('p-eaten').textContent = eatenP;
  document.getElementById('p-goal').textContent  = config.pGoal;
  document.getElementById('c-eaten').textContent = eatenC;
  document.getElementById('c-goal').textContent  = config.cGoal;
  document.getElementById('f-eaten').textContent = eatenF;
  document.getElementById('f-goal').textContent  = config.fGoal;

  document.getElementById('p-bar').style.width = (config.pGoal > 0 ? Math.min(eatenP / config.pGoal * 100, 100) : 0) + '%';
  document.getElementById('c-bar').style.width = (config.cGoal > 0 ? Math.min(eatenC / config.cGoal * 100, 100) : 0) + '%';
  document.getElementById('f-bar').style.width = (config.fGoal > 0 ? Math.min(eatenF / config.fGoal * 100, 100) : 0) + '%';

  updateMacroSubText('p-remain-text', eatenP, config.pGoal);
  updateMacroSubText('c-remain-text', eatenC, config.cGoal);
  updateMacroSubText('f-remain-text', eatenF, config.fGoal);

  // 渲染记录列表（使用精致矢量图标代替廉价卡通 Emoji）
  var listEl = document.getElementById('meals-list');
  if (dayMeals.length === 0) {
    listEl.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-svg-box">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>' +
            '<path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>' +
            '<line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line>' +
          '</svg>' +
        '</div>' +
        '<p>' + (isToday ? '今天还没有饮食记录' : (formatChineseDate(selectedDate) + ' 暂无记录')) + '</p>' +
        '<small>支持拍照+文字混合、纯文字描述或点击右上「+ 手动快速记」补录</small>' +
      '</div>';
    return;
  }

  var mealSvgIcon =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>' +
    '</svg>';

  listEl.innerHTML = dayMeals.map(function(m) {
    var thumb = m.img
      ? '<img src="' + m.img + '" class="meal-thumb" alt="food" />'
      : '<div class="meal-thumb">' + mealSvgIcon + '</div>';
    return (
      '<div class="meal-item">' +
        thumb +
        '<div class="meal-info">' +
          '<div class="meal-top">' +
            '<span class="meal-name">' + esc(m.name) + '</span>' +
            '<span class="meal-type-tag">' + esc(m.mealType || '正餐') + (m.time ? ' · ' + esc(m.time) : '') + '</span>' +
          '</div>' +
          '<div class="meal-meta">' +
            '<span class="meal-cal">' + Math.round(Number(m.calories) || 0) + ' kcal</span>' +
            '<span class="meal-macro-pill">P ' + (Number(m.protein) || 0) + 'g</span>' +
            '<span class="meal-macro-pill">C ' + (Number(m.carbs) || 0) + 'g</span>' +
            '<span class="meal-macro-pill">F ' + (Number(m.fat) || 0) + 'g</span>' +
          '</div>' +
        '</div>' +
        '<button class="meal-del-btn" onclick="deleteMeal(' + Number(m.id) + ')" aria-label="删除">✕</button>' +
      '</div>'
    );
  }).join('');
}

function updateMacroSubText(id, eaten, goal) {
  var el = document.getElementById(id);
  if (!el) return;
  var diff = Math.round((goal - eaten) * 10) / 10;
  if (diff >= 0) {
    el.textContent = '差 ' + diff + 'g';
    el.style.color = '';
  } else {
    el.textContent = '超 ' + Math.abs(diff) + 'g';
    el.style.color = '#FB7185';
  }
}

// ====== 统计页渲染 ======
function switchStatsPeriod(days) {
  currentStatsPeriod = days;
  document.querySelectorAll('.stats-tab').forEach(function(b) { b.classList.remove('active'); });
  var id = days === 7 ? 'stab-7' : days === 30 ? 'stab-30' : 'stab-all';
  document.getElementById(id).classList.add('active');
  renderStats(days);
}

function renderStats(days) {
  var filtered = mealsHistory;
  var cutoffStr = '';
  if (days > 0) {
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (days - 1));
    cutoffStr = toDateStr(cutoff);
    filtered = mealsHistory.filter(function(m) { return m.date >= cutoffStr; });
  }

  var byDate = {};
  filtered.forEach(function(m) {
    if (!byDate[m.date]) byDate[m.date] = { cal: 0, p: 0, c: 0, f: 0, count: 0 };
    byDate[m.date].cal   += Number(m.calories) || 0;
    byDate[m.date].p     += Number(m.protein)  || 0;
    byDate[m.date].c     += Number(m.carbs)    || 0;
    byDate[m.date].f     += Number(m.fat)      || 0;
    byDate[m.date].count += 1;
  });

  var dateKeys     = Object.keys(byDate).sort();
  var recordedDays = dateKeys.length;

  var totalCal = 0, totalP = 0, totalC = 0, totalF = 0;
  var onTarget = 0, overDays = 0, underDays = 0;
  var maxDay = null, minDay = null;

  dateKeys.forEach(function(d) {
    var info = byDate[d];
    totalCal += info.cal;
    totalP   += info.p;
    totalC   += info.c;
    totalF   += info.f;

    var lo = config.calGoal * 0.85;
    var hi = config.calGoal * 1.15;
    if (info.cal >= lo && info.cal <= hi) onTarget++;
    else if (info.cal > hi) overDays++;
    else underDays++;

    if (!maxDay || info.cal > byDate[maxDay].cal) maxDay = d;
    if (!minDay || info.cal < byDate[minDay].cal) minDay = d;
  });

  var avgCal = recordedDays > 0 ? Math.round(totalCal / recordedDays) : 0;
  var avgP   = recordedDays > 0 ? Math.round(totalP   / recordedDays) : 0;
  var avgC   = recordedDays > 0 ? Math.round(totalC   / recordedDays) : 0;
  var avgF   = recordedDays > 0 ? Math.round(totalF   / recordedDays) : 0;
  var rate   = recordedDays > 0 ? Math.round((onTarget / recordedDays) * 100) : 0;

  document.getElementById('s-days').textContent      = recordedDays;
  document.getElementById('s-avg-cal').textContent   = avgCal;
  document.getElementById('s-total-cal').textContent = totalCal > 9999 ? (totalCal / 1000).toFixed(1) + 'k' : Math.round(totalCal);
  document.getElementById('s-rate').textContent      = rate + '%';

  document.getElementById('s-on-target').textContent = onTarget;
  document.getElementById('s-over').textContent      = overDays;
  document.getElementById('s-under').textContent     = underDays;

  document.getElementById('s-max-cal').textContent  = maxDay ? Math.round(byDate[maxDay].cal) + ' kcal' : '-- kcal';
  document.getElementById('s-max-date').textContent = maxDay ? formatShortDate(maxDay) : '暂无数据';
  document.getElementById('s-min-cal').textContent  = minDay ? Math.round(byDate[minDay].cal) + ' kcal' : '-- kcal';
  document.getElementById('s-min-date').textContent = minDay ? formatShortDate(minDay) : '暂无数据';

  document.getElementById('s-avg-p').textContent = avgP + 'g';
  document.getElementById('s-avg-c').textContent = avgC + 'g';
  document.getElementById('s-avg-f').textContent = avgF + 'g';

  renderBarChart(days, byDate);
  renderMealTypeStats(filtered, totalCal);
}

function formatShortDate(dateStr) {
  var parts = dateStr.split('-');
  return parseInt(parts[1], 10) + '月' + parseInt(parts[2], 10) + '日';
}

function renderBarChart(days, byDate) {
  var container = document.getElementById('bar-chart');
  var chartDays = days === 0 ? 14 : Math.min(days, 14);
  var slots = [];
  for (var i = chartDays - 1; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    slots.push(toDateStr(d));
  }

  var maxVal = config.calGoal * 1.3;
  slots.forEach(function(s) {
    if (byDate[s] && byDate[s].cal > maxVal) maxVal = byDate[s].cal * 1.1;
  });

  var lo = config.calGoal * 0.85;
  var hi = config.calGoal * 1.15;

  var barsHTML = slots.map(function(dateStr) {
    var info   = byDate[dateStr];
    var cal    = info ? Math.round(info.cal) : 0;
    var heightPct = maxVal > 0 ? Math.max((cal / maxVal) * 100, cal > 0 ? 6 : 2) : 2;
    var color = 'rgba(255,255,255,0.1)';
    if (cal > 0) {
      if (cal >= lo && cal <= hi) color = 'var(--primary)';
      else if (cal > hi)          color = 'var(--macro-fat)';
      else                        color = 'var(--macro-carbs)';
    }
    var parts = dateStr.split('-');
    var label = parseInt(parts[1], 10) + '/' + parseInt(parts[2], 10);
    return (
      '<div class="bar-item">' +
        '<span class="bar-val">' + (cal > 0 ? cal : '') + '</span>' +
        '<div class="bar-col-wrap">' +
          '<div class="bar-col" style="height:' + heightPct + '%;background:' + color + '"></div>' +
        '</div>' +
        '<span class="bar-label">' + label + '</span>' +
      '</div>'
    );
  }).join('');

  container.innerHTML = '<div class="bar-chart-wrap">' + barsHTML + '</div>';
}

function renderMealTypeStats(filtered, totalCal) {
  var types  = ['早餐', '午餐', '晚餐', '加餐'];
  var colors = { '早餐': '#38BDF8', '午餐': '#10B981', '晚餐': '#FBBF24', '加餐': '#FB7185' };

  var byType = {};
  types.forEach(function(t) { byType[t] = { cal: 0, count: 0 }; });
  filtered.forEach(function(m) {
    var t = types.indexOf(m.mealType) >= 0 ? m.mealType : '加餐';
    byType[t].cal   += Number(m.calories) || 0;
    byType[t].count += 1;
  });

  var el = document.getElementById('meal-type-stats');
  if (filtered.length === 0) {
    el.innerHTML = '<p class="no-data-tip">暂无餐次数据</p>';
    return;
  }

  el.innerHTML = types.map(function(t) {
    var info = byType[t];
    var pct  = totalCal > 0 ? Math.round((info.cal / totalCal) * 100) : 0;
    return (
      '<div class="meal-type-row">' +
        '<div class="mt-left">' +
          '<span class="mt-dot" style="background:' + colors[t] + '"></span>' +
          '<span class="mt-name">' + t + '</span>' +
          '<span class="mt-count">' + info.count + '次 · ' + Math.round(info.cal) + ' kcal</span>' +
        '</div>' +
        '<div class="mt-right">' +
          '<div class="mt-bar-wrap">' +
            '<div class="mt-bar-fill" style="width:' + pct + '%;background:' + colors[t] + '"></div>' +
          '</div>' +
          '<span class="mt-pct">' + pct + '%</span>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}

// ============================================================================
// ====== 图文混合输入工作台：拍照 / 相册 / 预览 / 快捷词 / 一键识别 ======
// ============================================================================

function triggerCamera()  { document.getElementById('camera-input').click(); }
function triggerGallery() { document.getElementById('gallery-input').click(); }

function getDesc() {
  var el = document.getElementById('desc-input');
  return el ? el.value.trim() : '';
}

function appendQuickText(txt) {
  var el = document.getElementById('desc-input');
  if (!el) return;
  var cur = el.value.trim();
  el.value = cur ? (cur + '，' + txt) : txt;
  el.focus();
}

function handleFile(file) {
  if (!file) return;
  compressImage(file, 960, 0.80, function(base64) {
    if (!base64) {
      toast('图片读取失败，请换一张图片重试');
      return;
    }
    stagedImageBase64 = base64;
    var stagedBox = document.getElementById('staged-photo-box');
    var stagedImg = document.getElementById('staged-photo-img');
    if (stagedImg) stagedImg.src = base64;
    if (stagedBox) stagedBox.style.display = 'flex';
    toast('已添加照片！可继续补充说明，或点击「开始识别」');
  });
}

function clearStagedPhoto() {
  stagedImageBase64 = '';
  var stagedBox = document.getElementById('staged-photo-box');
  var stagedImg = document.getElementById('staged-photo-img');
  if (stagedImg) stagedImg.src = '';
  if (stagedBox) stagedBox.style.display = 'none';
}

function compressImage(file, maxWidth, quality, callback) {
  var reader = new FileReader();
  reader.onerror = function() { callback(null); };
  reader.onload = function(e) {
    var img = new Image();
    img.onerror = function() { callback(null); };
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var w = img.width, h = img.height;
      if (w > maxWidth || h > maxWidth) {
        if (w > h) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
        else       { w = Math.round((w * maxWidth) / h); h = maxWidth; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function makeThumb(dataUrl, callback) {
  if (!dataUrl) { callback(''); return; }
  var img = new Image();
  img.onload = function() {
    var canvas = document.createElement('canvas');
    var maxW = 180;
    var w = img.width, h = img.height;
    if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    callback(canvas.toDataURL('image/jpeg', 0.62));
  };
  img.onerror = function() { callback(''); };
  img.src = dataUrl;
}

// ====== 1. 纯营养素/热量直录秒级解析器（无需等待 AI，100% 精确） ======
function tryParseDirectNutrientInput(text) {
  if (!text) return null;
  var s = text.trim();

  var stripped = s
    .replace(/摄入|补充|吃了|喝了|记录|记一笔|今天|早上|中午|晚上|早餐|午餐|晚餐|加餐|练后|运动后|纯|净|大概|大约|约|共|总计|一共/g, '')
    .replace(/\d+(\.\d+)?\s*(g|克|kcal|千卡|大卡|卡路里|卡)/gi, '')
    .replace(/蛋白质|蛋白|碳水化合物|碳水|糖分|脂肪|热量|能量|卡路里|大卡|千卡/g, '')
    .replace(/[，,。、＋+\-\s:：;；()（）/]/g, '');

  if (stripped.length > 0) return null;

  var pMatch = s.match(/(?:蛋白质|蛋白)\s*(\d+(?:\.\d+)?)\s*(?:g|克)?|(\d+(?:\.\d+)?)\s*(?:g|克)?\s*(?:纯)?(?:蛋白质|蛋白)/i);
  var cMatch = s.match(/(?:碳水化合物|碳水)\s*(\d+(?:\.\d+)?)\s*(?:g|克)?|(\d+(?:\.\d+)?)\s*(?:g|克)?\s*(?:纯)?(?:碳水化合物|碳水)/i);
  var fMatch = s.match(/(?:脂肪)\s*(\d+(?:\.\d+)?)\s*(?:g|克)?|(\d+(?:\.\d+)?)\s*(?:g|克)?\s*(?:纯)?(?:脂肪)/i);
  var calMatch = s.match(/(?:热量|能量|卡路里)?\s*(\d+(?:\.\d+)?)\s*(?:kcal|千卡|大卡|卡路里|卡)|(?:热量|能量)\s*(\d+(?:\.\d+)?)/i);

  if (!pMatch && !cMatch && !fMatch && !calMatch) return null;

  var p = pMatch ? parseFloat(pMatch[1] || pMatch[2]) : 0;
  var c = cMatch ? parseFloat(cMatch[1] || cMatch[2]) : 0;
  var f = fMatch ? parseFloat(fMatch[1] || fMatch[2]) : 0;
  var macroCal = Math.round(p * 4 + c * 4 + f * 9);
  var cal = calMatch ? Math.round(parseFloat(calMatch[1] || calMatch[2])) : macroCal;
  if (cal <= 0 && macroCal > 0) cal = macroCal;

  var parts = [];
  if (p > 0) parts.push('蛋白质 ' + p + 'g');
  if (c > 0) parts.push('碳水 ' + c + 'g');
  if (f > 0) parts.push('脂肪 ' + f + 'g');
  var title = parts.length > 0 ? ('营养直录 · ' + parts.join(' + ')) : ('热量直录 · ' + cal + ' kcal');
  var grams = Math.max(Math.round(p + c + f), 1);

  return {
    food_name: title,
    total_calories: cal,
    protein: Math.round(p * 10) / 10,
    carbs: Math.round(c * 10) / 10,
    fat: Math.round(f * 10) / 10,
    ingredients: [
      {
        name: title,
        grams: grams,
        calories: cal,
        protein: Math.round(p * 10) / 10,
        carbs: Math.round(c * 10) / 10,
        fat: Math.round(f * 10) / 10,
        category: 'macro',
        use_db: false,
        _src: '营养直录'
      }
    ],
    health_tip: '已按 Atwater 能量标准（1g蛋白质=4kcal，1g碳水=4kcal，1g脂肪=9kcal）为您精准直录。'
  };
}

// ====== 统一开始识别入口（支持：图片+文字混合 / 仅图片 / 仅文字） ======
function startRecognize() {
  var desc = getDesc();
  var hasImg = !!stagedImageBase64;

  if (!hasImg && !desc) {
    toast('请先拍照/选图，或在输入框中填写吃了什么');
    return;
  }

  // 无图且为纯营养素描述时，毫秒级本地直录
  if (!hasImg && desc) {
    var directResult = tryParseDirectNutrientInput(desc);
    if (directResult) {
      tempMealResult = sanitizeAndReconcileResult(directResult, desc);
      tempMealResult.img = '';
      document.getElementById('desc-input').value = '';
      showResultModal(tempMealResult, '');
      return;
    }
  }

  if (!config.apiKey) {
    toast('请先在设置中填写 DeepSeek API Key');
    openSettings();
    return;
  }

  analyzeFood(stagedImageBase64, desc);
}

// ============================================================================
// ====== 截断 JSON 自动修复解析器（彻底消灭 Unexpected end of JSON input） ======
// ============================================================================

function parseAndRepairJson(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  var s = rawText.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  var firstBrace = s.indexOf('{');
  if (firstBrace < 0) return null;
  s = s.substring(firstBrace);

  // 1. 尝试直接截取到最后一个 '}' 解析
  var lastBrace = s.lastIndexOf('}');
  if (lastBrace > 0) {
    try {
      return JSON.parse(s.substring(0, lastBrace + 1));
    } catch (e) {}
  }

  // 2. 若输出被截断（例如缺少结尾的 ]} 或停在半截属性处），回退到最后一个完整对象/闭合大括号并自动补齐括号栈
  var inStr = false;
  var escNext = false;
  var stack = [];
  var lastCompleteItemEnd = -1;

  for (var i = 0; i < s.length; i++) {
    var ch = s.charAt(i);
    if (escNext) { escNext = false; continue; }
    if (ch === '\\') { if (inStr) escNext = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;

    if (ch === '{' || ch === '[') {
      stack.push(ch === '{' ? '}' : ']');
    } else if (ch === '}' || ch === ']') {
      if (stack.length > 0) stack.pop();
      // 当处于 ingredients/items 数组层级（stack 长度为 2，即外层 { 和数组 [）且刚闭合一个食材对象 } 时，记录安全截断点
      if (ch === '}' && stack.length === 2) {
        lastCompleteItemEnd = i;
      }
      if (stack.length === 0) {
        try {
          return JSON.parse(s.substring(0, i + 1));
        } catch (e2) {}
      }
    }
  }

  // 如果已经至少有一个完整的食材对象 }，直接从最后一个完整食材对象处截断并闭合 `]}`
  if (lastCompleteItemEnd > 0) {
    var repairedFromItem = s.substring(0, lastCompleteItemEnd + 1) + ']}';
    try {
      return JSON.parse(repairedFromItem);
    } catch (e3) {}
  }

  // 通用截断修补：若在字符串内截断，先闭合引号，去掉末尾悬挂的逗号/冒号，再按 stack 逆序补齐括号
  var candidate = s;
  if (inStr) candidate += '"';
  candidate = candidate.replace(/[,:\s]+$/, '');
  var closing = '';
  for (var k = stack.length - 1; k >= 0; k--) {
    closing += stack[k];
  }
  try {
    return JSON.parse(candidate + closing);
  } catch (e4) {
    return null;
  }
}

// ============================================================================
// ====== 与 v12 完全一致的稳定 XHR 通信结构 + 开源防幻觉营养管线 ======
// ============================================================================

function analyzeFood(base64Image, desc) {
  showLoading(true);
  var loadingTitle = document.getElementById('loading-title');
  if (loadingTitle) {
    loadingTitle.textContent = (base64Image && desc)
      ? '正在结合照片与补充说明混合分析...'
      : (base64Image ? '正在识别餐食照片与分量...' : 'AI 营养师正在解析营养数据...');
  }

  var prompt =
    '你是专业临床营养师（熟悉中餐与运动营养）。请识别' + (base64Image ? '这张餐食照片' : '下方饮食描述') + '中的所有食物，估算每项实际入口的可食部重量（克）与营养素。\n' +
    '严格只输出一行紧凑 JSON，不含 Markdown 代码块：\n' +
    '{"dish_name":"总名称","items":[{"name":"食物中文名","grams":150,"kcal_guess":174,"protein_guess":4,"carbs_guess":39,"fat_guess":0.5,"raw":1}],"health_tip":"一句简短营养建议"}\n' +
    '核心规则：\n' +
    '1) 严禁凭空捏造或单独列出用户未提及的"花生油"、"食用油"、"植物油"等独立调料项！炒菜油脂请直接折算在菜品自身热量中。\n' +
    '2) 若用户描述的是纯营养素或补剂（如"摄入纯24g蛋白质"、"一勺蛋白粉"），直接按 1g蛋白质=4kcal、1g碳水=4kcal、1g脂肪=9kcal 计算，并将 raw 设为 0。\n' +
    '3) 仅当该项是单一基础食材（如熟米饭、水煮蛋、鸡胸肉、纯牛奶、西兰花、香蕉、苹果）时 raw 设为 1；若是复合菜肴（如牛肉面、番茄炒蛋、宫保鸡丁、饺子、汉堡）或补剂则 raw 设为 0。';

  if (desc) {
    prompt += '\n\n【用户说明（最高优先级，若与图片冲突或指定了分量/吃了一半/去汤/纯营养素克数，必须100%按此说明计算）】：' + desc;
  }

  // 与 v12 完全相同的消息结构：单条 user 消息，text 在前，image_url 在后，不设低 max_tokens 限制
  var userContent;
  if (base64Image) {
    userContent = [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: base64Image } }
    ];
  } else {
    userContent = prompt;
  }

  var endpoint = (config.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '') + '/chat/completions';

  var xhr = new XMLHttpRequest();
  xhr.open('POST', endpoint, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', 'Bearer ' + config.apiKey);
  xhr.timeout = 45000;

  xhr.onload = function() {
    var parsed = null;
    var errMsg = '';
    try {
      var bodyText = (xhr.responseText || '').trim();
      if (!bodyText) {
        errMsg = '接口返回空响应 (HTTP ' + xhr.status + ')';
      } else {
        var data = JSON.parse(bodyText);
        if (data.error) {
          errMsg = data.error.message || JSON.stringify(data.error);
        } else if (data.choices && data.choices[0] && data.choices[0].message) {
          var msgObj = data.choices[0].message;
          var raw = (msgObj.content || msgObj.reasoning_content || '').trim();
          parsed = parseAndRepairJson(raw);
          if (!parsed) {
            errMsg = 'AI 返回内容无法解析为 JSON';
          }
        } else {
          errMsg = '接口响应异常 (HTTP ' + xhr.status + ')';
        }
      }
    } catch (ex) {
      errMsg = '响应解析失败 (HTTP ' + xhr.status + ')';
    }

    if (!parsed) {
      showLoading(false);
      toast('识别失败：' + (errMsg || '请重试'), 4000);
      return;
    }

    // 归一化字段格式，兼容 items / ingredients
    var rawItems = Array.isArray(parsed.items) ? parsed.items : (Array.isArray(parsed.ingredients) ? parsed.ingredients : []);
    var normalized = {
      food_name: parsed.dish_name || parsed.food_name || '饮食记录',
      total_calories: Number(parsed.total_calories) || 0,
      protein: Number(parsed.protein) || 0,
      carbs: Number(parsed.carbs) || 0,
      fat: Number(parsed.fat) || 0,
      health_tip: parsed.health_tip || '均衡饮食，继续保持！',
      ingredients: rawItems.map(function(it) {
        return {
          name: it.name || '食物',
          grams: Number(it.grams) || 100,
          calories: Number(it.calories != null ? it.calories : (it.kcal_guess != null ? it.kcal_guess : it.cal)) || 0,
          protein: Number(it.protein != null ? it.protein : (it.protein_guess != null ? it.protein_guess : it.p)) || 0,
          carbs: Number(it.carbs != null ? it.carbs : (it.carbs_guess != null ? it.carbs_guess : it.c)) || 0,
          fat: Number(it.fat != null ? it.fat : (it.fat_guess != null ? it.fat_guess : it.f)) || 0,
          category: it.category || (it.raw === 1 || it.use_db === true ? 'raw' : 'cooked'),
          use_db: (it.raw === 1 || it.use_db === true)
        };
      })
    };

    resolveNutrition(normalized, desc);
    var finalResult = sanitizeAndReconcileResult(normalized, desc);
    var usedImg = base64Image || '';
    tempMealResult = finalResult;

    clearStagedPhoto();
    var descEl = document.getElementById('desc-input');
    if (descEl) descEl.value = '';

    if (usedImg) {
      makeThumb(usedImg, function(thumb) {
        tempMealResult.img = thumb;
        showLoading(false);
        showResultModal(finalResult, usedImg);
      });
    } else {
      tempMealResult.img = '';
      showLoading(false);
      showResultModal(finalResult, '');
    }
  };

  xhr.onerror = function() {
    showLoading(false);
    toast('网络连接失败，请检查手机网络后重试', 3800);
  };

  xhr.ontimeout = function() {
    showLoading(false);
    toast('AI 识别超时，请重试', 3800);
  };

  xhr.send(JSON.stringify({
    model: config.model || 'deepseek-flash',
    messages: [{
      role: 'user',
      content: userContent
    }],
    temperature: 0.2
  }));
}

// ============================================================================
// ====== 黄金标准单一食材字典 + 严格精确匹配 + Atwater 能量守恒校验 ======
// ============================================================================

var STANDARD_FOODS = {
  '米饭':     { kcal: 116, p: 2.6,  c: 25.9, f: 0.3 },
  '熟米饭':   { kcal: 116, p: 2.6,  c: 25.9, f: 0.3 },
  '白米饭':   { kcal: 116, p: 2.6,  c: 25.9, f: 0.3 },
  '大米饭':   { kcal: 116, p: 2.6,  c: 25.9, f: 0.3 },
  '糙米饭':   { kcal: 111, p: 2.6,  c: 23.0, f: 0.9 },
  '三色糙米饭':{ kcal: 112, p: 2.8,  c: 23.5, f: 0.9 },
  '紫米饭':   { kcal: 120, p: 3.0,  c: 25.5, f: 0.6 },
  '黑米饭':   { kcal: 120, p: 3.0,  c: 25.5, f: 0.6 },
  '白粥':     { kcal: 46,  p: 1.1,  c: 9.9,  f: 0.2 },
  '大米粥':   { kcal: 46,  p: 1.1,  c: 9.9,  f: 0.2 },
  '燕麦片':   { kcal: 367, p: 15.0, c: 61.0, f: 6.7 },
  '全麦面包': { kcal: 246, p: 9.8,  c: 44.0, f: 3.2 },
  '全麦吐司': { kcal: 246, p: 9.8,  c: 44.0, f: 3.2 },
  '白吐司':   { kcal: 275, p: 8.3,  c: 50.9, f: 4.1 },
  '馒头':     { kcal: 223, p: 7.0,  c: 47.0, f: 1.1 },
  '红薯':     { kcal: 86,  p: 1.6,  c: 20.1, f: 0.1 },
  '蒸红薯':   { kcal: 86,  p: 1.6,  c: 20.1, f: 0.1 },
  '紫薯':     { kcal: 82,  p: 1.8,  c: 18.5, f: 0.2 },
  '土豆':     { kcal: 77,  p: 2.0,  c: 17.2, f: 0.2 },
  '玉米':     { kcal: 106, p: 4.0,  c: 22.8, f: 1.2 },
  '甜玉米':   { kcal: 106, p: 4.0,  c: 22.8, f: 1.2 },
  '鸡蛋':     { kcal: 144, p: 13.3, c: 1.1,  f: 8.8 },
  '水煮蛋':   { kcal: 144, p: 13.3, c: 1.1,  f: 8.8 },
  '煮鸡蛋':   { kcal: 144, p: 13.3, c: 1.1,  f: 8.8 },
  '茶叶蛋':   { kcal: 150, p: 13.5, c: 1.6,  f: 9.2 },
  '煎蛋':     { kcal: 196, p: 13.6, c: 1.2,  f: 15.0 },
  '荷包蛋':   { kcal: 196, p: 13.6, c: 1.2,  f: 15.0 },
  '鸡蛋白':   { kcal: 52,  p: 11.0, c: 0.7,  f: 0.2 },
  '蛋清':     { kcal: 52,  p: 11.0, c: 0.7,  f: 0.2 },
  '鸡蛋清':   { kcal: 52,  p: 11.0, c: 0.7,  f: 0.2 },
  '鸡蛋黄':   { kcal: 322, p: 15.9, c: 3.6,  f: 26.5 },
  '蛋黄':     { kcal: 322, p: 15.9, c: 3.6,  f: 26.5 },
  '鸡胸肉':   { kcal: 165, p: 31.0, c: 0.0,  f: 3.6 },
  '熟鸡胸肉': { kcal: 165, p: 31.0, c: 0.0,  f: 3.6 },
  '水煮鸡胸肉':{ kcal: 165, p: 31.0, c: 0.0,  f: 3.6 },
  '生鸡胸肉': { kcal: 133, p: 24.6, c: 0.0,  f: 3.2 },
  '鸡肉':     { kcal: 167, p: 24.0, c: 0.0,  f: 7.4 },
  '去皮鸡腿': { kcal: 181, p: 24.2, c: 0.0,  f: 8.8 },
  '鸡腿肉':   { kcal: 181, p: 24.2, c: 0.0,  f: 8.8 },
  '瘦牛肉':   { kcal: 185, p: 28.5, c: 1.5,  f: 6.8 },
  '熟牛肉':   { kcal: 185, p: 28.5, c: 1.5,  f: 6.8 },
  '卤牛肉':   { kcal: 192, p: 29.0, c: 2.2,  f: 7.2 },
  '酱牛肉':   { kcal: 192, p: 29.0, c: 2.2,  f: 7.2 },
  '牛腱子':   { kcal: 168, p: 28.0, c: 1.0,  f: 5.5 },
  '猪瘦肉':   { kcal: 143, p: 20.3, c: 1.5,  f: 6.2 },
  '猪里脊':   { kcal: 155, p: 21.5, c: 1.2,  f: 6.8 },
  '虾仁':     { kcal: 93,  p: 18.6, c: 0.8,  f: 1.4 },
  '基围虾':   { kcal: 93,  p: 18.6, c: 0.8,  f: 1.4 },
  '水煮虾':   { kcal: 93,  p: 18.6, c: 0.8,  f: 1.4 },
  '三文鱼':   { kcal: 208, p: 20.4, c: 0.0,  f: 13.4 },
  '纯牛奶':   { kcal: 54,  p: 3.0,  c: 3.4,  f: 3.2 },
  '牛奶':     { kcal: 54,  p: 3.0,  c: 3.4,  f: 3.2 },
  '脱脂牛奶': { kcal: 34,  p: 3.4,  c: 5.0,  f: 0.1 },
  '无糖豆浆': { kcal: 31,  p: 3.0,  c: 1.2,  f: 1.6 },
  '豆浆':     { kcal: 31,  p: 3.0,  c: 1.2,  f: 1.6 },
  '北豆腐':   { kcal: 98,  p: 12.2, c: 1.5,  f: 4.8 },
  '南豆腐':   { kcal: 57,  p: 6.2,  c: 2.4,  f: 2.5 },
  '豆腐':     { kcal: 82,  p: 8.1,  c: 4.2,  f: 3.7 },
  '西兰花':   { kcal: 34,  p: 2.8,  c: 6.6,  f: 0.4 },
  '水煮西兰花':{ kcal: 34,  p: 2.8,  c: 6.6,  f: 0.4 },
  '生菜':     { kcal: 16,  p: 1.3,  c: 2.3,  f: 0.3 },
  '黄瓜':     { kcal: 16,  p: 0.8,  c: 2.9,  f: 0.2 },
  '番茄':     { kcal: 18,  p: 0.9,  c: 3.9,  f: 0.2 },
  '西红柿':   { kcal: 18,  p: 0.9,  c: 3.9,  f: 0.2 },
  '菠菜':     { kcal: 28,  p: 2.6,  c: 4.5,  f: 0.3 },
  '苹果':     { kcal: 52,  p: 0.3,  c: 13.8, f: 0.2 },
  '香蕉':     { kcal: 89,  p: 1.1,  c: 22.8, f: 0.3 },
  '蓝莓':     { kcal: 57,  p: 0.7,  c: 14.5, f: 0.3 },
  '美式咖啡': { kcal: 3,   p: 0.3,  c: 0.5,  f: 0.0 },
  '黑咖啡':   { kcal: 3,   p: 0.3,  c: 0.5,  f: 0.0 }
};

function normName(s) {
  return String(s || '')
    .replace(/[\s\u3000]+/g, '')
    .replace(/[（(［\[][^）)］\]]*[）)］\]]/g, '')
    .trim();
}

function lookupStandardOrExactLocal(cnName) {
  var q = normName(cnName);
  if (!q) return null;

  if (STANDARD_FOODS[q]) return STANDARD_FOODS[q];

  if (typeof FOOD_DB !== 'undefined' && Array.isArray(FOOD_DB)) {
    for (var i = 0; i < FOOD_DB.length; i++) {
      var r = FOOD_DB[i];
      if (!r) continue;
      var rawFull = Array.isArray(r) ? r[0] : r.n;
      var kcal    = Array.isArray(r) ? r[1] : r.cal;
      var p       = Array.isArray(r) ? r[2] : r.p;
      var c       = Array.isArray(r) ? r[3] : r.c;
      var f       = Array.isArray(r) ? r[4] : r.f;
      if (!rawFull) continue;
      if (/婴儿|配方|肉松|脱水|干粉/.test(rawFull) && !/婴儿|配方|肉松|脱水|干粉/.test(q)) continue;
      var base = normName(rawFull);
      if (base === q) {
        return { kcal: Number(kcal) || 0, p: Number(p) || 0, c: Number(c) || 0, f: Number(f) || 0 };
      }
    }
  }
  return null;
}

function resolveNutrition(result, userDesc) {
  var ings = Array.isArray(result.ingredients) ? result.ingredients : [];
  if (!ings.length) return;

  var descStr = String(userDesc || '');
  var userMentionedOil = /油/.test(descStr);

  // 自动剥离 AI 擅自添加的独立“花生油/食用油/植物油”
  if (!userMentionedOil && ings.length > 1) {
    ings = ings.filter(function(it) {
      var n = normName(it.name);
      return !/^(花生油|食用油|植物油|大豆油|菜籽油|色拉油|调和油|玉米油|葵花籽油|猪油|橄榄油)$/.test(n);
    });
    result.ingredients = ings;
  }

  for (var i = 0; i < ings.length; i++) {
    var it = ings[i];
    var grams = Number(it.grams) || 100;
    var cat = String(it.category || '').toLowerCase();
    var nameNorm = normName(it.name);

    var isMacroOrSupplement =
      cat === 'macro' ||
      /纯蛋白|蛋白质|碳水|脂肪|蛋白粉|乳清|增肌粉|肌酸|支链氨基酸|bcaa|鱼油|维生素/i.test(nameNorm) ||
      /\d+\s*(?:g|克)\s*(?:纯)?(?:蛋白质|蛋白|碳水|脂肪)/i.test(descStr);

    if (isMacroOrSupplement) {
      it._src = cat === 'macro' ? '营养直录' : 'AI补剂/熟食';
      continue;
    }

    if (it.use_db === true || STANDARD_FOODS[nameNorm]) {
      var std = lookupStandardOrExactLocal(it.name);
      if (std && std.kcal > 0) {
        var ratio = grams / 100;
        it.calories = Math.round(std.kcal * ratio);
        it.protein  = Math.round(std.p    * ratio * 10) / 10;
        it.carbs    = Math.round(std.c    * ratio * 10) / 10;
        it.fat      = Math.round(std.f    * ratio * 10) / 10;
        it._src     = '标准库';
        continue;
      }
    }

    it._src = 'AI烹调估算';
  }
}

// ====== Atwater 能量守恒与物理合理性护栏 ======
function sanitizeAndReconcileResult(result, userDesc) {
  if (!result || typeof result !== 'object') result = {};
  var ings = Array.isArray(result.ingredients) ? result.ingredients : [];

  if (ings.length === 0) {
    var p0 = Math.max(Number(result.protein) || 0, 0);
    var c0 = Math.max(Number(result.carbs)   || 0, 0);
    var f0 = Math.max(Number(result.fat)     || 0, 0);
    var cal0 = Math.max(Number(result.total_calories) || 0, 0);
    ings = [{
      name: result.food_name || '饮食记录',
      grams: 100,
      calories: cal0,
      protein: p0,
      carbs: c0,
      fat: f0,
      category: 'cooked',
      _src: 'AI估算'
    }];
    result.ingredients = ings;
  }

  var totCal = 0, totP = 0, totC = 0, totF = 0;

  for (var i = 0; i < ings.length; i++) {
    var it = ings[i];
    var g = Math.max(Math.round(Number(it.grams) || 100), 1);
    var p = Math.max(Math.round((Number(it.protein) || 0) * 10) / 10, 0);
    var c = Math.max(Math.round((Number(it.carbs)   || 0) * 10) / 10, 0);
    var f = Math.max(Math.round((Number(it.fat)     || 0) * 10) / 10, 0);
    var cal = Math.max(Math.round(Number(it.calories) || 0), 0);

    var macroCal = Math.round(p * 4 + c * 4 + f * 9);
    if (macroCal > 0) {
      if (cal <= 0 || (Math.abs(macroCal - cal) > Math.max(20, cal * 0.15))) {
        cal = macroCal;
      }
    }

    it.grams    = g;
    it.protein  = p;
    it.carbs    = c;
    it.fat      = f;
    it.calories = cal;

    it._baseGrams = g;
    it._baseCal   = cal;
    it._baseP     = p;
    it._baseC     = c;
    it._baseF     = f;

    totCal += cal;
    totP   += p;
    totC   += c;
    totF   += f;
  }

  result.total_calories = Math.round(totCal);
  result.protein        = Math.round(totP * 10) / 10;
  result.carbs          = Math.round(totC * 10) / 10;
  result.fat            = Math.round(totF * 10) / 10;
  if (!result.food_name) {
    result.food_name = ings.map(function(x) { return x.name; }).slice(0, 3).join(' + ');
  }
  return result;
}

// ============================================================================
// ====== 识别结果弹窗（支持在线改克数 & 实时重算营养素） ======
// ============================================================================

function showResultModal(data, imgBase64) {
  document.getElementById('res-name').textContent = data.food_name || '识别结果';

  var imgEl = document.getElementById('res-img');
  if (imgBase64) {
    imgEl.src = imgBase64;
    imgEl.style.display = 'block';
  } else {
    imgEl.src = '';
    imgEl.style.display = 'none';
  }

  renderResultSummaryAndIngredients();

  var tipBox = document.getElementById('res-tip-box');
  if (data.health_tip) {
    document.getElementById('res-tip').textContent = data.health_tip;
    tipBox.style.display = 'flex';
  } else {
    tipBox.style.display = 'none';
  }

  var hour = new Date().getHours();
  var mealSelect = document.getElementById('res-meal-type');
  if      (hour >= 5  && hour < 10) mealSelect.value = '早餐';
  else if (hour >= 10 && hour < 15) mealSelect.value = '午餐';
  else if (hour >= 17 && hour < 22) mealSelect.value = '晚餐';
  else                              mealSelect.value = '加餐';

  document.getElementById('modal-result').style.display = 'flex';
}

function renderResultSummaryAndIngredients() {
  if (!tempMealResult) return;
  document.getElementById('res-calories').textContent = Math.round(Number(tempMealResult.total_calories) || 0);
  document.getElementById('res-protein').textContent  = (Number(tempMealResult.protein) || 0) + 'g';
  document.getElementById('res-carbs').textContent    = (Number(tempMealResult.carbs)   || 0) + 'g';
  document.getElementById('res-fat').textContent      = (Number(tempMealResult.fat)     || 0) + 'g';

  var ings = tempMealResult.ingredients || [];
  document.getElementById('res-ingredients').innerHTML = ings.map(function(i, idx) {
    var srcClass = i._src === '标准库' ? 'db' : (i._src === '营养直录' ? 'macro' : 'ai');
    var srcLabel = i._src || 'AI估算';
    return (
      '<div class="ing-row">' +
        '<div class="ing-left">' +
          '<div class="ing-title-line">' +
            '<span class="ing-name">' + esc(i.name) + '</span>' +
            '<span class="ing-src-tag ' + srcClass + '">' + esc(srcLabel) + '</span>' +
          '</div>' +
          '<div class="ing-macro-line" id="ing-macro-line-' + idx + '">' +
            '蛋白 ' + (Number(i.protein) || 0) + 'g · 碳水 ' + (Number(i.carbs) || 0) + 'g · 脂肪 ' + (Number(i.fat) || 0) + 'g' +
          '</div>' +
        '</div>' +
        '<div class="ing-right">' +
          '<input type="number" class="ing-gram-input" value="' + (Number(i.grams) || 100) + '" min="1" step="5" oninput="updateIngGrams(' + idx + ', this.value)" />' +
          '<span style="font-size:11px;color:var(--text-dim);">g</span>' +
          '<span class="ing-cal" id="ing-cal-' + idx + '">' + Math.round(Number(i.calories) || 0) + ' kcal</span>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}

function updateIngGrams(idx, val) {
  if (!tempMealResult || !tempMealResult.ingredients || !tempMealResult.ingredients[idx]) return;
  var it = tempMealResult.ingredients[idx];
  var newGrams = parseFloat(val);
  if (isNaN(newGrams) || newGrams < 0) return;

  var baseG = Number(it._baseGrams) || 100;
  var factor = baseG > 0 ? (newGrams / baseG) : 1;

  it.grams    = Math.round(newGrams);
  it.calories = Math.round((Number(it._baseCal) || 0) * factor);
  it.protein  = Math.round((Number(it._baseP)   || 0) * factor * 10) / 10;
  it.carbs    = Math.round((Number(it._baseC)   || 0) * factor * 10) / 10;
  it.fat      = Math.round((Number(it._baseF)   || 0) * factor * 10) / 10;

  var totCal = 0, totP = 0, totC = 0, totF = 0;
  tempMealResult.ingredients.forEach(function(x) {
    totCal += Number(x.calories) || 0;
    totP   += Number(x.protein)  || 0;
    totC   += Number(x.carbs)    || 0;
    totF   += Number(x.fat)      || 0;
  });
  tempMealResult.total_calories = Math.round(totCal);
  tempMealResult.protein        = Math.round(totP * 10) / 10;
  tempMealResult.carbs          = Math.round(totC * 10) / 10;
  tempMealResult.fat            = Math.round(totF * 10) / 10;

  document.getElementById('res-calories').textContent = tempMealResult.total_calories;
  document.getElementById('res-protein').textContent  = tempMealResult.protein + 'g';
  document.getElementById('res-carbs').textContent    = tempMealResult.carbs + 'g';
  document.getElementById('res-fat').textContent      = tempMealResult.fat + 'g';

  var calEl = document.getElementById('ing-cal-' + idx);
  if (calEl) calEl.textContent = it.calories + ' kcal';
  var macroLineEl = document.getElementById('ing-macro-line-' + idx);
  if (macroLineEl) {
    macroLineEl.textContent = '蛋白 ' + it.protein + 'g · 碳水 ' + it.carbs + 'g · 脂肪 ' + it.fat + 'g';
  }
}

function closeResult() {
  document.getElementById('modal-result').style.display = 'none';
  tempMealResult = null;
}

function saveMeal() {
  if (!tempMealResult) return;
  var mealType = document.getElementById('res-meal-type').value;
  var now      = new Date();

  mealsHistory.unshift({
    id:       Date.now(),
    date:     selectedDate,
    time:     now.toTimeString().slice(0, 5),
    name:     tempMealResult.food_name || '未知菜品',
    mealType: mealType,
    calories: Number(tempMealResult.total_calories) || 0,
    protein:  Number(tempMealResult.protein)        || 0,
    carbs:    Number(tempMealResult.carbs)          || 0,
    fat:      Number(tempMealResult.fat)            || 0,
    img:      tempMealResult.img                    || ''
  });

  persistMeals();
  closeResult();
  renderDashboard();
  var isToday = (selectedDate === toDateStr(new Date()));
  toast('已记入' + (isToday ? '今日' : formatChineseDate(selectedDate)) + mealType);
}

function deleteMeal(id) {
  mealsHistory = mealsHistory.filter(function(m) { return m.id !== id; });
  persistMeals();
  renderDashboard();
  toast('已删除该条记录');
}

function clearToday() {
  var isToday = (selectedDate === toDateStr(new Date()));
  var label = isToday ? '今天' : formatChineseDate(selectedDate);
  if (!confirm('确定要清空【' + label + '】的所有饮食记录吗？')) return;
  mealsHistory = mealsHistory.filter(function(m) { return m.date !== selectedDate; });
  persistMeals();
  renderDashboard();
  toast('已清空' + label + '记录');
}

// ============================================================================
// ====== 手动快速录入 / 历史快速补录弹窗 ======
// ============================================================================

function openManualModal() {
  var isToday = (selectedDate === toDateStr(new Date()));
  var targetEl = document.getElementById('manual-target-date');
  if (targetEl) targetEl.textContent = isToday ? ('今天 ' + formatChineseDate(selectedDate)) : formatChineseDate(selectedDate);
  document.getElementById('manual-name').value = '';
  document.getElementById('manual-p').value = '';
  document.getElementById('manual-c').value = '';
  document.getElementById('manual-f').value = '';
  document.getElementById('manual-cal').value = '';
  document.getElementById('modal-manual').style.display = 'flex';
}

function closeManualModal() {
  document.getElementById('modal-manual').style.display = 'none';
}

function syncManualCal() {
  var p = parseFloat(document.getElementById('manual-p').value) || 0;
  var c = parseFloat(document.getElementById('manual-c').value) || 0;
  var f = parseFloat(document.getElementById('manual-f').value) || 0;
  if (p > 0 || c > 0 || f > 0) {
    document.getElementById('manual-cal').value = Math.round(p * 4 + c * 4 + f * 9);
  }
}

function saveManualMeal() {
  var name = document.getElementById('manual-name').value.trim();
  var p = Math.max(parseFloat(document.getElementById('manual-p').value) || 0, 0);
  var c = Math.max(parseFloat(document.getElementById('manual-c').value) || 0, 0);
  var f = Math.max(parseFloat(document.getElementById('manual-f').value) || 0, 0);
  var cal = Math.max(parseInt(document.getElementById('manual-cal').value, 10) || 0, 0);
  var mealType = document.getElementById('manual-meal-type').value;

  if (cal <= 0 && (p > 0 || c > 0 || f > 0)) {
    cal = Math.round(p * 4 + c * 4 + f * 9);
  }
  if (cal <= 0 && p <= 0 && c <= 0 && f <= 0) {
    toast('请至少填写热量或任意一项营养素克数');
    return;
  }
  if (!name) {
    var parts = [];
    if (p > 0) parts.push('蛋白' + p + 'g');
    if (c > 0) parts.push('碳水' + c + 'g');
    if (f > 0) parts.push('脂肪' + f + 'g');
    name = parts.length ? ('手动记录 (' + parts.join('/') + ')') : ('手动记录 ' + cal + 'kcal');
  }

  mealsHistory.unshift({
    id:       Date.now(),
    date:     selectedDate,
    time:     new Date().toTimeString().slice(0, 5),
    name:     name,
    mealType: mealType,
    calories: Math.round(cal),
    protein:  Math.round(p * 10) / 10,
    carbs:    Math.round(c * 10) / 10,
    fat:      Math.round(f * 10) / 10,
    img:      ''
  });

  persistMeals();
  closeManualModal();
  renderDashboard();
  toast('已手动记入 ' + formatChineseDate(selectedDate));
}

// ============================================================================
// ====== 个人身体档案科学计算 + 设置保存 + 历史数据备份与恢复 ======
// ============================================================================

function calcGoals(gender, age, height, weight, goalType, activity) {
  var s = (gender === 'female') ? -161 : 5;
  var bmr = 10 * weight + 6.25 * height - 5 * age + s;
  var tdee = bmr * activity;

  var hMeters = height / 100;
  var bmi = weight / (hMeters * hMeters);
  var refWeight = bmi > 28 ? (25 * hMeters * hMeters) : weight;

  var targetCal;
  if (goalType === 'cut') {
    targetCal = Math.round(Math.max(tdee - 400, bmr * 1.05, 1200));
  } else if (goalType === 'bulk') {
    targetCal = Math.round(tdee + 250);
  } else {
    targetCal = Math.round(tdee);
  }

  var pPerKg = (goalType === 'cut') ? 2.0 : (goalType === 'bulk') ? 2.0 : 1.8;
  var p = Math.round(refWeight * pPerKg);

  var fatRatio = (goalType === 'bulk') ? 0.20 : 0.22;
  var f = Math.max(Math.round((targetCal * fatRatio) / 9), Math.round(refWeight * 0.5));

  var remainingCal = targetCal - (p * 4 + f * 9);
  var c = Math.max(Math.round(remainingCal / 4), 50);
  var cal = p * 4 + c * 4 + f * 9;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    cal: cal,
    p: p,
    c: c,
    f: f,
    pPerKg: pPerKg,
    fatRatioPct: Math.round(fatRatio * 100)
  };
}

function applyRecommendedGoals() {
  var gender   = document.getElementById('input-gender').value;
  var age      = parseFloat(document.getElementById('input-age').value) || 25;
  var height   = parseFloat(document.getElementById('input-height').value) || 175;
  var weight   = parseFloat(document.getElementById('input-weight').value) || 70;
  var goalType = document.getElementById('input-goal-type').value;
  var activity = parseFloat(document.getElementById('input-activity').value) || 1.375;

  if (height < 100 || height > 250 || weight < 25 || weight > 250) {
    toast('请输入合理的身高(100~250cm)与体重(25~250kg)');
    return;
  }

  var res = calcGoals(gender, age, height, weight, goalType, activity);
  document.getElementById('input-cal').value = res.cal;
  document.getElementById('input-p').value   = res.p;
  document.getElementById('input-c').value   = res.c;
  document.getElementById('input-f').value   = res.f;

  var goalLabel = goalType === 'cut' ? '减脂塑形' : goalType === 'bulk' ? '增肌增重' : '保持体重';
  var explainEl = document.getElementById('calc-explain');
  if (explainEl) {
    explainEl.style.display = 'block';
    explainEl.innerHTML =
      '<b>推荐目标参考：</b><br>' +
      '• 基础代谢 BMR：<b>' + res.bmr + '</b> kcal ｜ 日常消耗 TDEE：<b>' + res.tdee + '</b> kcal<br>' +
      '• 阶段目标：<b>' + res.cal + '</b> kcal · ' + goalLabel + '<br>' +
      '• 蛋白质：<b>' + res.p + 'g</b> ｜ 脂肪：<b>' + res.f + 'g</b> ｜ 碳水：<b>' + res.c + 'g</b>';
  }
  toast('已推算推荐目标，保存后生效');
}

function syncCalFromMacros() {
  var p = parseFloat(document.getElementById('input-p').value) || 0;
  var c = parseFloat(document.getElementById('input-c').value) || 0;
  var f = parseFloat(document.getElementById('input-f').value) || 0;
  var cal = Math.round(p * 4 + c * 4 + f * 9);
  if (cal > 0) {
    document.getElementById('input-cal').value = cal;
  }
}

function populateSettingsForm() {
  var themeSel = document.getElementById('input-theme-mode');
  if (themeSel) themeSel.value = config.themeMode || 'marvel';
  var keyEl = document.getElementById('input-key');
  if (keyEl) keyEl.value = config.apiKey || '';
  var baseInput = document.getElementById('input-base-url');
  if (baseInput) baseInput.value = config.baseUrl || 'https://api.deepseek.com';
  var modelInput = document.getElementById('input-model');
  if (modelInput) modelInput.value = config.model || 'deepseek-flash';
  var usdaEl = document.getElementById('input-usda-key');
  if (usdaEl) usdaEl.value = config.usdaKey || '';
  var genderEl = document.getElementById('input-gender');
  if (genderEl) genderEl.value = config.gender || 'male';
  var ageEl = document.getElementById('input-age');
  if (ageEl) ageEl.value = config.age || 25;
  var heightEl = document.getElementById('input-height');
  if (heightEl) heightEl.value = config.height || 175;
  var weightEl = document.getElementById('input-weight');
  if (weightEl) weightEl.value = config.weight || 70;
  var goalEl = document.getElementById('input-goal-type');
  if (goalEl) goalEl.value = config.goalType || 'cut';
  var actEl = document.getElementById('input-activity');
  if (actEl) actEl.value = String(config.activity || 1.375);
  var calEl = document.getElementById('input-cal');
  if (calEl) calEl.value = config.calGoal;
  var pEl = document.getElementById('input-p');
  if (pEl) pEl.value = config.pGoal;
  var cEl = document.getElementById('input-c');
  if (cEl) cEl.value = config.cGoal;
  var fEl = document.getElementById('input-f');
  if (fEl) fEl.value = config.fGoal;
}

function openSettings() {
  switchTab('settings');
}

function closeSettings() {
  switchTab('home');
}

function saveSettings() {
  var key = document.getElementById('input-key').value.trim();
  if (!key) { toast('请填写 DeepSeek API Key'); return; }

  var themeSel = document.getElementById('input-theme-mode');
  if (themeSel) config.themeMode = themeSel.value || 'marvel';
  config.apiKey   = key;
  var baseInput = document.getElementById('input-base-url');
  config.baseUrl  = (baseInput && baseInput.value.trim()) ? baseInput.value.trim() : 'https://api.deepseek.com';
  var modelInput = document.getElementById('input-model');
  config.model    = (modelInput && modelInput.value.trim()) ? modelInput.value.trim() : 'deepseek-flash';
  config.usdaKey  = document.getElementById('input-usda-key').value.trim();
  config.gender   = document.getElementById('input-gender').value;
  config.age      = parseInt(document.getElementById('input-age').value, 10)    || 25;
  config.height   = parseFloat(document.getElementById('input-height').value)  || 175;
  config.weight   = parseFloat(document.getElementById('input-weight').value)  || 70;
  config.goalType = document.getElementById('input-goal-type').value;
  config.activity = parseFloat(document.getElementById('input-activity').value) || 1.375;
  config.pGoal    = parseInt(document.getElementById('input-p').value, 10)      || 150;
  config.cGoal    = parseInt(document.getElementById('input-c').value, 10)      || 200;
  config.fGoal    = parseInt(document.getElementById('input-f').value, 10)      || 65;

  var rawCal = parseInt(document.getElementById('input-cal').value, 10);
  var macroCal = Math.round(config.pGoal * 4 + config.cGoal * 4 + config.fGoal * 9);
  config.calGoal = rawCal > 0 ? rawCal : macroCal;

  try {
    localStorage.setItem('diet_cfg', JSON.stringify(config));
  } catch (e) { console.error('保存设置失败:', e); }
  applyTheme();
  renderDashboard();
  toast('设置已保存');
}

// ====== 一键导出与恢复历史备份 ======
function exportBackup() {
  var cleanMeals = mealsHistory.map(function(m) {
    return {
      id: m.id,
      date: m.date,
      time: m.time,
      name: m.name,
      mealType: m.mealType,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat
    };
  });
  var payload = JSON.stringify({
    version: 14,
    exportedAt: new Date().toISOString(),
    config: config,
    meals: cleanMeals
  });

  var box = document.getElementById('backup-json-input');
  if (box) {
    box.value = payload;
    box.select();
  }

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(payload).then(function() {
        toast('已复制全部备份数据到剪贴板！共 ' + cleanMeals.length + ' 条记录');
      }).catch(function() {
        document.execCommand('copy');
        toast('备份已生成并复制到剪贴板');
      });
    } else {
      document.execCommand('copy');
      toast('备份数据已复制到剪贴板！共 ' + cleanMeals.length + ' 条记录');
    }
  } catch (e) {
    toast('备份已生成在下方文本框中，长按全选复制即可');
  }
}

function importBackup() {
  var box = document.getElementById('backup-json-input');
  var raw = box ? box.value.trim() : '';
  if (!raw) {
    toast('请先在文本框中粘贴备份 JSON 数据');
    return;
  }
  try {
    var data = JSON.parse(raw);
    var importedMeals = Array.isArray(data) ? data : (Array.isArray(data.meals) ? data.meals : []);
    if (data.config && typeof data.config === 'object') {
      if (data.config.apiKey && !config.apiKey) config.apiKey = data.config.apiKey;
      if (data.config.calGoal) config.calGoal = Number(data.config.calGoal) || config.calGoal;
      if (data.config.pGoal)   config.pGoal   = Number(data.config.pGoal)   || config.pGoal;
      if (data.config.cGoal)   config.cGoal   = Number(data.config.cGoal)   || config.cGoal;
      if (data.config.fGoal)   config.fGoal   = Number(data.config.fGoal)   || config.fGoal;
      localStorage.setItem('diet_cfg', JSON.stringify(config));
    }

    var existingIds = {};
    mealsHistory.forEach(function(m) { existingIds[m.id] = true; });
    var added = 0;
    importedMeals.forEach(function(m) {
      if (m && m.date && m.calories != null && !existingIds[m.id]) {
        mealsHistory.push({
          id: m.id || (Date.now() + Math.floor(Math.random() * 100000)),
          date: m.date,
          time: m.time || '12:00',
          name: m.name || '历史记录',
          mealType: m.mealType || '正餐',
          calories: Number(m.calories) || 0,
          protein: Number(m.protein) || 0,
          carbs: Number(m.carbs) || 0,
          fat: Number(m.fat) || 0,
          img: ''
        });
        added++;
      }
    });

    mealsHistory.sort(function(a, b) { return (b.id || 0) - (a.id || 0); });
    persistMeals();
    renderDashboard();
    toast('成功恢复/合并 ' + added + ' 条饮食记录');
  } catch (e) {
    toast('备份格式解析失败，请确认粘贴的是完整 JSON');
  }
}

function showLoading(show) {
  document.getElementById('modal-loading').style.display = show ? 'flex' : 'none';
}
