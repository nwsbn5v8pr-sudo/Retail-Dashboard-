(() => {
  "use strict";

  const STORAGE_KEY = "manager-performance-v2";
  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  /* ---------- Dates ---------- */

  function isoDate(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function isoOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return isoDate(d);
  }

  function todayIso() {
    return isoDate(new Date());
  }

  function todayIndex() {
    return (new Date().getDay() + 6) % 7;
  }

  function weekLabel(offsetWeeks) {
    const t = new Date();
    const start = new Date(t.getFullYear(), t.getMonth(), t.getDate() - todayIndex() + 7 * (offsetWeeks || 0));
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    const fmt = d => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return fmt(start) + " – " + fmt(end) + ", " + end.getFullYear();
  }

  function shortDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function toIso(value) {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const m = String(value).match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (!m) return "";
    const year = m[3] ? (m[3].length === 2 ? "20" + m[3] : m[3]) : String(new Date().getFullYear());
    return year + "-" + m[1].padStart(2, "0") + "-" + m[2].padStart(2, "0");
  }

  /* ---------- Data ---------- */

  const metricDefaults = ["Sales", "Conversion", "Avg. Sale", "Customer Experience"];

  const WIDGET_NAMES = {
    kpis: "Metric cards",
    salesChart: "Sales by day",
    attention: "What needs attention",
    focus: "Today’s focus",
    working: "Working today",
    team: "Team at a glance",
    upcoming: "Coming up",
    actions: "Today’s key actions"
  };

  const WIDGET_SIZES = { full: "Full width", large: "Two-thirds", half: "Half", small: "One-third" };

  function defaultLayout() {
    return [
      { id: "kpis", size: "full" },
      { id: "salesChart", size: "large" },
      { id: "attention", size: "small" },
      { id: "focus", size: "large" },
      { id: "working", size: "small" },
      { id: "team", size: "small" },
      { id: "upcoming", size: "small" },
      { id: "actions", size: "small" }
    ];
  }

  // Keeps a saved layout valid: known cards only, no duplicates, any new cards added at the end.
  function normalizeLayout(layout) {
    const seen = {};
    const clean = (Array.isArray(layout) ? layout : []).filter(w => w && WIDGET_NAMES[w.id] && !seen[w.id] && (seen[w.id] = true))
      .map(w => ({ id: w.id, size: WIDGET_SIZES[w.size] ? w.size : "half", hidden: !!w.hidden }));
    defaultLayout().forEach(w => { if (!seen[w.id]) clean.push(w); });
    return clean;
  }

  const GEAR_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

  function makeSample() {
    return {
      manager: "Alex Manager",
      store: "",
      theme: "auto",
      welcomeDismissed: false,
      lastBackup: null,
      dashboard: defaultLayout(),
      salesGoal: 50000,
      convGoal: 20,
      atvGoal: 85,
      cxGoal: 90,
      metricTitles: metricDefaults.slice(),
      days: [
        { sales: 7200, conv: 18, atv: 89, cx: 92 },
        { sales: 6800, conv: 17, atv: 84, cx: 90 },
        { sales: 7600, conv: 18, atv: 90, cx: 94 }
      ],
      history: [
        { label: weekLabel(-4), sales: 46200, days: 7, conv: 17.1, atv: 83, cx: 89 },
        { label: weekLabel(-3), sales: 48900, days: 7, conv: 18.0, atv: 86, cx: 91 },
        { label: weekLabel(-2), sales: 51200, days: 7, conv: 19.2, atv: 88, cx: 93 },
        { label: weekLabel(-1), sales: 47800, days: 7, conv: 18.4, atv: 85, cx: 90 }
      ],
      team: [
        ["Alex Johnson", "On Track", "Customer Engagement", 85, ["9-5", "9-5", "Off", "Off", "12-8", "10-6", "10-6"]],
        ["Mike Carter", "Needs Coaching", "Sales Process", 62, ["Off", "12-8", "12-8", "9-5", "9-5", "Off", "11-7"]],
        ["Sarah Lee", "On Track", "Product Knowledge", 95, ["10-6", "10-6", "10-6", "Off", "Off", "9-5", "12-6"]],
        ["Tom Davis", "On Track", "Customer Experience", 78, ["12-8", "Off", "9-5", "9-5", "10-6", "12-8", "Off"]],
        ["Lisa Brown", "Needs Training", "Conversion", 68, ["Off", "9-3", "Off", "12-8", "12-8", "9-5", "10-4"]]
      ],
      coaching: [
        ["Alex Johnson", "Customer Engagement", "Practice discovery questions", isoOffset(4), "On Track"],
        ["Mike Carter", "Sales Process", "Review the selling steps together", isoOffset(2), "Follow Up"],
        ["Sarah Lee", "Product Knowledge", "Plan a product demo for the team", isoOffset(-2), "Follow Up"]
      ],
      training: [
        ["Alex Johnson", "Product Knowledge", 85, "In Progress", isoOffset(2)],
        ["Mike Carter", "Customer Engagement", 0, "Not Started", isoOffset(3)],
        ["Sarah Lee", "Leadership Basics", 100, "Completed", isoOffset(-3)],
        ["Tom Davis", "Sales Process", 78, "In Progress", isoOffset(6)],
        ["Lisa Brown", "Customer Experience", 68, "In Progress", isoOffset(4)]
      ],
      goals: [
        { name: "Team", goal: "Sign up 40 loyalty members", current: 26, target: 40, due: isoOffset(10) },
        { name: "Mike Carter", goal: "Add-on item on 30% of sales", current: 21, target: 30, due: isoOffset(14) },
        { name: "Lisa Brown", goal: "Finish customer experience training", current: 68, target: 100, due: isoOffset(4) }
      ],
      notes: [
        { date: isoOffset(-3), name: "Mike Carter", notes: "Slow start to the week. Feels rushed at the register during busy times.", commitments: "Shadow Sarah for one busy shift. Practice asking about add-on items.", followUp: isoOffset(2) },
        { date: isoOffset(-6), name: "Sarah Lee", notes: "Great week for customer experience. Interested in helping train new hires.", commitments: "Plan a 10-minute product demo for Saturday’s huddle.", followUp: isoOffset(-2) }
      ],
      huddle: [
        "Win the first 30 seconds.",
        "Greet quickly. Ask a discovery question. Find out what the customer needs.",
        "3 great customer conversations per person.",
        "Sarah — top customer experience score yesterday."
      ],
      actions: [
        "Review yesterday’s results",
        "Share today’s focus",
        "Ask for team commitments"
      ]
    };
  }

  function blankData() {
    const blank = makeSample();
    blank.manager = "";
    blank.welcomeDismissed = true;
    blank.days = [{ sales: 0, conv: 0, atv: 0, cx: 0 }];
    ["history", "team", "coaching", "training", "goals", "notes", "actions"].forEach(key => { blank[key] = []; });
    blank.huddle = ["Set today’s focus in Settings", "", "", ""];
    return blank;
  }

  function isValidData(saved) {
    return !!saved &&
      Array.isArray(saved.days) &&
      Array.isArray(saved.team) &&
      Array.isArray(saved.coaching) &&
      Array.isArray(saved.training) &&
      Array.isArray(saved.huddle) &&
      Array.isArray(saved.actions);
  }

  // Brings data saved by older versions (and backups) up to the current shape.
  function normalize(saved) {
    const renames = { "Need Coaching": "Needs Coaching", "Need Training": "Needs Training", "Avg. Transaction": "Avg. Sale" };
    saved.metricTitles = Array.isArray(saved.metricTitles) && saved.metricTitles.length === 4 ? saved.metricTitles.map(t => renames[t] || t) : metricDefaults.slice();
    if (typeof saved.store !== "string") saved.store = "";
    if (["auto", "light", "dark"].indexOf(saved.theme) < 0) saved.theme = "auto";
    if (saved.welcomeDismissed === undefined) saved.welcomeDismissed = true;
    ["history", "goals", "notes"].forEach(key => { if (!Array.isArray(saved[key])) saved[key] = []; });
    saved.dashboard = normalizeLayout(saved.dashboard);
    while (saved.huddle.length < 4) saved.huddle.push("");
    saved.team.forEach(row => {
      if (renames[row[1]]) row[1] = renames[row[1]];
      if (!Array.isArray(row[4])) row[4] = [];
      while (row[4].length < 7) row[4].push("");
    });
    saved.coaching.forEach(row => { row[3] = toIso(row[3]); });
    saved.training.forEach(row => { row[4] = toIso(row[4]); });
    return saved;
  }

  function loadData() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (isValidData(saved)) return normalize(saved);
    } catch (e) {}
    return makeSample();
  }

  let data = loadData();
  let notesFilter = "";
  let editingDashboard = false;

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function downloadBackup() {
    data.lastBackup = new Date().toISOString();
    saveData();
    const payload = { app: "manager-performance-tracker", version: 2, exportedAt: data.lastBackup, data: data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "manager-tracker-backup-" + data.lastBackup.slice(0, 10) + ".json";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 1000);
  }

  function restoreBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const restored = parsed && parsed.data ? parsed.data : parsed;
        if (!isValidData(restored)) throw new Error("invalid");
        if (!window.confirm("Replace everything in this tracker with the backup from " + (parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleDateString() : "this file") + "?")) return;
        data = normalize(restored);
        data.welcomeDismissed = true;
        saveData();
        window.alert("Backup restored.");
        go("dashboard");
        render();
      } catch (e) {
        window.alert("That file isn’t a tracker backup. Choose the .json file made by “Download Backup”.");
      }
    };
    reader.readAsText(file);
  }

  /* ---------- Calculations ---------- */

  function esc(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function money(value) {
    return "$" + Math.round(Number(value) || 0).toLocaleString();
  }

  function daysSince(iso) {
    return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : Infinity;
  }

  function greeting() {
    const hour = new Date().getHours();
    return hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  }

  // Days with no numbers entered yet don't drag the averages down.
  function activeDays() {
    return data.days.filter(d => Number(d.sales) || Number(d.conv) || Number(d.atv) || Number(d.cx));
  }

  function weekTotals() {
    const days = activeDays();
    const avg = key => days.length ? days.reduce((sum, d) => sum + Number(d[key] || 0), 0) / days.length : 0;
    return { sales: days.reduce((sum, d) => sum + Number(d.sales || 0), 0), days: days.length, conv: avg("conv"), atv: avg("atv"), cx: avg("cx") };
  }

  function statusClass(value, goal) {
    const ratio = goal ? value / goal : 0;
    return ratio >= 1 ? "good" : ratio >= 0.9 ? "warn" : "bad";
  }

  // "9-5", "10:30-7", "9a-5:30p", "8 to 4" -> hours. Anything else (Off, blank) -> 0.
  function shiftHours(text) {
    const m = String(text || "").toLowerCase().replace(/\s+/g, "").match(/^(\d{1,2})(?::(\d{2}))?(am?|pm?)?(?:-|–|to)(\d{1,2})(?::(\d{2}))?(am?|pm?)?$/);
    if (!m) return 0;
    const toHours = (h, min, ap) => {
      let value = Number(h) % 12 + Number(min || 0) / 60;
      if (ap && ap[0] === "p") value += 12;
      if (!ap && Number(h) === 12) value = 12 + Number(min || 0) / 60;
      return value;
    };
    let start = toHours(m[1], m[2], m[3]);
    let end = toHours(m[4], m[5], m[6]);
    if (!m[3] && start < 6) start += 12;
    if (!m[6] && end <= start) end += 12;
    let hours = end - start;
    if (hours <= 0) hours += 24;
    return hours > 0 && hours <= 16 ? hours : 0;
  }

  function memberHours(member) {
    return member[4].reduce((sum, s) => sum + shiftHours(s), 0);
  }

  function isWorking(shift) {
    const s = String(shift || "").trim().toLowerCase();
    return !!s && s !== "off" && s !== "-" && s !== "x";
  }

  function teamIndex(name) {
    return data.team.findIndex(m => m[0] === name);
  }

  function coachingOverdue(row) {
    return row[4] === "Overdue" || (row[4] !== "Completed" && !!row[3] && row[3] < todayIso());
  }

  function trainingOverdue(row) {
    return row[3] !== "Completed" && !!row[4] && row[4] < todayIso();
  }

  const statusOptions = {
    team: ["On Track", "Needs Coaching", "Needs Training"],
    coaching: ["On Track", "Follow Up", "Overdue", "Completed"],
    training: ["Not Started", "In Progress", "Completed"]
  };

  function statusTone(table, value) {
    if (table === "team") return value === "On Track" ? "good" : value === "Needs Training" ? "warn" : "bad";
    if (table === "coaching") return value === "Overdue" ? "bad" : value === "Follow Up" ? "warn" : "good";
    return value === "Not Started" ? "bad" : value === "In Progress" ? "warn" : "good";
  }

  function upcoming() {
    const today = todayIso();
    const limit = isoOffset(7);
    const items = [];
    data.coaching.forEach(x => {
      if (x[3] && x[4] !== "Completed") items.push({ date: x[3], what: "Coaching follow-up", who: x[0], target: "coaching" });
    });
    data.training.forEach(x => {
      if (x[4] && x[3] !== "Completed") items.push({ date: x[4], what: "Training due: " + (x[1] || "assignment"), who: x[0], target: "training" });
    });
    data.goals.forEach(g => {
      if (g.due && Number(g.current) < Number(g.target)) items.push({ date: g.due, what: "Goal due: " + (g.goal || "goal"), who: g.name, target: "goals" });
    });
    data.notes.forEach(n => {
      if (n.followUp && n.followUp >= isoOffset(-7)) items.push({ date: n.followUp, what: "1:1 follow-up", who: n.name, target: "notes" });
    });
    return items.filter(x => x.date <= limit).sort((a, b) => a.date < b.date ? -1 : 1).map(x => {
      x.tag = x.date < today ? ["Overdue", "bad"] : x.date === today ? ["Today", "warn"] : [shortDate(x.date), "neutral"];
      return x;
    });
  }

  /* ---------- Building blocks ---------- */

  function top(title, subtitle, extra) {
    return '<div class="top"><div><h1>' + esc(title) + '</h1><div class="sub">' + esc(subtitle) + '</div></div><div class="top-right"><div class="week">This week<b>' + weekLabel(0) + '</b></div>' + (extra || "") + '</div></div>';
  }

  function cell(table, row, col, type, placeholder) {
    const value = data[table][row][col];
    const attrs = ' data-table="' + table + '" data-row="' + row + '" data-col="' + col + '"';
    if (type === "status") {
      return '<select class="status status-select ' + statusTone(table, value) + '"' + attrs + ' aria-label="Status">' +
        statusOptions[table].map(o => '<option' + (o === value ? " selected" : "") + '>' + o + '</option>').join("") + '</select>';
    }
    if (type === "percent" || type === "number") {
      return '<input class="cell-input cell-num" type="number" min="0"' + (type === "percent" ? ' max="100" data-max="100"' : "") + ' data-type="number"' + attrs + ' value="' + esc(value) + '">';
    }
    if (type === "date") {
      return '<input class="cell-input cell-date" type="date"' + attrs + ' value="' + esc(value) + '">';
    }
    if (type === "textarea") {
      return '<textarea placeholder="' + esc(placeholder || "") + '"' + attrs + '>' + esc(value) + '</textarea>';
    }
    return '<input class="cell-input"' + (type === "name" ? ' list="team-names"' : "") + ' placeholder="' + esc(placeholder || "") + '"' + attrs + ' value="' + esc(value) + '">';
  }

  function teamNamesList(includeTeam) {
    return '<datalist id="team-names">' + (includeTeam ? '<option value="Team">' : "") + data.team.map(m => '<option value="' + esc(m[0]) + '">').join("") + '</datalist>';
  }

  function deleteCell(table, row) {
    return '<td><button type="button" class="action-delete" title="Delete" aria-label="Delete" data-delete-row="' + table + ':' + row + '">×</button></td>';
  }

  function progressBar(percent, tone) {
    return '<div class="bar"><i class="' + (tone || "") + '" style="width:' + Math.max(0, Math.min(100, percent)) + '%"></i></div>';
  }

  function personLink(name) {
    const i = teamIndex(name);
    return i < 0 ? '<b>' + esc(name || "—") + '</b>' : '<button type="button" class="link" data-target="member/' + i + '"><b>' + esc(name) + '</b></button>';
  }

  function tile(title, value, note) {
    return '<div class="card pad kpi"><b>' + esc(title) + '</b><div class="metric">' + value + '</div><div class="goal">' + esc(note) + '</div></div>';
  }

  // Single-series column chart. Tooltips come from data-tip; a dashed line marks the goal.
  function barChart(items, goal, goalLabel) {
    const max = Math.max(goal || 0, ...items.map(x => x.value), 1) * 1.12;
    return '<div class="chart"><div class="plot">' +
      (goal ? '<div class="goal-line" style="bottom:' + (goal / max * 100) + '%"></div>' : "") +
      items.map(it => '<div class="col" tabindex="0" data-tip="' + esc(it.tip) + '"><div class="colbar' + (it.partial ? " partial" : "") + '" style="height:' + (it.value / max * 100) + '%">' +
        (it.showValue ? '<span class="bar-val">' + esc(it.showValue) + '</span>' : "") + '</div></div>').join("") +
      '</div><div class="xaxis">' + items.map(it => '<span>' + esc(it.label) + '</span>').join("") + '</div>' +
      '<div class="legend-note">' + (items.some(it => it.partial) ? '<span><i></i>Finished weeks</span><span><i class="partial"></i>This week so far</span>' : "") + (goal ? '<span><i class="dash"></i>' + esc(goalLabel) + '</span>' : "") + '</div></div>';
  }

  function kpi(index, value, goal, type, previous) {
    const fmt = v => type === "money" ? money(v) : type === "atv" ? "$" + Number(v).toFixed(0) : Number(v).toFixed(1) + "%";
    const percent = goal ? Math.min(100, (value / goal) * 100) : 0;
    const tone = statusClass(value, goal);
    let delta = "";
    if (previous && previous.value) {
      const diff = previous.compare - previous.value;
      const up = diff >= 0;
      const amount = type === "money" ? Math.abs(diff / previous.value * 100).toFixed(0) + "% daily avg" : type === "atv" ? "$" + Math.abs(diff).toFixed(0) : Math.abs(diff).toFixed(1) + " pts";
      delta = '<div class="delta ' + (Math.abs(diff) < 0.05 ? "" : up ? "up" : "down") + '">' + (up ? "▲ " : "▼ ") + amount + ' vs last week</div>';
    }
    return '<button type="button" class="card pad kpi kpi-link" data-target="daily"><b>' + esc(data.metricTitles[index]) + '</b><div class="metric">' + fmt(value) + '</div><div class="goal">Goal: ' + fmt(goal) + '</div>' +
      progressBar(percent, tone === "good" ? "" : tone) + delta + '</button>';
  }

  /* ---------- Pages ---------- */

  function dashboard() {
    const week = weekTotals();
    const last = data.history[data.history.length - 1];
    const compare = (prev, now) => last && week.days ? { value: prev, compare: now } : null;
    const attention = [];
    if (week.days && week.conv < data.convGoal) attention.push([data.metricTitles[1], (data.convGoal - week.conv).toFixed(1) + " points below goal", "daily"]);
    if (week.sales < data.salesGoal) attention.push([data.metricTitles[0], money(data.salesGoal - week.sales) + " to go to reach this week’s goal", "daily"]);
    const overdue = data.coaching.filter(coachingOverdue).length;
    if (overdue) attention.push(["Coaching", overdue + (overdue === 1 ? " follow-up is" : " follow-ups are") + " overdue", "coaching"]);
    const openTraining = data.training.filter(x => x[3] !== "Completed").length;
    if (openTraining) attention.push(["Training", openTraining + (openTraining === 1 ? " assignment" : " assignments") + " still open", "training"]);

    let banner = "";
    if (!data.welcomeDismissed) {
      banner = '<div class="card pad welcome"><div><b>Welcome to your tracker!</b><p>You’re looking at sample data so you can see how everything works. When you’re ready, start fresh and add your own team. Everything saves automatically on this device.</p></div><div class="welcome-actions"><button type="button" class="btn" id="welcome-fresh">Start Fresh</button><button type="button" class="btn alt" id="welcome-keep">Explore Sample Data</button></div></div>';
    } else if (daysSince(data.lastBackup) >= 7) {
      banner = '<div class="notice backup-notice"><span>' + (data.lastBackup ? "It’s been " + daysSince(data.lastBackup) + " days since your last backup." : "You haven’t downloaded a backup yet.") + ' A backup keeps your data safe if your browser is cleared.</span><button type="button" class="btn alt" id="banner-backup">Download Backup</button></div>';
    }

    const dailyGoal = data.salesGoal / 7;
    const lastActive = data.days.reduce((acc, d, i) => Number(d.sales) ? i : acc, -1);
    const salesChart = '<div class="card pad"><div class="head"><div><h2>' + esc(data.metricTitles[0]) + ' by day</h2><p>Each day compared with your daily goal (weekly goal ÷ 7).</p></div><button type="button" class="btn alt small" data-target="daily">Enter results</button></div>' +
      barChart(data.days.map((d, i) => {
        const label = WEEKDAYS[i] || "Day " + (i + 1);
        return { label: label, value: Number(d.sales) || 0, showValue: i === lastActive ? money(d.sales) : "", tip: label + ": " + money(d.sales) + " · " + Math.round((Number(d.sales) || 0) / dailyGoal * 100) + "% of daily goal" };
      }), dailyGoal, "Daily goal " + money(dailyGoal)) + '</div>';

    const working = data.team.filter(m => isWorking(m[4][todayIndex()]));
    const soon = upcoming().slice(0, 5);

    const widgets = {
      kpis: () => '<div class="grid4">' +
        kpi(0, week.sales, data.salesGoal, "money", last ? compare(last.sales / (last.days || 7), week.sales / (week.days || 1)) : null) +
        kpi(1, week.conv, data.convGoal, "pct", last ? compare(last.conv, week.conv) : null) +
        kpi(2, week.atv, data.atvGoal, "atv", last ? compare(last.atv, week.atv) : null) +
        kpi(3, week.cx, data.cxGoal, "pct", last ? compare(last.cx, week.cx) : null) +
        '</div>',
      salesChart: () => salesChart,
      attention: () => '<div class="card pad attention"><div class="attn-title">WHAT NEEDS ATTENTION</div>' +
        (attention.length ? "" : '<div class="notice">Everything is on track. Nice work!</div>') +
        attention.slice(0, 4).map((item, i) => '<button type="button" class="attn attention-link" data-target="' + item[2] + '"><span class="num ' + (i ? "amber" : "") + '">' + (i + 1) + '</span><div><b>' + esc(item[0]) + '</b><small>' + item[1] + '</small></div><span aria-hidden="true">›</span></button>').join("") +
        '</div>',
      focus: () => '<div class="card pad focus"><div class="label">TODAY’S FOCUS</div><h2>' + esc(data.huddle[0]) + '</h2><div class="sub">' + esc(data.huddle[1]) + '</div></div>',
      working: () => '<div class="card pad"><div class="head"><div><h2>Working today</h2><p>' + ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][todayIndex()] + ' · ' + working.length + (working.length === 1 ? " person" : " people") + '</p></div><button type="button" class="btn alt small" data-target="schedule">Schedule</button></div>' +
        (working.length ? working.map(m => '<div class="list-row">' + personLink(m[0]) + '<span class="status neutral">' + esc(m[4][todayIndex()]) + '</span></div>').join("") : '<div class="empty">No one is scheduled today. Add shifts on the Schedule tab.</div>') +
        '</div>',
      team: () => '<div class="card pad"><div class="head"><div><h2>Team at a glance</h2><p>' + data.team.length + (data.team.length === 1 ? " team member" : " team members") + ' · tap a name for their profile</p></div></div><div class="mini">' +
        '<div><strong>' + data.team.filter(x => x[1] === "On Track").length + '</strong><span>On Track</span></div>' +
        '<div><strong>' + data.team.filter(x => x[1] === "Needs Coaching").length + '</strong><span>Needs Coaching</span></div>' +
        '<div><strong>' + data.team.filter(x => x[1] === "Needs Training").length + '</strong><span>Needs Training</span></div></div>' +
        '<div class="people">' + data.team.map((m, i) => '<button type="button" class="chip" data-target="member/' + i + '"><span class="dot ' + (statusTone("team", m[1]) === "good" ? "" : statusTone("team", m[1])) + '"></span>' + esc(m[0] || "Unnamed") + '</button>').join("") + '</div></div>',
      upcoming: () => '<div class="card pad"><div class="head"><div><h2>Coming up</h2><p>Due in the next 7 days, plus anything overdue.</p></div></div>' +
        (soon.length ? soon.map(x => '<button type="button" class="list-row row-link" data-target="' + x.target + '"><div><b>' + esc(x.what) + '</b><small>' + esc(x.who || "") + '</small></div><span class="status ' + x.tag[1] + '">' + esc(x.tag[0]) + '</span></button>').join("") : '<div class="empty">Nothing due this week.</div>') +
        '</div>',
      actions: () => '<div class="card pad"><div class="head"><div><h2>Today’s key actions</h2><p>Keep it short. Keep it moving.</p></div><button type="button" class="btn small" id="add-action">+ Add</button></div>' +
        (data.actions.length ? "" : '<div class="empty">No actions yet.</div>') +
        data.actions.map((action, i) => '<div class="action action-edit"><input class="action-input" data-action="' + i + '" value="' + esc(action) + '" placeholder="New action" aria-label="Action ' + (i + 1) + '"><button type="button" class="action-delete" aria-label="Delete action" data-delete-action="' + i + '">×</button></div>').join("") +
        '</div>'
    };

    const layout = data.dashboard;
    const visible = layout.filter(w => !w.hidden);
    const hidden = layout.filter(w => w.hidden);
    const gear = '<button type="button" class="icon-btn' + (editingDashboard ? " on" : "") + '" id="dash-edit" aria-pressed="' + editingDashboard + '" aria-label="Customize dashboard" title="Customize dashboard">' + GEAR_ICON + '</button>';

    const editBar = editingDashboard ? '<div class="card pad edit-bar"><div><b>Customize your dashboard</b><p>Drag a card by its ⠿ handle (or use the arrows) to move it. Change a card’s width, or hide cards you don’t use. Changes save automatically.</p></div>' +
      '<div class="btn-row"><button type="button" class="btn alt" id="dash-reset">Reset Layout</button><button type="button" class="btn" id="dash-done">Done</button></div>' +
      (hidden.length ? '<div class="hidden-tray"><span>Hidden cards:</span>' + hidden.map(w => '<button type="button" class="chip" data-show-widget="' + w.id + '">+ ' + esc(WIDGET_NAMES[w.id]) + '</button>').join("") + '</div>' : "") +
      '</div>' : "";

    const tools = (w, i) => '<div class="widget-tools">' +
      '<button type="button" class="drag-handle" data-drag="' + w.id + '" aria-label="Drag to move ' + esc(WIDGET_NAMES[w.id]) + '"><span aria-hidden="true">⠿</span> ' + esc(WIDGET_NAMES[w.id]) + '</button>' +
      '<span class="tool-group"><select data-widget-size="' + w.id + '" aria-label="Card width">' + Object.keys(WIDGET_SIZES).map(k => '<option value="' + k + '"' + (k === w.size ? " selected" : "") + '>' + WIDGET_SIZES[k] + '</option>').join("") + '</select>' +
      '<button type="button" class="tool-btn" data-move-widget="' + w.id + ':-1"' + (i === 0 ? " disabled" : "") + ' aria-label="Move earlier">↑</button>' +
      '<button type="button" class="tool-btn" data-move-widget="' + w.id + ':1"' + (i === visible.length - 1 ? " disabled" : "") + ' aria-label="Move later">↓</button>' +
      '<button type="button" class="tool-btn" data-hide-widget="' + w.id + '">Hide</button></span></div>';

    return top(greeting() + (data.manager ? ", " + data.manager : "") + "!", (data.store ? data.store + " · " : "") + "Here’s how your week is going.", gear) +
      (editingDashboard ? editBar : banner) +
      '<div class="dash-grid' + (editingDashboard ? " editing" : "") + '">' +
      (visible.length ? "" : '<div class="notice w-full">Every card is hidden. Tap the gear to show some again.</div>') +
      visible.map((w, i) => '<div class="widget w-' + w.size + '" data-widget="' + w.id + '">' + (editingDashboard ? tools(w, i) : "") + '<div class="widget-body">' + widgets[w.id]() + '</div></div>').join("") +
      '</div>';
  }

  function daily() {
    const week = weekTotals();
    const recent = data.history.slice(-6);
    const items = recent.map(h => ({ label: String(h.label).split(" –")[0], value: Number(h.sales) || 0, tip: h.label + ": " + money(h.sales) })).concat([{ label: "This week", value: week.sales, partial: true, showValue: money(week.sales), tip: "This week so far: " + money(week.sales) + " (" + week.days + (week.days === 1 ? " day" : " days") + ")" }]);
    const t = data.metricTitles;
    return top("Daily Results", "Enter each day’s numbers. Your Dashboard updates instantly.") +
      '<div class="card pad"><div class="head"><div><h2>This week</h2><p>Leave a day blank until you have its numbers. Blank days don’t count toward averages.</p></div><div class="btn-row"><button class="btn alt" id="new-week">Start New Week</button><button class="btn" id="add-day">+ Add Day</button></div></div>' +
      '<div class="table"><table><thead><tr><th>Day</th><th>' + esc(t[0]) + ' ($)</th><th>' + esc(t[1]) + ' (%)</th><th>' + esc(t[2]) + ' ($)</th><th>' + esc(t[3]) + ' (%)</th><th></th></tr></thead><tbody>' +
      data.days.map((day, i) => '<tr><td><b>' + (WEEKDAYS[i] || "Day " + (i + 1)) + '</b></td>' +
        ["sales", "conv", "atv", "cx"].map(f => '<td><input class="cell-input" data-day="' + i + '" data-field="' + f + '" type="number" step="' + (f === "sales" ? "1" : ".1") + '" value="' + (Number(day[f]) || "") + '" placeholder="0"></td>').join("") +
        '<td><button type="button" class="action-delete" title="Delete day" aria-label="Delete day" data-delete-day="' + i + '">×</button></td></tr>').join("") +
      '</tbody><tfoot><tr><td>Week</td><td>' + money(week.sales) + ' total</td><td>' + week.conv.toFixed(1) + '% avg</td><td>$' + week.atv.toFixed(0) + ' avg</td><td>' + week.cx.toFixed(1) + '% avg</td><td></td></tr></tfoot></table></div></div>' +
      '<div class="card pad mt"><div class="head"><div><h2>Weekly ' + esc(t[0].toLowerCase()) + ' trend</h2><p>Each finished week is saved here when you click “Start New Week”.</p></div></div>' +
      barChart(items, data.salesGoal, "Weekly goal " + money(data.salesGoal)) +
      (data.history.length ? '<div class="table mt"><table><thead><tr><th>Week</th><th>' + esc(t[0]) + '</th><th>' + esc(t[1]) + '</th><th>' + esc(t[2]) + '</th><th>' + esc(t[3]) + '</th><th></th></tr></thead><tbody>' +
        data.history.map((h, i) => ({ h: h, i: i })).reverse().map(r => '<tr><td>' + cell("history", r.i, "label", "text") + '</td><td>' + money(r.h.sales) + '</td><td>' + Number(r.h.conv).toFixed(1) + '%</td><td>$' + Number(r.h.atv).toFixed(0) + '</td><td>' + Number(r.h.cx).toFixed(1) + '%</td>' + deleteCell("history", r.i) + '</tr>').join("") +
        '</tbody></table></div>' : '<div class="notice">No finished weeks yet.</div>') +
      '</div>';
  }

  function teamPage() {
    return top("Team", "Everyone on your team at a glance. Open a profile for the full picture.") +
      '<div class="card pad"><div class="head"><div><h2>Team members</h2><p>Click any cell to edit. Changing a name updates it everywhere.</p></div><button class="btn" id="add-team">+ Add Team Member</button></div>' +
      (data.team.length ? '<div class="table"><table><thead><tr><th>Name</th><th>Status</th><th>Focus area</th><th>Hours this week</th><th></th><th></th></tr></thead><tbody>' +
        data.team.map((x, i) => '<tr><td>' + cell("team", i, 0, "text", "Name") + '</td><td>' + cell("team", i, 1, "status") + '</td><td>' + cell("team", i, 2, "text", "e.g. Product knowledge") + '</td><td>' + memberHours(x) + '</td><td><button type="button" class="btn alt small" data-target="member/' + i + '">Profile ›</button></td>' + deleteCell("team", i) + '</tr>').join("") +
        '</tbody></table></div>' : '<div class="notice">No team members yet. Click “+ Add Team Member” to get started.</div>') +
      '</div>';
  }

  function memberPage(index) {
    const m = data.team[index];
    if (!m) return top("Team member not found", "They may have been removed.") + '<button type="button" class="btn alt" data-target="team">‹ Back to Team</button>';
    const name = m[0];
    const rows = list => list.map((x, i) => ({ x: x, i: i }));
    const coaching = rows(data.coaching).filter(r => r.x[0] === name);
    const training = rows(data.training).filter(r => r.x[0] === name);
    const goals = rows(data.goals).filter(r => r.x.name === name);
    const notes = rows(data.notes).filter(r => r.x.name === name).sort((a, b) => (a.x.date < b.x.date ? 1 : -1));
    const tIdx = todayIndex();

    return top(name || "Team member", "Team member profile") +
      '<button type="button" class="btn alt small back" data-target="team">‹ All team members</button>' +
      '<div class="card pad"><div class="profile">' +
      '<div><label>Name</label>' + cell("team", index, 0, "text", "Name") + '</div>' +
      '<div><label>Status</label>' + cell("team", index, 1, "status") + '</div>' +
      '<div><label>Focus area</label>' + cell("team", index, 2, "text", "e.g. Product knowledge") + '</div>' +
      '</div></div>' +
      '<div class="card pad mt"><div class="head"><div><h2>This week’s schedule</h2><p>' + memberHours(m) + ' hours scheduled</p></div></div><div class="schedule-mini">' +
      WEEKDAYS.map((d, i) => '<div class="' + (i === tIdx ? "today-col" : "") + '"><label>' + d + '</label><input class="shift" data-shift="' + index + ':' + i + '" value="' + esc(m[4][i]) + '" placeholder="Off" aria-label="' + d + ' shift"></div>').join("") +
      '</div></div>' +
      '<div class="two mt">' +
      '<div class="card pad"><div class="head"><div><h2>Coaching</h2><p>' + coaching.length + ' on record</p></div><button type="button" class="btn alt small" data-add-for="coaching">+ Add</button></div>' +
      (coaching.length ? coaching.map(r => '<div class="list-row"><div><b>' + esc(r.x[1] || "Coaching") + '</b><small>' + esc(r.x[2] || "") + (r.x[3] ? " · follow up " + shortDate(r.x[3]) : "") + '</small></div><span class="status ' + (coachingOverdue(r.x) ? "bad" : statusTone("coaching", r.x[4])) + '">' + (coachingOverdue(r.x) ? "Overdue" : esc(r.x[4])) + '</span></div>').join("") : '<div class="empty">No coaching yet.</div>') +
      '</div>' +
      '<div class="card pad"><div class="head"><div><h2>Training</h2><p>' + training.length + ' assigned</p></div><button type="button" class="btn alt small" data-add-for="training">+ Add</button></div>' +
      (training.length ? training.map(r => '<div class="list-row"><div><b>' + esc(r.x[1] || "Training") + '</b><small>' + (r.x[4] ? "Due " + shortDate(r.x[4]) : "No due date") + '</small></div><span class="status ' + (trainingOverdue(r.x) ? "bad" : statusTone("training", r.x[3])) + '">' + (trainingOverdue(r.x) ? "Overdue" : esc(r.x[3])) + '</span></div>').join("") : '<div class="empty">No training assigned.</div>') +
      '</div></div>' +
      '<div class="card pad mt"><div class="head"><div><h2>Goals</h2><p>' + goals.length + ' on record</p></div><button type="button" class="btn alt small" data-add-for="goals">+ Add</button></div>' +
      (goals.length ? goals.map(r => {
        const pct = Number(r.x.target) ? Number(r.x.current) / Number(r.x.target) * 100 : 0;
        return '<div class="list-row"><div style="flex:1"><b>' + esc(r.x.goal || "Goal") + '</b><small>' + esc(r.x.current) + ' of ' + esc(r.x.target) + (r.x.due ? " · due " + shortDate(r.x.due) : "") + '</small>' + progressBar(pct, pct >= 100 ? "" : pct >= 50 ? "warn" : "bad") + '</div><b>' + Math.round(pct) + '%</b></div>';
      }).join("") : '<div class="empty">No goals yet.</div>') +
      '</div>' +
      '<div class="card pad mt"><div class="head"><div><h2>1:1 notes</h2><p>Newest first. Changes save automatically.</p></div><button type="button" class="btn small" data-add-note="' + esc(name) + '">+ New 1:1 Note</button></div>' +
      (notes.length ? notes.map(r => noteCard(r.i)).join("") : '<div class="empty">No 1:1 notes yet.</div>') +
      '</div>' + teamNamesList(false);
  }

  function noteCard(i) {
    return '<div class="note"><div class="note-head">' + cell("notes", i, "name", "name", "Team member") + cell("notes", i, "date", "date") +
      '<button type="button" class="action-delete" aria-label="Delete note" data-delete-row="notes:' + i + '">×</button></div>' +
      '<label>What we talked about</label>' + cell("notes", i, "notes", "textarea", "Wins, challenges, how they’re feeling…") +
      '<label>Commitments &amp; next steps</label>' + cell("notes", i, "commitments", "textarea", "What they’ll do, what you’ll do…") +
      '<div class="note-foot"><label>Follow up on</label>' + cell("notes", i, "followUp", "date") + '</div></div>';
  }

  function notesPage() {
    const names = Array.from(new Set(data.team.map(m => m[0]).concat(data.notes.map(n => n.name)).filter(Boolean)));
    const list = data.notes.map((x, i) => ({ x: x, i: i })).filter(r => !notesFilter || r.x.name === notesFilter).sort((a, b) => (a.x.date < b.x.date ? 1 : -1));
    const thisMonth = todayIso().slice(0, 7);
    return top("1:1 Notes", "Remember what you talked about and what everyone committed to.") +
      '<div class="grid4">' +
      tile("Notes", data.notes.length, "All time") +
      tile("This month", data.notes.filter(n => String(n.date).slice(0, 7) === thisMonth).length, "1:1s logged") +
      tile("People covered", new Set(data.notes.map(n => n.name).filter(Boolean)).size + "/" + data.team.length, "Team members") +
      tile("Follow-ups", data.notes.filter(n => n.followUp && n.followUp >= todayIso()).length, "Coming up") +
      '</div>' +
      '<div class="card pad mt"><div class="head"><div><h2>Notes</h2><p>Newest first. Changes save automatically.</p></div><div class="btn-row"><select id="notes-filter" aria-label="Filter by person" style="width:auto"><option value="">Everyone</option>' +
      names.map(n => '<option' + (n === notesFilter ? " selected" : "") + '>' + esc(n) + '</option>').join("") + '</select><button type="button" class="btn" data-add-note="' + esc(notesFilter) + '">+ New 1:1 Note</button></div></div>' +
      (list.length ? list.map(r => noteCard(r.i)).join("") : '<div class="notice">No 1:1 notes yet. Click “+ New 1:1 Note” after your next conversation.</div>') +
      '</div>' + teamNamesList(false);
  }

  function coachingPage() {
    return top("Coaching", "Meaningful conversations. Clear next steps. Stronger performance.") +
      '<div class="grid4">' +
      tile("Conversations", data.coaching.length, "On record") +
      tile("Follow-ups", data.coaching.filter(x => x[4] === "Follow Up" && !coachingOverdue(x)).length, "Scheduled") +
      tile("Overdue", data.coaching.filter(coachingOverdue).length, "Past their follow-up date") +
      tile("Team covered", new Set(data.coaching.map(x => x[0]).filter(Boolean)).size + "/" + data.team.length, "Team members") +
      '</div>' +
      '<div class="card pad mt"><div class="head"><div><h2>Coaching tracker</h2><p>Click any cell to edit. Follow-ups past their date count as overdue.</p></div><button class="btn" id="add-coaching">+ Add Coaching</button></div>' +
      (data.coaching.length ? '<div class="table"><table><thead><tr><th>Team member</th><th>Focus</th><th>Next step</th><th>Follow up on</th><th>Status</th><th></th></tr></thead><tbody>' +
        data.coaching.map((x, i) => '<tr><td>' + cell("coaching", i, 0, "name", "Name") + '</td><td>' + cell("coaching", i, 1, "text", "Focus area") + '</td><td>' + cell("coaching", i, 2, "text", "Next step") + '</td><td>' + cell("coaching", i, 3, "date") + '</td><td>' + cell("coaching", i, 4, "status") + '</td>' + deleteCell("coaching", i) + '</tr>').join("") +
        '</tbody></table></div>' : '<div class="notice">No coaching yet.</div>') +
      '</div>' + teamNamesList(false);
  }

  function trainingPage() {
    return top("Training", "Build skills. Track progress. Keep everyone ready.") +
      '<div class="grid4">' +
      tile("Completed", data.training.filter(x => x[3] === "Completed").length, "Assignments") +
      tile("In progress", data.training.filter(x => x[3] === "In Progress").length, "Assignments") +
      tile("Not started", data.training.filter(x => x[3] === "Not Started").length, "Assignments") +
      tile("Overdue", data.training.filter(trainingOverdue).length, "Past their due date") +
      '</div>' +
      '<div class="card pad mt"><div class="head"><div><h2>Training tracker</h2><p>Click any cell to edit.</p></div><button class="btn" id="add-training">+ Add Training</button></div>' +
      (data.training.length ? '<div class="table"><table><thead><tr><th>Team member</th><th>Training</th><th>Status</th><th>Due</th><th></th></tr></thead><tbody>' +
        data.training.map((x, i) => '<tr><td>' + cell("training", i, 0, "name", "Name") + '</td><td>' + cell("training", i, 1, "text", "Training name") + '</td><td>' + cell("training", i, 3, "status") + '</td><td>' + cell("training", i, 4, "date") + '</td>' + deleteCell("training", i) + '</tr>').join("") +
        '</tbody></table></div>' : '<div class="notice">No training assigned yet.</div>') +
      '</div>' + teamNamesList(false);
  }

  function goalsPage() {
    const pct = g => Number(g.target) ? Number(g.current) / Number(g.target) * 100 : 0;
    return top("Goals", "Set targets for the whole team or one person, and track progress.") +
      '<div class="grid4">' +
      tile("Active", data.goals.filter(g => pct(g) < 100).length, "Goals in progress") +
      tile("Reached", data.goals.filter(g => pct(g) >= 100).length, "Goals hit") +
      tile("Due this week", data.goals.filter(g => g.due && g.due >= todayIso() && g.due <= isoOffset(7) && pct(g) < 100).length, "Next 7 days") +
      tile("Team goals", data.goals.filter(g => g.name === "Team").length, "Shared by everyone") +
      '</div>' +
      '<div class="card pad mt"><div class="head"><div><h2>Goal tracker</h2><p>Type “Team” as the owner for a goal everyone shares. Update “Current” as you go.</p></div><button class="btn" id="add-goal">+ Add Goal</button></div>' +
      (data.goals.length ? '<div class="table"><table><thead><tr><th>Owner</th><th>Goal</th><th>Current</th><th>Target</th><th>Progress</th><th>Due</th><th></th></tr></thead><tbody>' +
        data.goals.map((g, i) => {
          const p = pct(g);
          return '<tr><td>' + cell("goals", i, "name", "name", "Team or name") + '</td><td>' + cell("goals", i, "goal", "text", "What does success look like?") + '</td><td>' + cell("goals", i, "current", "number") + '</td><td>' + cell("goals", i, "target", "number") + '</td><td style="min-width:110px"><b>' + Math.round(p) + '%</b>' + progressBar(p, p >= 100 ? "" : p >= 50 ? "warn" : "bad") + '</td><td>' + cell("goals", i, "due", "date") + '</td>' + deleteCell("goals", i) + '</tr>';
        }).join("") +
        '</tbody></table></div>' : '<div class="notice">No goals yet. Click “+ Add Goal” to set one.</div>') +
      '</div>' + teamNamesList(true);
  }

  function schedulePage() {
    const tIdx = todayIndex();
    const counts = WEEKDAYS.map((d, i) => data.team.filter(m => isWorking(m[4][i])).length);
    const total = data.team.reduce((sum, m) => sum + memberHours(m), 0);
    return top("Schedule", "Who’s working when. Type shifts like 9-5, 10:30-7 or Off.") +
      '<div class="card pad"><div class="head"><div><h2>This week’s shifts</h2><p>' + total + ' total hours scheduled. Today’s column is highlighted.</p></div><div class="btn-row"><button type="button" class="btn alt" id="clear-schedule">Clear Schedule</button><button type="button" class="btn" id="print-page">Print</button></div></div>' +
      (data.team.length ? '<div class="table"><table><thead><tr><th>Team member</th>' + WEEKDAYS.map((d, i) => '<th class="' + (i === tIdx ? "today-col" : "") + '">' + d + '</th>').join("") + '<th>Hours</th></tr></thead><tbody>' +
        data.team.map((m, r) => '<tr><td>' + personLink(m[0]) + '</td>' + WEEKDAYS.map((d, i) => '<td class="' + (i === tIdx ? "today-col" : "") + '"><input class="shift" data-shift="' + r + ':' + i + '" value="' + esc(m[4][i]) + '" placeholder="Off" aria-label="' + esc(m[0]) + ' ' + d + '"></td>').join("") + '<td><b>' + memberHours(m) + '</b></td></tr>').join("") +
        '</tbody><tfoot><tr><td>Working</td>' + counts.map((c, i) => '<td class="' + (i === tIdx ? "today-col" : "") + '">' + c + '</td>').join("") + '<td>' + total + '</td></tr></tfoot></table></div>' : '<div class="notice">Add team members on the Team tab, then build their schedule here.</div>') +
      '</div>';
  }

  function huddlePage() {
    const working = data.team.filter(m => isWorking(m[4][todayIndex()]));
    return top("Today’s Huddle", "Align. Motivate. Win the day.") +
      '<div class="card pad"><div class="huddle"><div class="label">TODAY’S FOCUS</div><h2>' + esc(data.huddle[0]) + '</h2><div class="sub">' + esc(data.huddle[1]) + '</div></div>' +
      '<div class="hgrid"><div class="hbox"><b>Team Challenge</b><strong>' + esc(data.huddle[2]) + '</strong></div><div class="hbox"><b>Recognition</b><strong>' + esc(data.huddle[3]) + '</strong></div></div>' +
      '<div class="btn-row" style="margin-top:12px"><button type="button" class="btn alt" data-target="settings">Edit Huddle</button><button type="button" class="btn" id="print-page">Print Huddle</button></div></div>' +
      '<div class="two mt"><div class="card pad"><div class="head"><h2>Today’s action items</h2></div>' +
      (data.actions.length ? data.actions.map(action => '<div class="action"><span class="check"></span>' + esc(action) + '</div>').join("") : '<div class="notice">No action items yet. Add them on the Dashboard.</div>') + '</div>' +
      '<div class="card pad"><div class="head"><h2>On the floor today</h2></div>' +
      (working.length ? working.map(m => '<div class="list-row"><b>' + esc(m[0]) + '</b><span class="status neutral">' + esc(m[4][todayIndex()]) + '</span></div>').join("") : '<div class="empty">No shifts scheduled today.</div>') +
      '</div></div>';
  }

  function settingsPage() {
    const field = (label, id, value, type, placeholder) => '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '"' + (type ? ' type="' + type + '"' : "") + (placeholder ? ' placeholder="' + esc(placeholder) + '"' : "") + ' value="' + esc(value) + '"></div>';
    const t = data.metricTitles;
    return top("Settings", "Set it up once. It’s used everywhere.") +
      '<div class="card pad"><div class="head"><div><h2>You &amp; your store</h2></div></div><div class="two">' +
      field("Your name", "manager-name", data.manager) + field("Store name", "store-name", data.store, "", "e.g. Store #214") +
      '</div><div class="head" style="margin-top:8px"><div><h2>Metrics &amp; weekly goals</h2><p>Rename the four metrics to match what your company tracks.</p></div></div><div class="two">' +
      field("Metric 1 name (dollars)", "metric-title-0", t[0]) + field(esc(t[0]) + " goal for the week ($)", "sales-goal", data.salesGoal, "number") +
      field("Metric 2 name (percent)", "metric-title-1", t[1]) + field(esc(t[1]) + " goal (%)", "conv-goal", data.convGoal, "number") +
      field("Metric 3 name (dollars)", "metric-title-2", t[2]) + field(esc(t[2]) + " goal ($)", "atv-goal", data.atvGoal, "number") +
      field("Metric 4 name (percent)", "metric-title-3", t[3]) + field(esc(t[3]) + " goal (%)", "cx-goal", data.cxGoal, "number") +
      '</div><button class="btn" id="save-settings">Save Settings</button></div>' +
      '<div class="card pad mt"><div class="head"><div><h2>Appearance</h2><p>“Automatic” matches your device’s light or dark setting.</p></div></div>' +
      '<div class="btn-row">' + [["auto", "Automatic"], ["light", "Light"], ["dark", "Dark"]].map(o => '<button type="button" class="btn ' + (data.theme === o[0] ? "" : "alt") + '" data-theme-choice="' + o[0] + '">' + o[1] + '</button>').join("") + '</div></div>' +
      '<div class="card pad mt"><div class="head"><div><h2>Today’s huddle</h2><p>Shown on the Dashboard and the Huddle tab.</p></div></div><div class="two">' +
      ["Focus headline", "Focus details", "Team challenge", "Recognition"].map((label, i) => field(label, "huddle-" + i, data.huddle[i])).join("") +
      '</div><button class="btn" id="save-huddle">Save Huddle</button></div>' +
      '<div class="card pad mt"><div class="head"><div><h2>Your data</h2><p>Your tracker saves automatically in this browser on this device. Download a backup every week, and use it to move your tracker to another computer or browser.</p></div></div>' +
      '<div class="notice" style="margin:0 0 14px">Last backup: <b>' + (data.lastBackup ? new Date(data.lastBackup).toLocaleString() : "never") + '</b></div>' +
      '<div class="btn-row"><button type="button" class="btn" id="download-backup">Download Backup</button><label class="btn alt file-btn">Restore Backup<input type="file" id="restore-backup" accept=".json,application/json"></label>' +
      '<button type="button" class="btn alt" id="load-sample">Load Sample Data</button><button type="button" class="btn danger" id="start-fresh">Start Fresh</button></div></div>';
  }

  /* ---------- Navigation & rendering ---------- */

  const pages = {
    dashboard: dashboard,
    daily: daily,
    team: teamPage,
    coaching: coachingPage,
    notes: notesPage,
    training: trainingPage,
    goals: goalsPage,
    schedule: schedulePage,
    huddle: huddlePage,
    settings: settingsPage
  };

  const labels = {
    dashboard: "⌂ Dashboard",
    daily: "▥ Daily Results",
    team: "♙ Team",
    coaching: "◎ Coaching",
    notes: "✎ 1:1 Notes",
    training: "◆ Training",
    goals: "⚑ Goals",
    schedule: "▦ Schedule",
    huddle: "☼ Huddle",
    settings: "⚙ Settings"
  };

  const themeNames = { auto: "Automatic", light: "Light", dark: "Dark" };

  function go(id) {
    window.location.hash = id;
  }

  function applyTheme() {
    if (data.theme === "light" || data.theme === "dark") document.documentElement.setAttribute("data-theme", data.theme);
    else document.documentElement.removeAttribute("data-theme");
  }

  let rendering = false;

  function render() {
    // Replacing the page blurs a focused input, which can fire "change" and re-enter render.
    if (rendering) {
      setTimeout(render);
      return;
    }
    rendering = true;
    try {
      renderPage();
    } finally {
      rendering = false;
    }
  }

  function renderPage() {
    const route = window.location.hash.slice(1) || "dashboard";
    const parts = route.split("/");
    const isMember = parts[0] === "member";
    const page = isMember ? "team" : pages[parts[0]] ? parts[0] : "dashboard";
    if (page !== "dashboard") editingDashboard = false;
    const pagesEl = document.getElementById("pages");
    const navEl = document.getElementById("nav");
    if (!pagesEl || !navEl) return;

    applyTheme();
    hideTip();
    pagesEl.innerHTML = '<section class="page active">' + (isMember ? memberPage(Number(parts[1])) : pages[page]()) + '</section>';
    navEl.innerHTML = Object.keys(labels).map(key =>
      '<button class="nav ' + (key === page ? "active" : "") + '" data-nav="' + key + '">' + labels[key] + '</button>'
    ).join("") + '<button class="nav theme-toggle" id="theme-toggle" title="Change light or dark mode">☾ Theme: ' + themeNames[data.theme] + '</button>';
    bindEvents(pagesEl, navEl);
  }

  function addRow(table, row) {
    data[table].push(row);
    saveData();
    render();
  }

  function bind(id, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", handler);
  }

  function startFresh() {
    if (!window.confirm("Start fresh? This clears your team, coaching, 1:1 notes, training, goals, schedule and results. Your name, store, metrics, goals and theme are kept.")) return;
    const fresh = blankData();
    ["salesGoal", "convGoal", "atvGoal", "cxGoal", "metricTitles", "manager", "store", "lastBackup", "theme", "dashboard"].forEach(key => { fresh[key] = data[key]; });
    if (fresh.manager === "Alex Manager") fresh.manager = "";
    data = fresh;
    saveData();
    go("settings");
    render();
  }

  function bindEvents(pagesEl, navEl) {
    navEl.querySelectorAll("[data-nav]").forEach(button => {
      button.addEventListener("click", () => go(button.dataset.nav));
    });
    bind("theme-toggle", () => {
      data.theme = { auto: "light", light: "dark", dark: "auto" }[data.theme];
      saveData();
      render();
    });

    pagesEl.querySelectorAll("[data-target]").forEach(button => {
      button.addEventListener("click", () => go(button.dataset.target));
    });

    pagesEl.querySelectorAll("[data-theme-choice]").forEach(button => {
      button.addEventListener("click", () => {
        data.theme = button.dataset.themeChoice;
        saveData();
        render();
      });
    });

    bindDashboardEditing(pagesEl);

    // Daily results
    bind("add-day", () => addRow("days", { sales: 0, conv: 0, atv: 0, cx: 0 }));
    pagesEl.querySelectorAll("[data-day]").forEach(input => {
      input.addEventListener("change", () => {
        data.days[Number(input.dataset.day)][input.dataset.field] = Number(input.value) || 0;
        saveData();
        render();
      });
    });
    pagesEl.querySelectorAll("[data-delete-day]").forEach(button => {
      button.addEventListener("click", () => {
        if (!window.confirm("Delete this day’s results?")) return;
        data.days.splice(Number(button.dataset.deleteDay), 1);
        saveData();
        render();
      });
    });
    bind("new-week", () => {
      const week = weekTotals();
      // On Monday or Tuesday you're most likely closing out last week.
      const label = todayIndex() <= 1 ? weekLabel(-1) : weekLabel(0);
      const message = week.days ? "Save this week’s results as “" + label + "” and start a new week? You can rename the week afterwards." : "Start a new week? There are no results to save yet.";
      if (!window.confirm(message)) return;
      if (week.days) data.history.push({ label: label, sales: week.sales, days: week.days, conv: Math.round(week.conv * 10) / 10, atv: Math.round(week.atv * 10) / 10, cx: Math.round(week.cx * 10) / 10 });
      data.days = [{ sales: 0, conv: 0, atv: 0, cx: 0 }];
      saveData();
      render();
    });

    // Adding rows
    bind("add-team", () => {
      const name = window.prompt("Team member name");
      if (name && name.trim()) addRow("team", [name.trim(), "On Track", "", 0, ["", "", "", "", "", "", ""]]);
    });
    bind("add-coaching", () => addRow("coaching", ["", "", "", isoOffset(7), "Follow Up"]));
    bind("add-training", () => addRow("training", ["", "", 0, "Not Started", ""]));
    bind("add-goal", () => addRow("goals", { name: "Team", goal: "", current: 0, target: 100, due: "" }));
    pagesEl.querySelectorAll("[data-add-for]").forEach(button => {
      button.addEventListener("click", () => {
        const member = data.team[Number(window.location.hash.split("/")[1])];
        const name = member ? member[0] : "";
        const kind = button.dataset.addFor;
        if (kind === "coaching") data.coaching.push([name, member ? member[2] : "", "", isoOffset(7), "Follow Up"]);
        if (kind === "training") data.training.push([name, "", 0, "Not Started", ""]);
        if (kind === "goals") data.goals.push({ name: name, goal: "", current: 0, target: 100, due: "" });
        saveData();
        go(kind);
      });
    });
    pagesEl.querySelectorAll("[data-add-note]").forEach(button => {
      button.addEventListener("click", () => {
        data.notes.push({ date: todayIso(), name: button.dataset.addNote || "", notes: "", commitments: "", followUp: "" });
        saveData();
        render();
        const fresh = document.querySelector('textarea[data-col="notes"][data-row="' + (data.notes.length - 1) + '"]');
        if (fresh) fresh.focus();
      });
    });

    const filter = document.getElementById("notes-filter");
    if (filter) filter.addEventListener("change", () => {
      notesFilter = filter.value;
      render();
    });

    // Editing any table cell
    pagesEl.querySelectorAll("[data-table]").forEach(field => {
      field.addEventListener("change", () => {
        const table = field.dataset.table;
        const row = data[table][Number(field.dataset.row)];
        if (!row) return;
        const col = field.dataset.col;
        const isNumber = field.dataset.type === "number";
        let value = field.value;
        if (isNumber) {
          value = Math.max(0, Number(value) || 0);
          if (field.dataset.max) value = Math.min(Number(field.dataset.max), value);
        }
        const old = row[col];
        row[col] = value;
        // Renaming a team member carries the new name through every tracker.
        if (table === "team" && col === "0" && old && value.trim()) {
          data.coaching.forEach(r => { if (r[0] === old) r[0] = value; });
          data.training.forEach(r => { if (r[0] === old) r[0] = value; });
          data.goals.forEach(g => { if (g.name === old) g.name = value; });
          data.notes.forEach(n => { if (n.name === old) n.name = value; });
          if (notesFilter === old) notesFilter = value;
        }
        saveData();
        if (isNumber || field.tagName === "SELECT" || field.type === "date" || (table === "team" && col === "0")) render();
      });
    });

    pagesEl.querySelectorAll("[data-shift]").forEach(input => {
      input.addEventListener("change", () => {
        const parts = input.dataset.shift.split(":");
        data.team[Number(parts[0])][4][Number(parts[1])] = input.value.trim();
        saveData();
        render();
      });
    });

    pagesEl.querySelectorAll("[data-delete-row]").forEach(button => {
      button.addEventListener("click", () => {
        const parts = button.dataset.deleteRow.split(":");
        const row = data[parts[0]][Number(parts[1])];
        const name = Array.isArray(row) ? row[0] : row.label || row.goal || row.name;
        if (!window.confirm("Delete " + (name ? "“" + name + "”" : "this row") + "?")) return;
        data[parts[0]].splice(Number(parts[1]), 1);
        saveData();
        if (parts[0] === "team" && window.location.hash.indexOf("#member/") === 0) go("team");
        render();
      });
    });

    // Dashboard actions
    bind("add-action", () => {
      addRow("actions", "");
      const fresh = document.querySelector('[data-action="' + (data.actions.length - 1) + '"]');
      if (fresh) fresh.focus();
    });
    pagesEl.querySelectorAll("[data-action]").forEach(input => {
      input.addEventListener("change", () => {
        data.actions[Number(input.dataset.action)] = input.value;
        saveData();
      });
    });
    pagesEl.querySelectorAll("[data-delete-action]").forEach(button => {
      button.addEventListener("click", () => {
        data.actions.splice(Number(button.dataset.deleteAction), 1);
        saveData();
        render();
      });
    });

    // Welcome, backup, data
    bind("welcome-fresh", startFresh);
    bind("start-fresh", startFresh);
    bind("welcome-keep", () => {
      data.welcomeDismissed = true;
      saveData();
      render();
    });
    bind("banner-backup", () => {
      downloadBackup();
      render();
    });
    bind("download-backup", () => {
      downloadBackup();
      render();
    });
    bind("load-sample", () => {
      if (!window.confirm("Replace everything with the sample data? Download a backup first if you want to keep your current data.")) return;
      const theme = data.theme;
      const layout = data.dashboard;
      data = makeSample();
      data.welcomeDismissed = true;
      data.theme = theme;
      data.dashboard = layout;
      saveData();
      go("dashboard");
      render();
    });
    const restoreInput = document.getElementById("restore-backup");
    if (restoreInput) restoreInput.addEventListener("change", () => {
      if (restoreInput.files && restoreInput.files[0]) restoreBackup(restoreInput.files[0]);
      restoreInput.value = "";
    });

    bind("print-page", () => window.print());
    bind("clear-schedule", () => {
      if (!window.confirm("Clear every shift on the schedule?")) return;
      data.team.forEach(m => { m[4] = ["", "", "", "", "", "", ""]; });
      saveData();
      render();
    });

    bind("save-huddle", () => {
      data.huddle = [0, 1, 2, 3].map(i => document.getElementById("huddle-" + i).value);
      saveData();
      window.alert("Huddle saved.");
      render();
    });
    bind("save-settings", () => {
      data.manager = document.getElementById("manager-name").value.trim();
      data.store = document.getElementById("store-name").value.trim();
      data.salesGoal = Number(document.getElementById("sales-goal").value) || 0;
      data.convGoal = Number(document.getElementById("conv-goal").value) || 0;
      data.atvGoal = Number(document.getElementById("atv-goal").value) || 0;
      data.cxGoal = Number(document.getElementById("cx-goal").value) || 0;
      data.metricTitles = [0, 1, 2, 3].map(i => document.getElementById("metric-title-" + i).value.trim() || metricDefaults[i]);
      saveData();
      window.alert("Settings saved.");
      render();
    });
  }

  /* ---------- Dashboard customizing ---------- */

  function moveWidget(id, toIndex) {
    const layout = data.dashboard;
    const from = layout.findIndex(w => w.id === id);
    if (from < 0 || toIndex < 0 || toIndex >= layout.length || from === toIndex) return;
    const moved = layout.splice(from, 1)[0];
    layout.splice(toIndex, 0, moved);
    saveData();
    render();
  }

  function bindDashboardEditing(pagesEl) {
    bind("dash-edit", () => {
      editingDashboard = !editingDashboard;
      render();
    });
    bind("dash-done", () => {
      editingDashboard = false;
      render();
    });
    bind("dash-reset", () => {
      if (!window.confirm("Put every dashboard card back in its original place and size?")) return;
      data.dashboard = defaultLayout();
      saveData();
      render();
    });
    const find = id => data.dashboard.find(w => w.id === id);

    pagesEl.querySelectorAll("[data-widget-size]").forEach(select => {
      select.addEventListener("change", () => {
        find(select.dataset.widgetSize).size = select.value;
        saveData();
        render();
      });
    });
    pagesEl.querySelectorAll("[data-hide-widget]").forEach(button => {
      button.addEventListener("click", () => {
        find(button.dataset.hideWidget).hidden = true;
        saveData();
        render();
      });
    });
    pagesEl.querySelectorAll("[data-show-widget]").forEach(button => {
      button.addEventListener("click", () => {
        find(button.dataset.showWidget).hidden = false;
        saveData();
        render();
      });
    });
    // Arrows step past hidden cards so every tap visibly moves the card.
    pagesEl.querySelectorAll("[data-move-widget]").forEach(button => {
      button.addEventListener("click", () => {
        const parts = button.dataset.moveWidget.split(":");
        const visible = data.dashboard.filter(w => !w.hidden);
        const neighbor = visible[visible.findIndex(w => w.id === parts[0]) + Number(parts[1])];
        if (neighbor) moveWidget(parts[0], data.dashboard.indexOf(neighbor));
      });
    });

    // Drag with mouse, pen or finger: the card you drop on gives up its spot.
    pagesEl.querySelectorAll("[data-drag]").forEach(handle => {
      handle.addEventListener("pointerdown", e => {
        if (e.button > 0) return;
        e.preventDefault();
        const id = handle.dataset.drag;
        const widget = handle.closest(".widget");
        let target = null;
        widget.classList.add("dragging");
        const clear = () => pagesEl.querySelectorAll(".drop-target").forEach(w => w.classList.remove("drop-target"));
        const onMove = ev => {
          const el = document.elementFromPoint(ev.clientX, ev.clientY);
          const over = el && el.closest(".widget");
          clear();
          target = over && over !== widget ? over.dataset.widget : null;
          if (target) over.classList.add("drop-target");
          if (ev.clientY < 70) window.scrollBy(0, -14);
          else if (ev.clientY > window.innerHeight - 70) window.scrollBy(0, 14);
        };
        const onEnd = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onEnd);
          window.removeEventListener("pointercancel", onEnd);
          widget.classList.remove("dragging");
          clear();
          if (target) moveWidget(id, data.dashboard.findIndex(w => w.id === target));
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onEnd);
        window.addEventListener("pointercancel", onEnd);
      });
    });
  }

  /* ---------- Chart tooltips ---------- */

  function showTip(target) {
    const tip = document.getElementById("tip");
    if (!tip || !target.dataset.tip) return;
    tip.textContent = target.dataset.tip;
    tip.hidden = false;
    const bar = target.querySelector(".colbar") || target;
    const rect = bar.getBoundingClientRect();
    const half = tip.offsetWidth / 2 + 8;
    tip.style.left = Math.min(window.innerWidth - half, Math.max(half, rect.left + rect.width / 2)) + "px";
    tip.style.top = Math.max(tip.offsetHeight + 8, rect.top - 8) + "px";
  }

  function hideTip() {
    const tip = document.getElementById("tip");
    if (tip) tip.hidden = true;
  }

  document.addEventListener("mouseover", e => {
    const target = e.target.closest && e.target.closest("[data-tip]");
    if (target) showTip(target);
  });
  document.addEventListener("mouseout", e => {
    if (e.target.closest && e.target.closest("[data-tip]")) hideTip();
  });
  document.addEventListener("focusin", e => {
    if (e.target.dataset && e.target.dataset.tip) showTip(e.target);
  });
  document.addEventListener("focusout", hideTip);
  window.addEventListener("scroll", hideTip, true);

  window.addEventListener("hashchange", render);
  window.addEventListener("DOMContentLoaded", render);
  render();
})();
