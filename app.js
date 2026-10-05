(() => {
  "use strict";

  const STORAGE_KEY = "manager-performance-v2";
  const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  // First day of the week: 1 Monday (default), 0 Sunday or 6 Saturday. Day columns and schedules count from it.
  let weekStartDay = 1;

  function weekdays() {
    return DAY_SHORT.slice(weekStartDay).concat(DAY_SHORT.slice(0, weekStartDay));
  }

  function weekdaysLong() {
    return DAY_LONG.slice(weekStartDay).concat(DAY_LONG.slice(0, weekStartDay));
  }

  // Moves a week of shifts from one first-day to another, so each shift stays on the same weekday.
  function rotateWeek(arr, fromStart, toStart) {
    return arr.map((_, j) => arr[(((toStart + j) % 7) - fromStart + 7) % 7]);
  }

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
    return (new Date().getDay() - weekStartDay + 7) % 7;
  }

  function weekStartIso(offsetWeeks) {
    const t = new Date();
    return isoDate(new Date(t.getFullYear(), t.getMonth(), t.getDate() - todayIndex() + 7 * (offsetWeeks || 0)));
  }

  function addDays(iso, days) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + days);
    return isoDate(d);
  }

  function weekLabelFrom(startIso) {
    const fmt = iso => new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const end = addDays(startIso, 6);
    return fmt(startIso) + " – " + fmt(end) + ", " + end.slice(0, 4);
  }

  function emptyWeek() {
    return weekdays().map(() => ({ sales: 0, conv: 0, atv: 0, cx: 0 }));
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

  const CURRENCIES = {
    USD: "US dollar",
    CAD: "Canadian dollar",
    GBP: "British pound",
    EUR: "Euro",
    AUD: "Australian dollar",
    NZD: "New Zealand dollar",
    ZAR: "South African rand",
    INR: "Indian rupee",
    MXN: "Mexican peso",
    PHP: "Philippine peso",
    SGD: "Singapore dollar"
  };

  // A new tracker starts in the currency of the device's region.
  function guessCurrency() {
    const region = String((navigator.languages && navigator.languages[0]) || navigator.language || "").split("-")[1] || "";
    const byRegion = { CA: "CAD", GB: "GBP", UK: "GBP", AU: "AUD", NZ: "NZD", ZA: "ZAR", IN: "INR", MX: "MXN", PH: "PHP", SG: "SGD" };
    const euro = ["IE", "DE", "FR", "ES", "IT", "NL", "BE", "AT", "PT", "FI", "GR", "LU", "SK", "SI", "EE", "LV", "LT", "MT", "CY", "HR"];
    const r = region.toUpperCase();
    return byRegion[r] || (euro.indexOf(r) >= 0 ? "EUR" : "USD");
  }

  const COLOR_SCHEMES = {
    sage: { name: "Sage & Forest", note: "Calm and natural", swatches: ["#f8f5ef", "#174f43", "#2f7a66", "#78a892"] },
    navy: { name: "Navy & Brass", note: "Classic and professional", swatches: ["#f5f6f9", "#1f3a68", "#2c4f8a", "#3d6bb3"] },
    plum: { name: "Plum & Blush", note: "Soft and boutique", swatches: ["#faf6f7", "#6b2d5c", "#8a3f78", "#a45d8f"] },
    teal: { name: "Harbor Teal & Coral", note: "Fresh and bright", swatches: ["#f3f8f8", "#0b6e75", "#12838b", "#2a9d8f"] },
    graphite: { name: "Graphite & Tangerine", note: "Bold and modern", swatches: ["#f4f4f2", "#1c1d21", "#2b2d33", "#c24a0b"] }
  };

  const WIDGET_NAMES = {
    kpis: "Metric cards",
    salesChart: "Sales by day",
    attention: "What needs attention",
    focus: "Today’s focus",
    working: "Working today",
    team: "Team at a glance",
    upcoming: "Coming up",
    actions: "Today’s key actions",
    performers: "Top performers"
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
      { id: "actions", size: "small" },
      { id: "performers", size: "small" }
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
      palette: "sage",
      currency: guessCurrency(),
      weekStartDay: weekStartDay,
      welcomeDismissed: false,
      lastBackup: null,
      dashboard: defaultLayout(),
      salesGoal: 50000,
      convGoal: 20,
      atvGoal: 85,
      cxGoal: 90,
      metricTitles: metricDefaults.slice(),
      weekStart: weekStartIso(0),
      scheduleWeek: weekStartIso(0),
      scheduleCopied: false,
      // Sample results fill this week up to today.
      days: [[7200, 18, 89, 92], [6800, 17, 84, 90], [7600, 18, 90, 94], [7900, 19, 86, 91], [8400, 20, 88, 93], [9800, 21, 91, 95], [8800, 19, 87, 92]]
        .map((v, i) => i <= todayIndex() ? { sales: v[0], conv: v[1], atv: v[2], cx: v[3] } : { sales: 0, conv: 0, atv: 0, cx: 0 }),
      history: [
        { start: weekStartIso(-4), label: weekLabel(-4), sales: 46200, days: 7, conv: 17.1, atv: 83, cx: 89 },
        { start: weekStartIso(-3), label: weekLabel(-3), sales: 48900, days: 7, conv: 18.0, atv: 86, cx: 91 },
        { start: weekStartIso(-2), label: weekLabel(-2), sales: 51200, days: 7, conv: 19.2, atv: 88, cx: 93 },
        { start: weekStartIso(-1), label: weekLabel(-1), sales: 47800, days: 7, conv: 18.4, atv: 85, cx: 90 }
      ],
      team: [
        ["Alex Johnson", "On Track", "Customer Engagement", 85, rotateWeek(["9-5", "9-5", "Off", "Off", "12-8", "10-6", "10-6"], 1, weekStartDay), 12000],
        ["Mike Carter", "Needs Coaching", "Sales Process", 62, rotateWeek(["Off", "12-8", "12-8", "9-5", "9-5", "Off", "11-7"], 1, weekStartDay), 9000],
        ["Sarah Lee", "On Track", "Product Knowledge", 95, rotateWeek(["10-6", "10-6", "10-6", "Off", "Off", "9-5", "12-6"], 1, weekStartDay), 11000],
        ["Tom Davis", "On Track", "Customer Experience", 78, rotateWeek(["12-8", "Off", "9-5", "9-5", "10-6", "12-8", "Off"], 1, weekStartDay), 10000],
        ["Lisa Brown", "Needs Training", "Conversion", 68, rotateWeek(["Off", "9-3", "Off", "12-8", "12-8", "9-5", "10-4"], 1, weekStartDay), 8000]
      ],
      teamWeek: sampleTeamWeek((todayIndex() + 1) / 7),
      teamHistory: [
        { start: weekStartIso(-2), label: weekLabel(-2), entries: sampleTeamWeek(1.04, true) },
        { start: weekStartIso(-1), label: weekLabel(-1), entries: sampleTeamWeek(0.97, true) }
      ],
      reportNotes: {},
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

  const SAMPLE_TARGETS = { "Alex Johnson": 12000, "Mike Carter": 9000, "Sarah Lee": 11000, "Tom Davis": 10000, "Lisa Brown": 8000 };

  function sampleTeamWeek(share, withTargets) {
    const base = { "Alex Johnson": [12600, 2.3], "Mike Carter": [7400, 1.6], "Sarah Lee": [12100, 2.1], "Tom Davis": [9800, 1.9], "Lisa Brown": [7300, 1.7] };
    const week = {};
    Object.keys(base).forEach(name => {
      const sales = Math.round(base[name][0] * share / 10) * 10;
      const trans = Math.round(sales / 86);
      week[name] = { sales: sales, trans: trans, items: Math.round(trans * base[name][1]) };
      if (withTargets) week[name].target = SAMPLE_TARGETS[name];
    });
    return week;
  }

  function blankData() {
    const blank = makeSample();
    blank.manager = "";
    blank.welcomeDismissed = true;
    blank.days = emptyWeek();
    blank.teamWeek = {};
    blank.teamHistory = [];
    blank.reportNotes = {};
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
    weekStartDay = [0, 1, 6].indexOf(saved.weekStartDay) >= 0 ? saved.weekStartDay : 1;
    saved.weekStartDay = weekStartDay;
    // People who used the tracker before the currency setting existed keep dollars.
    if (!CURRENCIES[saved.currency]) saved.currency = "USD";
    const renames = { "Need Coaching": "Needs Coaching", "Need Training": "Needs Training", "Avg. Transaction": "Avg. Sale" };
    saved.metricTitles = Array.isArray(saved.metricTitles) && saved.metricTitles.length === 4 ? saved.metricTitles.map(t => renames[t] || t) : metricDefaults.slice();
    if (typeof saved.store !== "string") saved.store = "";
    if (["auto", "light", "dark"].indexOf(saved.theme) < 0) saved.theme = "auto";
    if (!COLOR_SCHEMES[saved.palette]) saved.palette = "sage";
    if (saved.welcomeDismissed === undefined) saved.welcomeDismissed = true;
    ["history", "goals", "notes", "teamHistory"].forEach(key => { if (!Array.isArray(saved[key])) saved[key] = []; });
    ["teamWeek", "reportNotes"].forEach(key => { if (!saved[key] || typeof saved[key] !== "object" || Array.isArray(saved[key])) saved[key] = {}; });
    saved.dashboard = normalizeLayout(saved.dashboard);
    while (saved.huddle.length < 4) saved.huddle.push("");
    saved.team.forEach(row => {
      if (renames[row[1]]) row[1] = renames[row[1]];
      if (!Array.isArray(row[4])) row[4] = [];
      while (row[4].length < 7) row[4].push("");
      row[5] = Math.max(0, Number(row[5]) || 0);
    });
    // Results used to be a free list of rows; now there is one row per day of the week.
    if (!saved.weekStart) {
      const rows = saved.days.map(d => ({ sales: Number(d.sales) || 0, conv: Number(d.conv) || 0, atv: Number(d.atv) || 0, cx: Number(d.cx) || 0 }));
      if (rows.length > 7) {
        const active = rows.filter(d => d.sales || d.conv || d.atv || d.cx);
        const avg = key => active.length ? Math.round(active.reduce((sum, d) => sum + d[key], 0) / active.length * 10) / 10 : 0;
        if (active.length) saved.history.push({ label: "Earlier results", sales: active.reduce((sum, d) => sum + d.sales, 0), days: active.length, conv: avg("conv"), atv: avg("atv"), cx: avg("cx") });
        saved.days = emptyWeek();
      } else {
        saved.days = rows.concat(emptyWeek()).slice(0, 7);
      }
      saved.weekStart = weekStartIso(0);
    }
    if (!saved.scheduleWeek) saved.scheduleWeek = weekStartIso(0);
    saved.scheduleCopied = !!saved.scheduleCopied;
    saved.notes = saved.notes.filter(n => !isEmptyNote(n));
    saved.coaching.forEach(row => { row[3] = toIso(row[3]); });
    saved.training.forEach(row => { row[4] = toIso(row[4]); });
    return saved;
  }

  function isEmptyNote(n) {
    return !String(n.notes || "").trim() && !String(n.commitments || "").trim() && !n.followUp;
  }

  // Saved data that can't be read is kept (never silently replaced) so it can still be recovered.
  let unreadableData = null;

  function loadData() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {}
    if (!raw) return makeSample();
    try {
      const saved = JSON.parse(raw);
      if (isValidData(saved)) return normalize(saved);
    } catch (e) {}
    unreadableData = raw;
    try {
      localStorage.setItem(STORAGE_KEY + "-unreadable-" + Date.now(), raw);
    } catch (e) {}
    const fresh = makeSample();
    fresh.welcomeDismissed = true;
    return fresh;
  }

  // Private Browsing (or storage turned off) means nothing can be saved; the page warns about it.
  let storageOk = (() => {
    try {
      localStorage.setItem("mpt-storage-test", "1");
      localStorage.removeItem("mpt-storage-test");
      return true;
    } catch (e) {
      return false;
    }
  })();

  let toastTimer = null;
  let data = loadData();
  rollWeek();
  // Store the upgraded/rolled-over copy right away so older saved data is only converted once.
  if (storageOk) saveData();
  let notesFilter = "";
  let editingDashboard = false;
  let lastRoute = null;
  let focusAfterRender = null;

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      if (storageOk) {
        storageOk = false;
        toast("Couldn’t save your changes. Download a backup before closing this tab.");
      }
    }
  }

  function toast(message) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  // At the start of each week: last week's results move to the trend, and the schedule carries over for review.
  function rollWeek() {
    const current = weekStartIso(0);
    let changed = false;
    if (data.weekStart !== current) {
      const week = weekTotals();
      if (data.weekStart < current && week.days) {
        data.history.push({ start: data.weekStart, label: weekLabelFrom(data.weekStart), sales: week.sales, days: week.days, conv: Math.round(week.conv * 10) / 10, atv: Math.round(week.atv * 10) / 10, cx: Math.round(week.cx * 10) / 10 });
      }
      if (data.weekStart < current && Object.keys(data.teamWeek).some(n => hasNumbers(data.teamWeek[n]))) {
        const entries = {};
        Object.keys(data.teamWeek).forEach(name => {
          if (!hasNumbers(data.teamWeek[name])) return;
          const member = data.team.find(m => m[0] === name);
          entries[name] = Object.assign({}, data.teamWeek[name], { target: member ? member[5] : 0 });
        });
        data.teamHistory.push({ start: data.weekStart, label: weekLabelFrom(data.weekStart), entries: entries });
      }
      if (data.weekStart < current) {
        data.days = emptyWeek();
        data.teamWeek = {};
      }
      data.weekStart = current;
      changed = true;
    }
    if (data.scheduleWeek !== current) {
      if (data.scheduleWeek < current && data.team.some(m => m[4].some(s => String(s).trim()))) data.scheduleCopied = true;
      data.scheduleWeek = current;
      changed = true;
    }
    if (changed) saveData();
  }

  function downloadFile(filename, text, type) {
    const blob = new Blob([text], { type: type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 1000);
  }

  function downloadBackup() {
    data.lastBackup = new Date().toISOString();
    saveData();
    const payload = { app: "manager-performance-tracker", version: 2, exportedAt: data.lastBackup, data: data };
    downloadFile("manager-tracker-backup-" + data.lastBackup.slice(0, 10) + ".json", JSON.stringify(payload, null, 2), "application/json");
  }

  function hasNumbers(entry) {
    return !!entry && (Number(entry.sales) || Number(entry.trans) || Number(entry.items));
  }

  // One person's numbers for a week, plus what they work out to.
  function personStats(entry, target) {
    const sales = Number(entry && entry.sales) || 0;
    const trans = Number(entry && entry.trans) || 0;
    const items = Number(entry && entry.items) || 0;
    target = Number(target) || 0;
    return { sales: sales, trans: trans, items: items, target: target, pct: target ? sales / target * 100 : 0, avgSale: trans ? sales / trans : 0, perSale: trans ? items / trans : 0 };
  }

  function currentStats(member) {
    return personStats(data.teamWeek[member[0]], member[5]);
  }

  function lastWeekEntry(name) {
    const last = data.teamHistory[data.teamHistory.length - 1];
    return last && last.entries[name] ? last.entries[name] : null;
  }

  // Share of the week gone so far: someone is "on pace" when sales keep up with it.
  function weekShare() {
    return (todayIndex() + 1) / 7;
  }

  function paceTone(stats) {
    if (!stats.target) return "";
    const expected = stats.target * weekShare();
    return stats.sales >= expected ? "" : stats.sales >= expected * 0.85 ? "warn" : "bad";
  }

  function teamTotals(rows) {
    const t = rows.reduce((acc, r) => {
      acc.sales += r.sales;
      acc.trans += r.trans;
      acc.items += r.items;
      acc.target += r.target;
      return acc;
    }, { sales: 0, trans: 0, items: 0, target: 0 });
    t.avgSale = t.trans ? t.sales / t.trans : 0;
    t.perSale = t.trans ? t.items / t.trans : 0;
    t.pct = t.target ? t.sales / t.target * 100 : 0;
    return t;
  }

  // Spreadsheet cells: quoted when needed, and text that a spreadsheet would treat as a formula is defused.
  function csvCell(value) {
    let text = value == null ? "" : String(value);
    if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function csvTable(rows) {
    return rows.map(r => r.map(csvCell).join(",")).join("\r\n");
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
        unreadableData = null;
        data.welcomeDismissed = true;
        rollWeek();
        saveData();
        toast("Backup restored.");
        go("dashboard");
        render();
      } catch (e) {
        window.alert("That file isn’t a tracker backup. Choose the .json file made by “Download Backup”.");
      }
    };
    reader.readAsText(file);
  }

  /* ---------- Spreadsheet export ---------- */

  const EXPORTS = {
    daily: "This week’s daily results",
    weeks: "Weekly history",
    scorecard: "Team scorecard (all weeks)",
    team: "Team members",
    coaching: "Coaching",
    training: "Training",
    goals: "Goals",
    notes: "1:1 notes",
    schedule: "Schedule"
  };

  function exportRows(kind) {
    const t = data.metricTitles;
    const round = n => Math.round(n * 100) / 100;
    if (kind === "daily") return [["Date", "Day", t[0], t[1] + " (%)", t[2], t[3] + " (%)"]].concat(data.days.map((d, i) => [addDays(data.weekStart, i), weekdays()[i], d.sales, d.conv, d.atv, d.cx]));
    if (kind === "weeks") {
      const w = weekTotals();
      return [["Week", t[0], "Days entered", t[1] + " (%)", t[2], t[3] + " (%)"]].concat(data.history.map(h => [h.label, h.sales, h.days, h.conv, h.atv, h.cx]), [[weekLabelFrom(data.weekStart) + " (this week so far)", w.sales, w.days, round(w.conv), round(w.atv), round(w.cx)]]);
    }
    if (kind === "scorecard") {
      const rows = [["Week", "Team member", "Sales target", "Sales", "% of target", "Transactions", "Items", "Avg sale", "Items per sale"]];
      const add = (label, name, entry, target) => {
        const st = personStats(entry, target);
        rows.push([label, name, st.target, st.sales, round(st.pct), st.trans, st.items, round(st.avgSale), round(st.perSale)]);
      };
      data.teamHistory.forEach(h => Object.keys(h.entries).forEach(name => add(h.label, name, h.entries[name], h.entries[name].target)));
      data.team.forEach(m => add(weekLabelFrom(data.weekStart) + " (this week so far)", m[0], data.teamWeek[m[0]], m[5]));
      return rows;
    }
    if (kind === "team") return [["Name", "Status", "Focus area", "Weekly sales target", "Hours this week"]].concat(data.team.map(m => [m[0], m[1], m[2], m[5], memberHours(m)]));
    if (kind === "coaching") return [["Team member", "Focus", "Next step", "Follow up on", "Status"]].concat(data.coaching.map(r => [r[0], r[1], r[2], r[3], coachingOverdue(r) && r[4] !== "Overdue" ? r[4] + " (overdue)" : r[4]]));
    if (kind === "training") return [["Team member", "Training", "Status", "Due"]].concat(data.training.map(r => [r[0], r[1], trainingOverdue(r) ? r[3] + " (overdue)" : r[3], r[4]]));
    if (kind === "goals") return [["Owner", "Goal", "Current", "Target", "% complete", "Due"]].concat(data.goals.map(g => [g.name, g.goal, g.current, g.target, Number(g.target) ? round(g.current / g.target * 100) : 0, g.due]));
    if (kind === "notes") return [["Date", "Team member", "What we talked about", "Commitments & next steps", "Follow up on"]].concat(data.notes.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map(n => [n.date, n.name, n.notes, n.commitments, n.followUp]));
    if (kind === "schedule") return [["Team member"].concat(weekdays().map((d, i) => d + " " + addDays(data.weekStart, i)), ["Hours"])].concat(data.team.map(m => [m[0]].concat(m[4], [memberHours(m)])));
    return [];
  }

  function exportCsv(kind) {
    const header = [["Manager Performance Tracker" + (data.store ? " — " + data.store : "")], ["Exported " + new Date().toLocaleString()]];
    const kinds = kind === "all" ? Object.keys(EXPORTS) : [kind];
    const body = kinds.map(k => (kinds.length > 1 ? csvTable([[EXPORTS[k].toUpperCase()]]) + "\r\n" : "") + csvTable(exportRows(k))).join("\r\n\r\n");
    // The byte-order mark makes Excel read accents and symbols correctly.
    downloadFile("manager-tracker-" + (kind === "all" ? "everything" : kind) + "-" + todayIso() + ".csv", "\ufeff" + csvTable(header) + "\r\n\r\n" + body, "text/csv;charset=utf-8");
  }

  /* ---------- Calculations ---------- */

  function esc(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Amounts use the chosen currency, written the way this device writes numbers (e.g. $7,200 or 7.200 €).
  const moneyFormats = {};

  function moneyFormat() {
    const code = CURRENCIES[data.currency] ? data.currency : "USD";
    if (!moneyFormats[code]) {
      try {
        moneyFormats[code] = new Intl.NumberFormat(undefined, { style: "currency", currency: code, minimumFractionDigits: 0, maximumFractionDigits: 0 });
      } catch (e) {
        moneyFormats[code] = new Intl.NumberFormat("en-US", { style: "currency", currency: code, minimumFractionDigits: 0, maximumFractionDigits: 0 });
      }
    }
    return moneyFormats[code];
  }

  function currencySymbol() {
    const part = moneyFormat().formatToParts(0).find(x => x.type === "currency");
    return part ? part.value : "$";
  }

  function money(value) {
    return moneyFormat().format(Math.round(Number(value) || 0));
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

  // "7am-3:30pm" -> "7-3:30", "9:00-17:00" -> "9-5": the shortest form that reads back as the same shift.
  function compactShift(text) {
    const raw = String(text || "").trim();
    const m = raw.toLowerCase().replace(/\s+/g, "").match(/^(\d{1,2})(?::(\d{2}))?(am?|pm?)?(?:-|–|to)(\d{1,2})(?::(\d{2}))?(am?|pm?)?$/);
    if (!m) return raw;
    const short = (h, min) => (Number(h) % 12 || 12) + (min && min !== "00" ? ":" + min : "");
    const candidate = short(m[1], m[2]) + "-" + short(m[4], m[5]);
    return candidate.length < raw.length && shiftStart(candidate) === shiftStart(raw) && shiftHours(candidate) === shiftHours(raw) ? candidate : raw;
  }

  function shiftStart(text) {
    const m = String(text || "").toLowerCase().replace(/\s+/g, "").match(/^(\d{1,2})(?::(\d{2}))?(am?|pm?)?(?:-|–|to)/);
    if (!m) return null;
    let start = Number(m[1]) % 12 + Number(m[2] || 0) / 60;
    if (m[3] && m[3][0] === "p") start += 12;
    if (!m[3] && Number(m[1]) === 12) start = 12 + Number(m[2] || 0) / 60;
    if (!m[3] && start < 6) start += 12;
    return start;
  }

  function memberHours(member) {
    return member[4].reduce((sum, s) => sum + shiftHours(s), 0);
  }

  const NOT_WORKING = /^(off|day off|pto|vac|vacation|sick|holiday|leave|loa|r\/?o|req(uest(ed)?)? ?off|unavailable|n\/?a|x|-|—)$/i;

  function isWorking(shift) {
    const s = String(shift || "").trim();
    return !!s && !NOT_WORKING.test(s);
  }

  function teamIndex(name) {
    return data.team.findIndex(m => m[0] === name);
  }

  function nameTaken(name, exceptIndex) {
    const key = String(name).trim().toLowerCase();
    return data.team.some((m, i) => i !== exceptIndex && String(m[0]).trim().toLowerCase() === key);
  }

  function memberRoute(name) {
    return "member/" + encodeURIComponent(name);
  }

  function memberIndexFromRoute(part) {
    const name = decodeURIComponent(part || "");
    const i = teamIndex(name);
    // Older links used the row number.
    return i >= 0 ? i : /^\d+$/.test(name) && data.team[Number(name)] ? Number(name) : -1;
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
    return i < 0 ? '<b>' + esc(name || "—") + '</b>' : '<button type="button" class="link" data-target="' + esc(memberRoute(name)) + '"><b>' + esc(name) + '</b></button>';
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
    const fmt = v => type === "money" ? money(v) : type === "atv" ? money(Number(v)) : Number(v).toFixed(1) + "%";
    const percent = goal ? Math.min(100, (value / goal) * 100) : 0;
    const tone = statusClass(value, goal);
    let delta = "";
    if (previous && previous.value) {
      const diff = previous.compare - previous.value;
      const up = diff >= 0;
      const amount = type === "money" ? Math.abs(diff / previous.value * 100).toFixed(0) + "% daily avg" : type === "atv" ? money(Math.abs(diff)) : Math.abs(diff).toFixed(1) + " pts";
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
        const label = weekdays()[i] || "Day " + (i + 1);
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
      working: () => '<div class="card pad"><div class="head"><div><h2>Working today</h2><p>' + weekdaysLong()[todayIndex()] + ' · ' + working.length + (working.length === 1 ? " person" : " people") + (data.scheduleCopied ? " · carried over from last week" : "") + '</p></div><button type="button" class="btn alt small" data-target="schedule">Schedule</button></div>' +
        (working.length ? working.map(m => '<div class="list-row">' + personLink(m[0]) + '<span class="status neutral">' + esc(m[4][todayIndex()]) + '</span></div>').join("") : '<div class="empty">No one is scheduled today. Add shifts on the Schedule tab.</div>') +
        '</div>',
      team: () => '<div class="card pad"><div class="head"><div><h2>Team at a glance</h2><p>' + data.team.length + (data.team.length === 1 ? " team member" : " team members") + ' · tap a name for their profile</p></div></div><div class="mini">' +
        '<div><strong>' + data.team.filter(x => x[1] === "On Track").length + '</strong><span>On Track</span></div>' +
        '<div><strong>' + data.team.filter(x => x[1] === "Needs Coaching").length + '</strong><span>Needs Coaching</span></div>' +
        '<div><strong>' + data.team.filter(x => x[1] === "Needs Training").length + '</strong><span>Needs Training</span></div></div>' +
        '<div class="people">' + data.team.map(m => '<button type="button" class="chip" data-target="' + esc(memberRoute(m[0])) + '"><span class="dot ' + (statusTone("team", m[1]) === "good" ? "" : statusTone("team", m[1])) + '"></span>' + esc(m[0] || "Unnamed") + '</button>').join("") + '</div></div>',
      upcoming: () => '<div class="card pad"><div class="head"><div><h2>Coming up</h2><p>Due in the next 7 days, plus anything overdue.</p></div></div>' +
        (soon.length ? soon.map(x => '<button type="button" class="list-row row-link" data-target="' + x.target + '"><div><b>' + esc(x.what) + '</b><small>' + esc(x.who || "") + '</small></div><span class="status ' + x.tag[1] + '">' + esc(x.tag[0]) + '</span></button>').join("") : '<div class="empty">Nothing due this week.</div>') +
        '</div>',
      performers: () => {
        const ranked = data.team.map(m => ({ m: m, st: currentStats(m) })).filter(r => r.st.sales).sort((a, b) => (b.st.target && a.st.target ? b.st.pct - a.st.pct : b.st.sales - a.st.sales)).slice(0, 3);
        return '<div class="card pad"><div class="head"><div><h2>Top performers</h2><p>This week, by % of their target</p></div><button type="button" class="btn alt small" data-target="scorecard">Scorecard</button></div>' +
          (ranked.length ? ranked.map((r, n) => '<div class="list-row"><span class="rank">' + (n + 1) + '</span><div style="flex:1">' + personLink(r.m[0]) + progressBar(r.st.target ? r.st.pct : 100, paceTone(r.st)) + '</div><b>' + (r.st.target ? Math.round(r.st.pct) + "%" : money(r.st.sales)) + '</b></div>').join("") : '<div class="empty">Enter each person’s sales on the Scorecard tab.</div>') +
          '</div>';
      },
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
    const tIdx = todayIndex();
    return top("Daily Results", "Enter each day’s numbers. Your Dashboard updates instantly.") +
      '<div class="card pad"><div class="head"><div><h2>' + weekLabelFrom(data.weekStart) + '</h2><p>A new week starts automatically every ' + DAY_LONG[weekStartDay] + ', and this week’s totals move to the trend below. Blank days don’t count toward averages.</p></div></div>' +
      '<div class="table"><table class="fit day-table"><thead><tr><th>Day</th><th>' + esc(t[0]) + ' (' + currencySymbol() + ')</th><th>' + esc(t[1]) + ' (%)</th><th>' + esc(t[2]) + ' (' + currencySymbol() + ')</th><th>' + esc(t[3]) + ' (%)</th><th></th></tr></thead><tbody>' +
      data.days.map((day, i) => '<tr class="' + (i === tIdx ? "today-col" : i > tIdx ? "future" : "") + '"><td><b>' + weekdays()[i] + '</b> <span class="date">' + shortDate(addDays(data.weekStart, i)) + '</span>' + (i === tIdx ? ' <span class="status neutral">Today</span>' : "") + '</td>' +
        ["sales", "conv", "atv", "cx"].map(f => '<td><input class="cell-input" data-day="' + i + '" data-field="' + f + '" type="number" inputmode="decimal" step="' + (f === "sales" ? "1" : ".1") + '" value="' + (Number(day[f]) || "") + '" placeholder="0" aria-label="' + weekdays()[i] + ' ' + esc(t[["sales", "conv", "atv", "cx"].indexOf(f)]) + '"></td>').join("") +
        '<td>' + (Number(day.sales) || Number(day.conv) || Number(day.atv) || Number(day.cx) ? '<button type="button" class="action-delete" title="Clear this day" aria-label="Clear ' + weekdays()[i] + '" data-clear-day="' + i + '">×</button>' : "") + '</td></tr>').join("") +
      '</tbody><tfoot><tr><td>Week</td><td>' + money(week.sales) + ' total</td><td>' + week.conv.toFixed(1) + '% avg</td><td>' + money(week.atv) + ' avg</td><td>' + week.cx.toFixed(1) + '% avg</td><td></td></tr></tfoot></table></div></div>' +
      '<div class="card pad mt"><div class="head"><div><h2>Weekly ' + esc(t[0].toLowerCase()) + ' trend</h2><p>Each finished week is saved here automatically on ' + DAY_LONG[weekStartDay] + '. Tap a week’s name to rename it.</p></div></div>' +
      barChart(items, data.salesGoal, "Weekly goal " + money(data.salesGoal)) +
      (data.history.length ? '<div class="table mt"><table class="fit week-table"><thead><tr><th>Week</th><th>' + esc(t[0]) + '</th><th>' + esc(t[1]) + '</th><th>' + esc(t[2]) + '</th><th>' + esc(t[3]) + '</th><th></th></tr></thead><tbody>' +
        data.history.map((h, i) => ({ h: h, i: i })).reverse().map(r => '<tr><td><button type="button" class="link week-name" data-rename-week="' + r.i + '" aria-label="Rename week ' + esc(r.h.label) + '"><b>' + esc(r.h.label || "Unnamed week") + '</b></button></td><td>' + money(r.h.sales) + '</td><td>' + Number(r.h.conv).toFixed(1) + '%</td><td>' + money(Number(r.h.atv)) + '</td><td>' + Number(r.h.cx).toFixed(1) + '%</td>' + deleteCell("history", r.i) + '</tr>').join("") +
        '</tbody></table></div>' : '<div class="notice">No finished weeks yet.</div>') +
      '</div>';
  }

  function teamPage() {
    return top("Team", "Everyone on your team at a glance. Open a profile for the full picture.") +
      '<div class="card pad"><div class="head"><div><h2>Team members</h2><p>Click any cell to edit. Changing a name updates it everywhere.</p></div><button class="btn" id="add-team">+ Add Team Member</button></div>' +
      (data.team.length ? '<div class="table"><table><thead><tr><th>Name</th><th>Status</th><th>Focus area</th><th>Hours this week</th><th></th><th></th></tr></thead><tbody>' +
        data.team.map((x, i) => '<tr><td>' + cell("team", i, 0, "text", "Name") + '</td><td>' + cell("team", i, 1, "status") + '</td><td>' + cell("team", i, 2, "text", "e.g. Product knowledge") + '</td><td>' + memberHours(x) + '</td><td><button type="button" class="btn alt small" data-target="' + esc(memberRoute(x[0])) + '">Profile ›</button></td>' + deleteCell("team", i) + '</tr>').join("") +
        '</tbody></table></div>' : '<div class="notice">No team members yet. Click “+ Add Team Member” to get started.</div>') +
      '</div>';
  }

  function scorecardPage() {
    const rows = data.team.map((m, i) => ({ m: m, i: i, st: currentStats(m) }));
    const totals = teamTotals(rows.map(r => r.st));
    const withTarget = rows.filter(r => r.st.target);
    const onPace = withTarget.filter(r => paceTone(r.st) === "").length;
    const ranked = rows.filter(r => r.st.sales).sort((a, b) => (b.st.target && a.st.target ? b.st.pct - a.st.pct : b.st.sales - a.st.sales));
    const input = (r, field, value, label) => '<input class="cell-input" type="number" inputmode="decimal" min="0" data-person="' + r.i + '" data-field="' + field + '" value="' + (Number(value) || "") + '" placeholder="0" aria-label="' + esc(r.m[0]) + ' ' + label + '">';
    return top("Team Scorecard", "Each person’s numbers for the week. Update them whenever you check your sales report.") +
      '<div class="grid4">' +
      tile("Team sales", money(totals.sales), totals.target ? Math.round(totals.pct) + "% of " + money(totals.target) + " in targets" : "Set targets below") +
      tile("On pace", withTarget.length ? onPace + "/" + withTarget.length : "—", "Keeping up with their target so far this week") +
      tile("Avg sale", totals.trans ? money(totals.avgSale) : "—", "Team sales ÷ transactions") +
      tile("Items per sale", totals.trans ? totals.perSale.toFixed(1) : "—", "Team items ÷ transactions") +
      '</div>' +
      '<div class="card pad mt"><div class="head"><div><h2>' + weekLabelFrom(data.weekStart) + '</h2><p>Type each person’s week-to-date totals. Numbers move to the history every ' + DAY_LONG[weekStartDay] + '; targets carry over.</p></div><button type="button" class="btn alt" data-target="report">Weekly Report</button></div>' +
      (data.team.length ? '<div class="table"><table class="fit score-table"><thead><tr><th>Team member</th><th>Weekly target (' + currencySymbol() + ')</th><th>Sales (' + currencySymbol() + ')</th><th>Trans&shy;actions</th><th>Items sold</th><th>Results</th></tr></thead><tbody>' +
        rows.map(r => {
          const prev = lastWeekEntry(r.m[0]);
          const tone = paceTone(r.st);
          return '<tr><td>' + personLink(r.m[0]) + '</td>' +
            '<td>' + input(r, "target", r.m[5], "weekly target") + '</td><td>' + input(r, "sales", r.st.sales, "sales") + '</td><td>' + input(r, "trans", r.st.trans, "transactions") + '</td><td>' + input(r, "items", r.st.items, "items sold") + '</td>' +
            '<td class="result-cell">' + (r.st.target ? '<b>' + Math.round(r.st.pct) + '%</b> of target' + progressBar(r.st.pct, tone) : '<span class="muted">No target</span>') +
            '<small>' + (r.st.trans ? money(r.st.avgSale) + " avg · " + r.st.perSale.toFixed(1) + " items/sale" : "Add transactions") + (prev && prev.sales ? " · last wk " + money(prev.sales) : "") + '</small></td></tr>';
        }).join("") +
        '</tbody><tfoot><tr><td>Team</td><td>' + money(totals.target) + '</td><td>' + money(totals.sales) + '</td><td>' + totals.trans + '</td><td>' + totals.items + '</td><td>' + (totals.target ? Math.round(totals.pct) + "% of target" : "") + '</td></tr></tfoot></table></div>' : '<div class="notice">Add team members on the Team tab first.</div>') +
      '</div>' +
      '<div class="card pad mt"><div class="head"><div><h2>Leaderboard</h2><p>' + (withTarget.length ? "Ranked by % of their own target, so part-timers compete fairly." : "Ranked by sales. Add targets to rank by % of target.") + '</p></div></div>' +
      (ranked.length ? ranked.map((r, n) => '<div class="list-row"><span class="rank">' + (n + 1) + '</span><div style="flex:1">' + personLink(r.m[0]) + progressBar(r.st.target ? r.st.pct : r.st.sales / ranked[0].st.sales * 100, paceTone(r.st)) + '</div><b>' + (r.st.target ? Math.round(r.st.pct) + "%" : money(r.st.sales)) + '</b></div>').join("") : '<div class="empty">No sales entered yet this week.</div>') +
      '</div>';
  }

  /* ---------- Weekly report ---------- */

  let reportWeek = "current";

  function reportData() {
    const t = data.metricTitles;
    const isCurrent = reportWeek === "current" || !data.history[Number(reportWeek)];
    const index = isCurrent ? data.history.length : Number(reportWeek);
    const week = isCurrent ? weekTotals() : data.history[index];
    const prev = data.history[index - 1] || null;
    const label = isCurrent ? weekLabelFrom(data.weekStart) : week.label;
    const teamWeek = isCurrent ? null : data.teamHistory.find(h => (week.start && h.start ? h.start === week.start : h.label === week.label));
    const people = isCurrent ? data.team.filter(m => hasNumbers(data.teamWeek[m[0]]) || m[5]).map(m => ({ name: m[0], st: currentStats(m) }))
      : teamWeek ? Object.keys(teamWeek.entries).map(name => ({ name: name, st: personStats(teamWeek.entries[name], teamWeek.entries[name].target) })) : [];
    people.sort((a, b) => (b.st.target && a.st.target ? b.st.pct - a.st.pct : b.st.sales - a.st.sales));
    const days = Number(week.days) || 0;
    const metrics = [
      [t[0], money(week.sales), money(data.salesGoal), data.salesGoal ? Math.round(week.sales / data.salesGoal * 100) + "%" : "—", prev && days ? pctChange(week.sales / days, prev.sales / (prev.days || 7)) + " daily avg" : "—"],
      [t[1], Number(week.conv).toFixed(1) + "%", data.convGoal + "%", data.convGoal ? Math.round(week.conv / data.convGoal * 100) + "%" : "—", prev && days ? ptsChange(week.conv, prev.conv) : "—"],
      [t[2], money(Number(week.atv)), money(data.atvGoal), data.atvGoal ? Math.round(week.atv / data.atvGoal * 100) + "%" : "—", prev && days ? dollarChange(week.atv, prev.atv) : "—"],
      [t[3], Number(week.cx).toFixed(1) + "%", data.cxGoal + "%", data.cxGoal ? Math.round(week.cx / data.cxGoal * 100) + "%" : "—", prev && days ? ptsChange(week.cx, prev.cx) : "—"]
    ];
    const start = isCurrent ? data.weekStart : null;
    const inWeek = d => start && d >= start && d <= addDays(start, 6);
    const people2 = {
      notes: data.notes.filter(n => inWeek(n.date)).length,
      coachingOverdue: data.coaching.filter(coachingOverdue).length,
      coachingOpen: data.coaching.filter(r => r[4] !== "Completed").length,
      trainingDone: data.training.filter(r => r[3] === "Completed").length,
      trainingOpen: data.training.filter(r => r[3] !== "Completed").length,
      trainingOverdue: data.training.filter(trainingOverdue).length,
      goalsReached: data.goals.filter(g => Number(g.target) && Number(g.current) >= Number(g.target)).length,
      goalsActive: data.goals.filter(g => !(Number(g.target) && Number(g.current) >= Number(g.target))).length
    };
    return { isCurrent: isCurrent, label: label, week: week, days: days, metrics: metrics, people: people, totals: teamTotals(people.map(p => p.st)), counts: people2, key: isCurrent ? data.weekStart : "history:" + (week.start || week.label) };
  }

  function pctChange(now, before) {
    if (!before) return "—";
    const d = (now - before) / before * 100;
    return (d >= 0 ? "▲ " : "▼ ") + Math.abs(d).toFixed(0) + "%";
  }

  function ptsChange(now, before) {
    const d = Number(now) - Number(before);
    return (d >= 0 ? "▲ " : "▼ ") + Math.abs(d).toFixed(1) + " pts";
  }

  function dollarChange(now, before) {
    const d = Number(now) - Number(before);
    return (d >= 0 ? "▲ " : "▼ ") + money(Math.abs(d));
  }

  function reportPage() {
    const r = reportData();
    const t = data.metricTitles;
    const comments = data.reportNotes[r.key] || "";
    const top3 = r.people.filter(p => p.st.sales).slice(0, 3);
    return top("Weekly Report", "A one-page summary to print, save as a PDF, or paste into an email.") +
      '<div class="card pad no-print"><div class="report-controls"><div><label for="report-week">Week</label><select id="report-week"><option value="current"' + (r.isCurrent ? " selected" : "") + '>This week (' + weekLabelFrom(data.weekStart) + ')</option>' +
      data.history.map((h, i) => ({ h: h, i: i })).reverse().map(x => '<option value="' + x.i + '"' + (!r.isCurrent && String(x.i) === String(reportWeek) ? " selected" : "") + '>' + esc(x.h.label) + '</option>').join("") + '</select></div>' +
      '<div class="btn-row"><button type="button" class="btn" id="print-page">Print or Save PDF</button><button type="button" class="btn alt" id="copy-report">Copy as Text</button><button type="button" class="btn alt" id="report-csv">Download Spreadsheet</button></div></div></div>' +
      '<article class="card pad mt report">' +
      '<header class="report-head"><div><div class="label">WEEKLY REPORT</div><h2>' + esc(r.label) + '</h2><p>' + esc([data.store, data.manager].filter(Boolean).join(" · ") || "Manager Performance Tracker") + '</p></div><p class="report-date">Prepared ' + new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + (r.isCurrent ? '<br>' + r.days + ' of 7 days entered' : "") + '</p></header>' +
      '<h3>Store results</h3><table class="report-table"><thead><tr><th>Metric</th><th>Actual</th><th>Goal</th><th>% of goal</th><th>vs last week</th></tr></thead><tbody>' +
      r.metrics.map(m => '<tr><td><b>' + esc(m[0]) + '</b></td><td>' + m[1] + '</td><td>' + m[2] + '</td><td>' + m[3] + '</td><td>' + m[4] + '</td></tr>').join("") + '</tbody></table>' +
      (r.isCurrent ? '<h3>By day</h3><table class="report-table"><thead><tr><th>Day</th><th>' + esc(t[0]) + '</th><th>' + esc(t[1]) + '</th><th>' + esc(t[2]) + '</th><th>' + esc(t[3]) + '</th></tr></thead><tbody>' +
        data.days.map((d, i) => '<tr><td>' + weekdays()[i] + ' ' + shortDate(addDays(data.weekStart, i)) + '</td>' + (hasDay(d) ? '<td>' + money(d.sales) + '</td><td>' + Number(d.conv).toFixed(1) + '%</td><td>' + money(Number(d.atv)) + '</td><td>' + Number(d.cx).toFixed(1) + '%</td>' : '<td colspan="4" class="muted">—</td>') + '</tr>').join("") + '</tbody></table>' : "") +
      '<h3>Team scorecard</h3>' + (r.people.length ? '<table class="report-table"><thead><tr><th>Team member</th><th>Sales</th><th>Target</th><th>% of target</th><th>Avg sale</th><th>Items/sale</th></tr></thead><tbody>' +
        r.people.map(p => '<tr><td>' + esc(p.name) + '</td><td>' + money(p.st.sales) + '</td><td>' + (p.st.target ? money(p.st.target) : "—") + '</td><td>' + (p.st.target ? Math.round(p.st.pct) + "%" : "—") + '</td><td>' + (p.st.trans ? money(p.st.avgSale) : "—") + '</td><td>' + (p.st.trans ? p.st.perSale.toFixed(1) : "—") + '</td></tr>').join("") +
        '</tbody><tfoot><tr><td>Team</td><td>' + money(r.totals.sales) + '</td><td>' + (r.totals.target ? money(r.totals.target) : "—") + '</td><td>' + (r.totals.target ? Math.round(r.totals.pct) + "%" : "—") + '</td><td>' + (r.totals.trans ? money(r.totals.avgSale) : "—") + '</td><td>' + (r.totals.trans ? r.totals.perSale.toFixed(1) : "—") + '</td></tr></tfoot></table>' : '<p class="muted">No team numbers recorded for this week.</p>') +
      (r.isCurrent ? '<h3>People</h3><ul class="report-list">' +
        '<li><b>Top performers:</b> ' + (top3.length ? top3.map(p => esc(p.name) + (p.st.target ? " (" + Math.round(p.st.pct) + "%)" : " (" + money(p.st.sales) + ")")).join(", ") : "—") + '</li>' +
        '<li><b>Coaching:</b> ' + r.counts.coachingOpen + ' open, ' + r.counts.coachingOverdue + ' overdue</li>' +
        '<li><b>1:1s this week:</b> ' + r.counts.notes + '</li>' +
        '<li><b>Training:</b> ' + r.counts.trainingDone + ' completed, ' + r.counts.trainingOpen + ' open' + (r.counts.trainingOverdue ? ', ' + r.counts.trainingOverdue + ' overdue' : "") + '</li>' +
        '<li><b>Goals:</b> ' + r.counts.goalsReached + ' reached, ' + r.counts.goalsActive + ' in progress</li></ul>' : "") +
      '<h3>Manager comments</h3><textarea id="report-comments" class="report-comments" placeholder="Wins, challenges, and your plan for next week…">' + esc(comments) + '</textarea><div class="print-only report-comments-print">' + (esc(comments).replace(/\n/g, "<br>") || "—") + '</div>' +
      '</article>';
  }

  function hasDay(d) {
    return Number(d.sales) || Number(d.conv) || Number(d.atv) || Number(d.cx);
  }

  function reportText() {
    const r = reportData();
    const comments = data.reportNotes[r.key] || "";
    const lines = ["WEEKLY REPORT — " + r.label, [data.store, data.manager].filter(Boolean).join(" · "), ""];
    lines.push("STORE RESULTS");
    r.metrics.forEach(m => lines.push("• " + m[0] + ": " + m[1] + " (goal " + m[2] + ", " + m[3] + " of goal" + (m[4] !== "—" ? ", " + m[4] + " vs last week" : "") + ")"));
    if (r.people.length) {
      lines.push("", "TEAM");
      r.people.forEach(p => lines.push("• " + p.name + ": " + money(p.st.sales) + (p.st.target ? " (" + Math.round(p.st.pct) + "% of " + money(p.st.target) + ")" : "") + (p.st.trans ? ", " + money(p.st.avgSale) + " avg sale, " + p.st.perSale.toFixed(1) + " items/sale" : "")));
      lines.push("• Team: " + money(r.totals.sales) + (r.totals.target ? " (" + Math.round(r.totals.pct) + "% of target)" : ""));
    }
    if (r.isCurrent) {
      lines.push("", "PEOPLE", "• Coaching: " + r.counts.coachingOpen + " open, " + r.counts.coachingOverdue + " overdue", "• 1:1s this week: " + r.counts.notes, "• Training: " + r.counts.trainingDone + " completed, " + r.counts.trainingOpen + " open", "• Goals: " + r.counts.goalsReached + " reached, " + r.counts.goalsActive + " in progress");
    }
    if (comments.trim()) lines.push("", "MANAGER COMMENTS", comments.trim());
    return lines.filter((l, i) => !(l === "" && lines[i - 1] === "")).join("\n");
  }

  function reportCsv() {
    const r = reportData();
    const rows = [["Weekly report", r.label], [data.store || "", data.manager || ""], [], ["Metric", "Actual", "Goal", "% of goal", "vs last week"]].concat(r.metrics, [[]]);
    if (r.people.length) {
      rows.push(["Team member", "Sales", "Target", "% of target", "Transactions", "Items", "Avg sale", "Items per sale"]);
      r.people.forEach(p => rows.push([p.name, p.st.sales, p.st.target, Math.round(p.st.pct), p.st.trans, p.st.items, Math.round(p.st.avgSale * 100) / 100, Math.round(p.st.perSale * 100) / 100]));
      rows.push([]);
    }
    const comments = data.reportNotes[r.key] || "";
    if (comments.trim()) rows.push(["Manager comments", comments.trim()]);
    downloadFile("weekly-report-" + (r.isCurrent ? data.weekStart : r.label.replace(/[^\w]+/g, "-")) + ".csv", "\ufeff" + csvTable(rows), "text/csv;charset=utf-8");
  }

  function copyText(text) {
    const done = () => toast("Report copied — paste it into an email or message.");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {}
    area.remove();
    if (ok) done();
    else toast("Couldn’t copy automatically — use Print or Save PDF instead.");
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
      memberNumbersCard(index) +
      '<div class="card pad mt"><div class="head"><div><h2>This week’s schedule</h2><p>' + memberHours(m) + ' hours scheduled</p></div></div><div class="schedule-mini">' +
      weekdays().map((d, i) => '<div class="' + (i === tIdx ? "today-col" : "") + '"><label>' + d + '</label><input class="shift" data-shift="' + index + ':' + i + '" value="' + esc(m[4][i]) + '" placeholder="Off" aria-label="' + d + ' shift"></div>').join("") +
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

  function memberNumbersCard(index) {
    const m = data.team[index];
    const st = currentStats(m);
    const field = (key, label, value) => '<div><label>' + label + '</label><input class="cell-input" type="number" inputmode="decimal" min="0" data-person="' + index + '" data-field="' + key + '" value="' + (Number(value) || "") + '" placeholder="0"></div>';
    const past = data.teamHistory.slice(-4).reverse().filter(h => h.entries[m[0]]);
    return '<div class="card pad mt"><div class="head"><div><h2>This week’s numbers</h2><p>' + (st.target ? Math.round(st.pct) + "% of their " + money(st.target) + " target" : "No weekly target yet") + (st.trans ? " · " + money(st.avgSale) + " avg sale · " + st.perSale.toFixed(1) + " items/sale" : "") + '</p></div><button type="button" class="btn alt small" data-target="scorecard">Scorecard</button></div>' +
      '<div class="numbers-grid">' + field("target", "Weekly target (" + currencySymbol() + ")", m[5]) + field("sales", "Sales (" + currencySymbol() + ")", st.sales) + field("trans", "Transactions", st.trans) + field("items", "Items sold", st.items) + '</div>' +
      (st.target ? progressBar(st.pct, paceTone(st)) : "") +
      (past.length ? '<div class="past-weeks">' + past.map(h => {
        const p = personStats(h.entries[m[0]], h.entries[m[0]].target);
        return '<div><span>' + esc(String(h.label).split(",")[0]) + '</span><b>' + money(p.sales) + '</b><small>' + (p.target ? Math.round(p.pct) + "% of target" : "") + '</small></div>';
      }).join("") + '</div>' : "") +
      '</div>';
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
    const counts = weekdays().map((d, i) => data.team.filter(m => isWorking(m[4][i])).length);
    const total = data.team.reduce((sum, m) => sum + memberHours(m), 0);
    return top("Schedule", "Who’s working when. Type shifts like 9-5, 10:30-7 or Off.") +
      (data.scheduleCopied ? '<div class="notice warn-notice"><span>These shifts were carried over from last week. Update anything that changed, or tap Clear Schedule to start over.</span><button type="button" class="btn alt small" id="schedule-ok">Looks right</button></div>' : "") +
      '<div class="card pad' + (data.scheduleCopied ? " mt" : "") + '"><div class="head"><div><h2>Shifts for ' + weekLabelFrom(data.weekStart) + '</h2><p>' + total + ' total hours scheduled. Today’s column is highlighted.</p></div><div class="btn-row"><button type="button" class="btn alt" id="clear-schedule">Clear Schedule</button><button type="button" class="btn" id="print-page">Print</button></div></div>' +
      (data.team.length ? '<div class="table sched-wrap"><table class="fit sched-table"><thead><tr><th>Team member</th>' + weekdays().map((d, i) => '<th class="' + (i === tIdx ? "today-col" : "") + '">' + d + '</th>').join("") + '<th>Hours</th></tr></thead><tbody>' +
        data.team.map((m, r) => '<tr><td>' + personLink(m[0]) + '</td>' + weekdays().map((d, i) => '<td class="' + (i === tIdx ? "today-col" : "") + '"><input class="shift" data-shift="' + r + ':' + i + '" value="' + esc(m[4][i]) + '" title="' + esc(m[4][i]) + '" placeholder="Off" aria-label="' + esc(m[0]) + ' ' + d + '"></td>').join("") + '<td><b>' + memberHours(m) + '</b></td></tr>').join("") +
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
    const field = (label, id, value, type, placeholder) => '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" data-setting' + (type ? ' type="' + type + '" inputmode="decimal" min="0"' : "") + (placeholder ? ' placeholder="' + esc(placeholder) + '"' : "") + ' value="' + esc(value) + '"></div>';
    const t = data.metricTitles;
    return top("Settings", "Set it up once. It’s used everywhere.") +
      '<div class="card pad"><div class="head"><div><h2>You &amp; your store</h2></div></div><div class="two">' +
      field("Your name", "manager-name", data.manager) + field("Store name", "store-name", data.store, "", "e.g. Store #214") +
      '<div class="field"><label for="currency">Currency</label><select id="currency">' + Object.keys(CURRENCIES).map(code => '<option value="' + code + '"' + (data.currency === code ? " selected" : "") + '>' + CURRENCIES[code] + ' (' + code + ')</option>').join("") + '</select></div>' +
      '<div class="field"><label for="week-start">Week starts on</label><select id="week-start">' + [[1, "Monday"], [0, "Sunday"], [6, "Saturday"]].map(o => '<option value="' + o[0] + '"' + (weekStartDay === o[0] ? " selected" : "") + '>' + o[1] + '</option>').join("") + '</select></div>' +
      '</div><div class="head" style="margin-top:8px"><div><h2>Metrics &amp; weekly goals</h2><p>Rename the four metrics to match what your company tracks. Changes save automatically.</p></div></div><div class="two">' +
      field("Metric 1 name (money)", "metric-title-0", t[0]) + field(esc(t[0]) + " goal for the week (" + currencySymbol() + ")", "sales-goal", data.salesGoal, "number") +
      field("Metric 2 name (percent)", "metric-title-1", t[1]) + field(esc(t[1]) + " goal (%)", "conv-goal", data.convGoal, "number") +
      field("Metric 3 name (money)", "metric-title-2", t[2]) + field(esc(t[2]) + " goal (" + currencySymbol() + ")", "atv-goal", data.atvGoal, "number") +
      field("Metric 4 name (percent)", "metric-title-3", t[3]) + field(esc(t[3]) + " goal (%)", "cx-goal", data.cxGoal, "number") +
      '</div><button class="btn" id="save-settings">Save Settings</button></div>' +
      '<div class="card pad mt"><div class="head"><div><h2>Appearance</h2><p>Pick a colour scheme. Each one has a light and a dark version.</p></div></div>' +
      '<div class="scheme-grid" role="radiogroup" aria-label="Colour scheme">' + Object.keys(COLOR_SCHEMES).map(id => {
        const c = COLOR_SCHEMES[id];
        const on = (data.palette || "sage") === id;
        return '<button type="button" class="scheme" role="radio" aria-checked="' + on + '" data-palette-choice="' + id + '"><span class="scheme-sw">' + c.swatches.map(col => '<i style="background:' + col + '"></i>').join("") + '</span><span><b>' + c.name + '</b><small>' + c.note + '</small></span>' + (on ? '<span class="scheme-check" aria-hidden="true">✓</span>' : "") + '</button>';
      }).join("") + '</div>' +
      '<div class="field" style="margin:16px 0 6px"><label>Light or dark</label></div><div class="btn-row">' + [["auto", "Automatic"], ["light", "Light"], ["dark", "Dark"]].map(o => '<button type="button" class="btn ' + (data.theme === o[0] ? "" : "alt") + '" data-theme-choice="' + o[0] + '">' + o[1] + '</button>').join("") + '</div><p class="hint">Automatic follows your device’s light or dark setting.</p></div>' +
      '<div class="card pad mt"><div class="head"><div><h2>Today’s huddle</h2><p>Shown on the Dashboard and the Huddle tab. Changes save automatically.</p></div></div><div class="two">' +
      ["Focus headline", "Focus details", "Team challenge", "Recognition"].map((label, i) => field(label, "huddle-" + i, data.huddle[i])).join("") +
      '</div><button class="btn" id="save-huddle">Save Huddle</button></div>' +
      '<div class="card pad mt"><div class="head"><div><h2>Your data</h2><p>Your tracker saves automatically in this browser on this device. Download a backup every week, and use it to move your tracker to another computer or browser.</p></div></div>' +
      '<div class="notice" style="margin:0 0 14px">Last backup: <b>' + (data.lastBackup ? new Date(data.lastBackup).toLocaleString() : "never") + '</b></div>' +
      '<div class="btn-row"><button type="button" class="btn" id="download-backup">Download Backup</button><label class="btn alt file-btn">Restore Backup<input type="file" id="restore-backup" accept=".json,application/json"></label>' +
      '</div><div class="export-row"><label for="export-what">Download a spreadsheet (opens in Excel, Numbers or Google Sheets)</label><div class="btn-row"><select id="export-what" style="width:auto"><option value="all">Everything</option>' + Object.keys(EXPORTS).map(k => '<option value="' + k + '">' + EXPORTS[k] + '</option>').join("") + '</select><button type="button" class="btn alt" id="export-csv">Download Spreadsheet</button></div></div>' +
      '<div class="btn-row" style="margin-top:12px"><button type="button" class="btn alt" id="load-sample">Load Sample Data</button><button type="button" class="btn danger" id="start-fresh">Start Fresh</button></div></div>';
  }

  /* ---------- Navigation & rendering ---------- */

  const pages = {
    dashboard: dashboard,
    daily: daily,
    team: teamPage,
    scorecard: scorecardPage,
    coaching: coachingPage,
    notes: notesPage,
    training: trainingPage,
    goals: goalsPage,
    schedule: schedulePage,
    huddle: huddlePage,
    report: reportPage,
    settings: settingsPage
  };

  const labels = {
    dashboard: "⌂ Dashboard",
    daily: "▥ Daily Results",
    team: "♙ Team",
    scorecard: "★ Scorecard",
    coaching: "◎ Coaching",
    notes: "✎ 1:1 Notes",
    training: "◆ Training",
    goals: "⚑ Goals",
    schedule: "▦ Schedule",
    huddle: "☼ Huddle",
    report: "▤ Weekly Report",
    settings: "⚙ Settings"
  };

  const themeNames = { auto: "Automatic", light: "Light", dark: "Dark" };

  function go(id) {
    window.location.hash = id;
  }

  function applyTheme() {
    if (data.theme === "light" || data.theme === "dark") document.documentElement.setAttribute("data-theme", data.theme);
    else document.documentElement.removeAttribute("data-theme");
    // Sage & Forest is the stylesheet's default; other schemes swap the colour tokens.
    if (data.palette && data.palette !== "sage") document.documentElement.setAttribute("data-palette", data.palette);
    else document.documentElement.removeAttribute("data-palette");
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
    rollWeek();
    // Leaving a page tidies away 1:1 notes that were started but never written.
    if (route !== lastRoute) {
      const before = data.notes.length;
      data.notes = data.notes.filter(n => !isEmptyNote(n));
      if (data.notes.length !== before) saveData();
      lastRoute = route;
    }
    const pagesEl = document.getElementById("pages");
    const navEl = document.getElementById("nav");
    if (!pagesEl || !navEl) return;

    applyTheme();
    hideTip();
    const recovery = unreadableData ? '<div class="notice storage-warning" role="alert"><b>Your saved data couldn’t be opened,</b> so the tracker is showing sample data. A copy of your data has been kept. Restore your latest backup in Settings, or download the copy and send it to the seller for help. <button type="button" class="btn alt small" id="download-unreadable">Download Copy</button></div>' : "";
    const warning = recovery + (storageOk ? "" : '<div class="notice storage-warning" role="alert"><b>Changes aren’t being saved.</b> This browser isn’t letting the tracker save (Private Browsing or website data turned off). Anything you enter will be lost when you close this tab — open the tracker in a normal window, or download a backup from Settings before closing.</div>');
    pagesEl.innerHTML = '<section class="page active page-' + page + '">' + warning + (isMember ? memberPage(memberIndexFromRoute(parts.slice(1).join("/"))) : pages[page]()) + '</section>';
    navEl.innerHTML = Object.keys(labels).map(key =>
      '<button class="nav ' + (key === page ? "active" : "") + '" data-nav="' + key + '">' + labels[key] + '</button>'
    ).join("") + '<button class="nav theme-toggle" id="theme-toggle" title="Change light or dark mode">☾ Theme: ' + themeNames[data.theme] + '</button>';
    bindEvents(pagesEl, navEl);
    pagesEl.querySelectorAll(".sched-table .shift").forEach(fitShiftText);
    if (focusAfterRender) {
      const target = document.querySelector(focusAfterRender[0]) ;
      const usable = target && !target.disabled ? target : document.querySelector(focusAfterRender[1]);
      if (usable) usable.focus();
      focusAfterRender = null;
    }
  }

  // Long shifts ("10pm-6am") shrink their own text a little so they still show in full in narrow day columns.
  function fitShiftText(input) {
    input.style.fontSize = "";
    let size = parseFloat(getComputedStyle(input).fontSize);
    while (input.scrollWidth > input.clientWidth + 1 && size > 9.5) {
      size -= 0.5;
      input.style.fontSize = size + "px";
    }
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

  // Changing the first day of the week keeps every result and shift on its real date and weekday.
  // Results that fall outside the new week move into the weekly history.
  function changeWeekStart(newStart) {
    const oldStart = weekStartDay;
    if (newStart === oldStart) return;
    const oldDates = data.days.map((d, i) => addDays(data.weekStart, i));
    weekStartDay = newStart;
    const newWeek = weekStartIso(0);
    const newDates = data.days.map((d, i) => addDays(newWeek, i));
    const outside = data.days.filter((d, i) => newDates.indexOf(oldDates[i]) < 0 && hasDay(d));
    if (outside.length && !window.confirm("Starting weeks on " + DAY_LONG[newStart] + " moves " + outside.length + (outside.length === 1 ? " day" : " days") + " of results into the weekly history, because they fall before the new week. Continue?")) {
      weekStartDay = oldStart;
      render();
      return;
    }
    if (outside.length) {
      const avg = key => Math.round(outside.reduce((sum, d) => sum + Number(d[key] || 0), 0) / outside.length * 10) / 10;
      data.history.push({ start: data.weekStart, label: weekLabelFrom(data.weekStart), sales: outside.reduce((sum, d) => sum + Number(d.sales || 0), 0), days: outside.length, conv: avg("conv"), atv: avg("atv"), cx: avg("cx") });
    }
    const byDate = {};
    oldDates.forEach((dt, i) => { byDate[dt] = data.days[i]; });
    data.days = newDates.map(dt => byDate[dt] || { sales: 0, conv: 0, atv: 0, cx: 0 });
    data.team.forEach(m => { m[4] = rotateWeek(m[4], oldStart, newStart); });
    data.weekStart = newWeek;
    data.scheduleWeek = newWeek;
    data.weekStartDay = newStart;
    saveData();
    render();
    toast("Weeks now start on " + DAY_LONG[newStart] + ".");
  }

  function startFresh() {
    if (!window.confirm("Start fresh? This clears your team, coaching, 1:1 notes, training, goals, schedule and results. Your name, store, metrics, goals and theme are kept.")) return;
    const fresh = blankData();
    ["salesGoal", "convGoal", "atvGoal", "cxGoal", "metricTitles", "manager", "store", "lastBackup", "theme", "palette", "currency", "weekStartDay", "dashboard"].forEach(key => { fresh[key] = data[key]; });
    fresh.weekStart = weekStartIso(0);
    fresh.scheduleWeek = weekStartIso(0);
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

    pagesEl.querySelectorAll("[data-palette-choice]").forEach(button => {
      button.addEventListener("click", () => {
        data.palette = button.dataset.paletteChoice;
        saveData();
        render();
        toast(COLOR_SCHEMES[data.palette].name + " colour scheme on.");
      });
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
    pagesEl.querySelectorAll("[data-day]").forEach(input => {
      input.addEventListener("change", () => {
        data.days[Number(input.dataset.day)][input.dataset.field] = Math.max(0, Number(input.value) || 0);
        saveData();
        render();
      });
    });
    pagesEl.querySelectorAll("[data-rename-week]").forEach(button => {
      button.addEventListener("click", () => {
        const week = data.history[Number(button.dataset.renameWeek)];
        const name = window.prompt("Rename this week", week.label);
        if (name === null || !name.trim()) return;
        week.label = name.trim();
        saveData();
        render();
      });
    });
    pagesEl.querySelectorAll("[data-clear-day]").forEach(button => {
      button.addEventListener("click", () => {
        const i = Number(button.dataset.clearDay);
        if (!window.confirm("Clear " + weekdays()[i] + "’s results?")) return;
        data.days[i] = { sales: 0, conv: 0, atv: 0, cx: 0 };
        saveData();
        render();
      });
    });

    // Team scorecard numbers (typed on the Scorecard tab or a profile)
    pagesEl.querySelectorAll("[data-person]").forEach(input => {
      input.addEventListener("change", () => {
        const member = data.team[Number(input.dataset.person)];
        if (!member) return;
        const value = Math.max(0, Number(input.value) || 0);
        if (input.dataset.field === "target") member[5] = value;
        else {
          const entry = data.teamWeek[member[0]] || (data.teamWeek[member[0]] = { sales: 0, trans: 0, items: 0 });
          entry[input.dataset.field] = value;
        }
        saveData();
        render();
      });
    });

    // Weekly report
    const weekSelect = document.getElementById("report-week");
    if (weekSelect) weekSelect.addEventListener("change", () => {
      reportWeek = weekSelect.value;
      render();
    });
    const comments = document.getElementById("report-comments");
    if (comments) comments.addEventListener("change", () => {
      data.reportNotes[reportData().key] = comments.value;
      saveData();
    });
    bind("copy-report", () => {
      if (comments) data.reportNotes[reportData().key] = comments.value;
      copyText(reportText());
    });
    bind("report-csv", () => {
      if (comments) data.reportNotes[reportData().key] = comments.value;
      reportCsv();
    });
    bind("export-csv", () => exportCsv(document.getElementById("export-what").value));

    // Adding rows
    bind("add-team", () => {
      const name = (window.prompt("Team member name") || "").trim();
      if (!name) return;
      if (nameTaken(name)) {
        window.alert("There’s already a team member named “" + name + "”. Add a last name or initial so you can tell them apart.");
        return;
      }
      addRow("team", [name, "On Track", "", 0, ["", "", "", "", "", "", ""], 0]);
    });
    bind("add-coaching", () => addRow("coaching", ["", "", "", isoOffset(7), "Follow Up"]));
    bind("add-training", () => addRow("training", ["", "", 0, "Not Started", ""]));
    bind("add-goal", () => addRow("goals", { name: "Team", goal: "", current: 0, target: 100, due: "" }));
    pagesEl.querySelectorAll("[data-add-for]").forEach(button => {
      button.addEventListener("click", () => {
        const member = data.team[memberIndexFromRoute(window.location.hash.split("/").slice(1).join("/"))];
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
        if (table === "team" && col === "0") {
          value = value.trim();
          const problem = !value ? "A name can’t be blank." : nameTaken(value, Number(field.dataset.row)) ? "There’s already a team member named “" + value + "”." : "";
          if (problem) {
            field.value = old;
            toast(problem);
            return;
          }
        }
        row[col] = value;
        // Renaming a team member carries the new name through every tracker.
        if (table === "team" && col === "0" && old && value !== old) {
          data.coaching.forEach(r => { if (r[0] === old) r[0] = value; });
          data.training.forEach(r => { if (r[0] === old) r[0] = value; });
          data.goals.forEach(g => { if (g.name === old) g.name = value; });
          data.notes.forEach(n => { if (n.name === old) n.name = value; });
          if (data.teamWeek[old]) {
            data.teamWeek[value] = data.teamWeek[old];
            delete data.teamWeek[old];
          }
          data.teamHistory.forEach(h => {
            if (h.entries[old]) {
              h.entries[value] = h.entries[old];
              delete h.entries[old];
            }
          });
          if (notesFilter === old) notesFilter = value;
          if (window.location.hash === "#" + memberRoute(old)) history.replaceState(null, "", "#" + memberRoute(value));
        }
        saveData();
        if (isNumber || field.tagName === "SELECT" || field.type === "date" || (table === "team" && col === "0")) render();
      });
    });

    pagesEl.querySelectorAll("[data-shift]").forEach(input => {
      if (input.closest(".sched-table")) input.addEventListener("input", () => fitShiftText(input));
      input.addEventListener("change", () => {
        const parts = input.dataset.shift.split(":");
        data.team[Number(parts[0])][4][Number(parts[1])] = compactShift(input.value);
        data.scheduleCopied = false;
        saveData();
        render();
      });
    });

    pagesEl.querySelectorAll("[data-delete-row]").forEach(button => {
      button.addEventListener("click", () => {
        const parts = button.dataset.deleteRow.split(":");
        const row = data[parts[0]][Number(parts[1])];
        const name = Array.isArray(row) ? row[0] : row.label || row.goal || row.name;
        if (parts[0] === "team") {
          if (!window.confirm("Remove “" + (name || "this team member") + "” from your team?")) return;
          const counts = [[data.coaching.filter(r => r[0] === name).length, "coaching"], [data.training.filter(r => r[0] === name).length, "training"], [data.goals.filter(g => g.name === name).length, "goal"], [data.notes.filter(n => n.name === name).length, "1:1 note"]].filter(c => c[0]);
          if (name && counts.length && window.confirm("Also delete " + name + "’s " + counts.map(c => c[0] + " " + c[1] + (c[0] > 1 && c[1] !== "coaching" && c[1] !== "training" ? "s" : "")).join(", ") + "?\n\nOK deletes them too. Cancel keeps them on those tabs.")) {
            data.coaching = data.coaching.filter(r => r[0] !== name);
            data.training = data.training.filter(r => r[0] !== name);
            data.goals = data.goals.filter(g => g.name !== name);
            data.notes = data.notes.filter(n => n.name !== name);
            delete data.teamWeek[name];
          }
        } else if (!window.confirm("Delete " + (name ? "“" + name + "”" : "this row") + "?")) return;
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
      const palette = data.palette;
      const currency = data.currency;
      const layout = data.dashboard;
      data = makeSample();
      data.welcomeDismissed = true;
      data.theme = theme;
      data.palette = palette;
      data.currency = currency;
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

    bind("download-unreadable", () => downloadFile("manager-tracker-saved-data-" + todayIso() + ".json", unreadableData, "application/json"));
    bind("print-page", () => {
      if (comments) {
        data.reportNotes[reportData().key] = comments.value;
        saveData();
        render();
      }
      window.print();
    });
    bind("schedule-ok", () => {
      data.scheduleCopied = false;
      saveData();
      render();
    });
    bind("clear-schedule", () => {
      if (!window.confirm("Clear every shift on the schedule?")) return;
      data.team.forEach(m => { m[4] = ["", "", "", "", "", "", ""]; });
      data.scheduleCopied = false;
      saveData();
      render();
    });

    const readSettings = () => {
      const value = id => document.getElementById(id);
      if (value("manager-name")) {
        data.manager = value("manager-name").value.trim();
        data.store = value("store-name").value.trim();
        data.salesGoal = Math.max(0, Number(value("sales-goal").value) || 0);
        data.convGoal = Math.max(0, Number(value("conv-goal").value) || 0);
        data.atvGoal = Math.max(0, Number(value("atv-goal").value) || 0);
        data.cxGoal = Math.max(0, Number(value("cx-goal").value) || 0);
        data.metricTitles = [0, 1, 2, 3].map(i => value("metric-title-" + i).value.trim() || metricDefaults[i]);
      }
      if (value("huddle-0")) data.huddle = [0, 1, 2, 3].map(i => value("huddle-" + i).value);
      saveData();
    };
    const currencySelect = document.getElementById("currency");
    if (currencySelect) currencySelect.addEventListener("change", () => {
      data.currency = currencySelect.value;
      saveData();
      render();
      toast("Amounts now shown in " + CURRENCIES[data.currency] + " (" + currencySymbol() + ").");
    });
    const weekStartSelect = document.getElementById("week-start");
    if (weekStartSelect) weekStartSelect.addEventListener("change", () => changeWeekStart(Number(weekStartSelect.value)));

    // Settings save as soon as a field changes, so nothing is lost by switching tabs.
    pagesEl.querySelectorAll("[data-setting]").forEach(input => input.addEventListener("change", readSettings));
    bind("save-huddle", () => {
      readSettings();
      toast("Huddle saved.");
      render();
    });
    bind("save-settings", () => {
      readSettings();
      toast("Settings saved.");
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
        if (!neighbor) return;
        focusAfterRender = ['[data-move-widget="' + button.dataset.moveWidget + '"]', '[data-move-widget="' + parts[0] + ':' + (-Number(parts[1])) + '"]'];
        moveWidget(parts[0], data.dashboard.indexOf(neighbor));
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

  // A tracker left open overnight moves to the new week by itself.
  function checkNewWeek() {
    if (data.weekStart !== weekStartIso(0) || data.scheduleWeek !== weekStartIso(0)) render();
  }
  setInterval(checkNewWeek, 60000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkNewWeek();
  });

  // The tracker open in another tab saved a change: pick it up so this tab never saves over it.
  // If a field here is being typed in, the redraw waits until that field is finished.
  let externalRedraw = false;
  window.addEventListener("storage", e => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const saved = JSON.parse(e.newValue);
      if (!isValidData(saved)) return;
      data = normalize(saved);
    } catch (err) {
      return;
    }
    const active = document.activeElement;
    if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) && document.getElementById("pages").contains(active)) externalRedraw = true;
    else render();
  });
  document.addEventListener("focusout", () => {
    if (!externalRedraw) return;
    externalRedraw = false;
    setTimeout(render);
  });

  window.addEventListener("hashchange", render);
  window.addEventListener("DOMContentLoaded", render);
  render();
})();
