(() => {
  "use strict";

  const STORAGE_KEY = "manager-performance-v2";

  const defaults = {
    manager: "Alex Manager",
    salesGoal: 50000,
    convGoal: 20,
    atvGoal: 85,
    cxGoal: 90,
    metricTitles: ["Sales", "Conversion", "Avg. Transaction", "Customer Experience"],
    days: [
      { sales: 9200, conv: 18, atv: 89, cx: 92 },
      { sales: 9800, conv: 17, atv: 84, cx: 90 },
      { sales: 9500, conv: 18, atv: 90, cx: 94 }
    ],
    team: [
      ["Alex Johnson", "On Track", "Customer Engagement", 85],
      ["Mike Carter", "Need Coaching", "Sales Process", 62],
      ["Sarah Lee", "On Track", "Product Knowledge", 95],
      ["Tom Davis", "On Track", "Customer Experience", 78],
      ["Lisa Brown", "Need Training", "Conversion", 68]
    ],
    coaching: [
      ["Alex Johnson", "Customer Engagement", "Practice questions", "10/02", "On Track"],
      ["Mike Carter", "Sales Process", "Review steps", "10/06", "Follow Up"],
      ["Sarah Lee", "Product Knowledge", "Build confidence", "10/05", "Overdue"]
    ],
    training: [
      ["Alex Johnson", "Product Knowledge", 85, "In Progress", "10/05"],
      ["Mike Carter", "Customer Engagement", 62, "Not Started", "10/06"],
      ["Sarah Lee", "Leadership", 95, "Completed", "10/01"],
      ["Tom Davis", "Sales Process", 78, "In Progress", "10/08"],
      ["Lisa Brown", "Customer Experience", 68, "In Progress", "10/07"]
    ],
    huddle: [
      "Win the first 30 seconds.",
      "Greet quickly. Ask a discovery question. Identify the customer's goal.",
      "3 quality customer engagements per person.",
      "Sarah — strongest customer-experience performance yesterday."
    ],
    actions: [
      "Review yesterday’s results",
      "Share today’s focus",
      "Ask for team commitments"
    ]
  };

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(defaults));
  }

  function loadData() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (
        saved &&
        Array.isArray(saved.days) &&
        Array.isArray(saved.team) &&
        Array.isArray(saved.coaching) &&
        Array.isArray(saved.training) &&
        Array.isArray(saved.huddle) &&
        Array.isArray(saved.actions)
      ) {
        saved.metricTitles = Array.isArray(saved.metricTitles) && saved.metricTitles.length === 4 ? saved.metricTitles : JSON.parse(JSON.stringify(defaults.metricTitles));
        return saved;
      }
    } catch (e) {}
    return cloneDefaults();
  }

  let data = loadData();

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function money(value) {
    return "$" + Math.round(Number(value) || 0).toLocaleString();
  }

  function average(key) {
    if (!data.days.length) return 0;
    return data.days.reduce((sum, day) => sum + Number(day[key] || 0), 0) / data.days.length;
  }

  function statusClass(value, goal) {
    const ratio = goal ? value / goal : 0;
    return ratio >= 1 ? "good" : ratio >= 0.9 ? "warn" : "bad";
  }

  function top(title, subtitle) {
    return '<div class="top"><div><h1>' + title + '</h1><div class="sub">' + subtitle + '</div></div><div class="week">Reporting week<b>Sep 28 – Oct 4, 2026</b></div></div>';
  }

  function kpi(name, value, goal, type, destination) {
    const percent = goal ? Math.min(100, (value / goal) * 100) : 0;
    let current = type === "money" ? money(value) : type === "atv" ? "$" + Number(value).toFixed(0) : Number(value).toFixed(1) + "%";
    let target = type === "money" ? money(goal) : type === "atv" ? "$" + goal : goal + "%";
    return '<button type="button" class="card pad kpi kpi-link" data-target="' + (destination || "daily") + '"><b>' + name + '</b><div class="metric">' + current + '</div><div class="goal">' + target + ' goal</div><div class="bar"><i class="' + statusClass(value, goal) + '" style="width:' + percent + '%"></i></div></button>';
  }

  function dashboard() {
    const sales = data.days.reduce((sum, day) => sum + Number(day.sales || 0), 0);
    const conv = average("conv");
    const atv = average("atv");
    const cx = average("cx");
    const attention = [];
    if (conv < data.convGoal) attention.push(["Conversion", (data.convGoal - conv).toFixed(1) + " points below goal"]);
    if (sales < data.salesGoal) attention.push(["Sales", money(data.salesGoal - sales) + " remaining to weekly goal"]);
    const openTraining = data.training.filter(x => x[3] !== "Completed").length;
    if (openTraining) attention.push(["Training", openTraining + " assignments still open"]);
    if (data.coaching.some(x => x[4] === "Overdue")) attention.push(["Coaching", "1 follow-up needs attention"]);

    return top("Good Morning, " + data.manager + "!", "PEOPLE · PERFORMANCE · PROGRESS") +
      '<div class="grid4">' +
      kpi(data.metricTitles[0], sales, data.salesGoal, "money", "daily") +
      kpi(data.metricTitles[1], conv, data.convGoal, undefined, "daily") +
      kpi(data.metricTitles[2], atv, data.atvGoal, "atv", "daily") +
      kpi(data.metricTitles[3], cx, data.cxGoal, undefined, "daily") +
      '</div>' +
      '<div class="split"><div class="card pad attention"><b style="color:#a74d42;font-size:12px;letter-spacing:.08em">WHAT NEEDS ATTENTION</b>' +
      attention.slice(0, 3).map((item, i) => '<button type="button" class="attn attention-link" data-target="' + (item[0] === "Training" ? "training" : item[0] === "Coaching" ? "coaching" : "daily") + '"><span class="num ' + (i ? "amber" : "") + '">' + (i + 1) + '</span><div><b>' + item[0] + '</b><small>' + item[1] + '</small></div><span>›</span></button>').join("") +
      '</div><div class="card pad focus"><div class="label">TODAY’S FOCUS</div><h2>' + data.huddle[0] + '</h2><div class="sub">' + data.huddle[1] + '</div></div></div>' +
      '<div class="two"><div class="card pad"><div class="head"><div><h2>Team at a glance</h2><p>' + data.team.length + ' team members</p></div></div><div class="mini">' +
      '<div><strong>' + data.team.filter(x => x[1] === "On Track").length + '</strong><span>On Track</span></div>' +
      '<div><strong>' + data.team.filter(x => x[1] === "Need Coaching").length + '</strong><span>Need Coaching</span></div>' +
      '<div><strong>' + data.team.filter(x => x[1] === "Need Training").length + '</strong><span>Need Training</span></div>' +
      '</div></div><button type="button" class="card pad attention-link" data-target="huddle" style="text-align:left;width:100%;border:0"><div class="head"><div><h2>Today’s key actions</h2><p>Tap to open Huddle and edit today’s actions.</p></div><span>›</span></div>' +
      data.actions.map(action => '<div class="action"><span>' + action.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span></div>').join("") + '</button></div>';
  }

  function daily() {
    return top("Daily KPI Tracker", "Track progress. Spot trends. Take action.") +
      '<div class="card pad"><div class="head"><div><h2>Daily results</h2><p>Edit a number and the Dashboard updates automatically.</p></div><button class="btn" id="add-day">+ Add Day</button></div>' +
      '<div class="table"><table><tr><th>Day</th><th>Sales</th><th>Conversion</th><th>Avg. Transaction</th><th>CX</th></tr>' +
      data.days.map((day, i) => '<tr><td>Day ' + (i + 1) + '</td><td><input data-day="' + i + '" data-field="sales" type="number" value="' + day.sales + '"></td><td><input data-day="' + i + '" data-field="conv" type="number" step=".1" value="' + day.conv + '"></td><td><input data-day="' + i + '" data-field="atv" type="number" step=".1" value="' + day.atv + '"></td><td><input data-day="' + i + '" data-field="cx" type="number" step=".1" value="' + day.cx + '"></td></tr>').join("") +
      '</table></div></div>';
  }

  function teamPage() {
    return top("Team", "Know who needs you — without digging through a spreadsheet.") +
      '<div class="card pad"><div class="head"><div><h2>Team overview</h2><p>Performance, focus and training in one view.</p></div><button class="btn" id="add-team">+ Add Team Member</button></div>' +
      '<div class="table"><table><tr><th>Employee</th><th>Status</th><th>Focus</th><th>Training</th></tr>' +
      data.team.map(x => '<tr><td><b>' + x[0] + '</b></td><td><span class="status ' + (x[1] === "On Track" ? "good" : x[1].includes("Training") ? "warn" : "bad") + '">' + x[1] + '</span></td><td>' + x[2] + '</td><td>' + x[3] + '%<div class="bar"><i style="width:' + x[3] + '%"></i></div></td></tr>').join("") +
      '</table></div></div>';
  }

  function coachingPage() {
    return top("Team Coaching", "Meaningful conversations. Clear commitments. Stronger performance.") +
      '<div class="grid4"><div class="card pad kpi"><b>Conversations</b><div class="metric">' + data.coaching.length + '</div><div class="goal">This week</div></div>' +
      '<div class="card pad kpi"><b>Follow Ups</b><div class="metric">' + data.coaching.filter(x => x[4] === "Follow Up").length + '</div><div class="goal">Due</div></div>' +
      '<div class="card pad kpi"><b>Overdue</b><div class="metric">' + data.coaching.filter(x => x[4] === "Overdue").length + '</div><div class="goal">Needs attention</div></div>' +
      '<div class="card pad kpi"><b>Team Covered</b><div class="metric">' + new Set(data.coaching.map(x => x[0])).size + '/' + data.team.length + '</div><div class="goal">Members</div></div></div>' +
      '<div class="card pad" style="margin-top:15px"><div class="head"><h2>Coaching tracker</h2><button class="btn" id="add-coaching">+ Add Coaching</button></div>' +
      '<div class="table"><table><tr><th>Employee</th><th>Focus</th><th>Next Step</th><th>Follow Up</th><th>Status</th></tr>' +
      data.coaching.map(x => '<tr><td><b>' + x[0] + '</b></td><td>' + x[1] + '</td><td>' + x[2] + '</td><td>' + x[3] + '</td><td><span class="status ' + (x[4] === "Overdue" ? "bad" : x[4] === "Follow Up" ? "warn" : "good") + '">' + x[4] + '</span></td></tr>').join("") +
      '</table></div></div>';
  }

  function trainingPage() {
    const overall = data.training.length ? Math.round(data.training.reduce((sum, x) => sum + Number(x[2]), 0) / data.training.length) : 0;
    return top("Team Training", "Build skills. Track progress. Keep everyone ready.") +
      '<div class="grid4"><div class="card pad kpi"><b>On Track</b><div class="metric">' + data.training.filter(x => x[2] >= 80).length + '</div><div class="goal">Assignments</div></div>' +
      '<div class="card pad kpi"><b>In Progress</b><div class="metric">' + data.training.filter(x => x[3] === "In Progress").length + '</div><div class="goal">Assignments</div></div>' +
      '<div class="card pad kpi"><b>Not Started</b><div class="metric">' + data.training.filter(x => x[3] === "Not Started").length + '</div><div class="goal">Assignments</div></div>' +
      '<div class="card pad kpi"><b>Overall</b><div class="metric">' + overall + '%</div><div class="goal">Average completion</div></div></div>' +
      '<div class="card pad" style="margin-top:15px"><div class="head"><h2>Training tracker</h2><button class="btn" id="add-training">+ Add Training</button></div>' +
      '<div class="table"><table><tr><th>Employee</th><th>Training</th><th>Progress</th><th>Status</th><th>Due</th></tr>' +
      data.training.map(x => '<tr><td><b>' + x[0] + '</b></td><td>' + x[1] + '</td><td><b>' + x[2] + '%</b><div class="bar"><i class="' + (x[2] < 70 ? "bad" : x[2] < 80 ? "warn" : "") + '" style="width:' + x[2] + '%"></i></div></td><td><span class="status ' + (x[3] === "Not Started" ? "bad" : x[3] === "In Progress" ? "warn" : "good") + '">' + x[3] + '</span></td><td>' + x[4] + '</td></tr>').join("") +
      '</table></div></div>';
  }

  function huddlePage() {
    return top("Today’s Team Huddle", "Align. Motivate. Win the day.") +
      '<div class="card pad"><div class="huddle"><div class="label">TODAY’S FOCUS</div><h2>' + data.huddle[0] + '</h2><div class="sub">' + data.huddle[1] + '</div></div>' +
      '<div class="hgrid"><div class="hbox"><b>Team Challenge</b><strong>' + data.huddle[2] + '</strong></div><div class="hbox"><b>Recognition</b><strong>' + data.huddle[3] + '</strong></div></div></div>' +
      '<div class="card pad" style="margin-top:15px"><div class="head"><h2>Today’s action items</h2></div><div class="action"><span class="check"></span>Review yesterday’s results</div><div class="action"><span class="check"></span>Share today’s focus</div><div class="action"><span class="check"></span>Ask for team commitments</div></div>';
  }

  const pages = {
    dashboard,
    daily,
    team: teamPage,
    coaching: coachingPage,
    training: trainingPage,
    huddle: huddlePage,
    settings: settingsPage
  };

  const labels = {
    dashboard: "⌂ Dashboard",
    daily: "▥ Daily KPI",
    team: "♙ Team",
    coaching: "▢ Coaching",
    training: "◆ Training",
    huddle: "☼ Huddle",
    settings: "⚙ Settings"
  };

  function go(id) {
    window.location.hash = id;
  }

  function render() {
    const id = window.location.hash.slice(1) || "dashboard";
    const page = pages[id] ? id : "dashboard";
    const pagesEl = document.getElementById("pages");
    const navEl = document.getElementById("nav");
    if (!pagesEl || !navEl) return;

    pagesEl.innerHTML = '<section class="page active">' + pages[page]() + '</section>';
    navEl.innerHTML = Object.keys(labels).map(key =>
      '<button class="nav ' + (key === page ? "active" : "") + '" data-nav="' + key + '">' + labels[key] + '</button>'
    ).join("");

    navEl.querySelectorAll("[data-nav]").forEach(button => {
      button.addEventListener("click", () => go(button.dataset.nav));
    });

    pagesEl.querySelectorAll("[data-target]").forEach(button => {
      button.addEventListener("click", () => go(button.dataset.target));
    });

    const addDay = document.getElementById("add-day");
    if (addDay) addDay.addEventListener("click", () => {
      data.days.push({ sales: 0, conv: 0, atv: 0, cx: 0 });
      saveData();
      render();
    });

    pagesEl.querySelectorAll("[data-day]").forEach(input => {
      input.addEventListener("change", () => {
        const index = Number(input.dataset.day);
        const field = input.dataset.field;
        data.days[index][field] = Number(input.value) || 0;
        saveData();
        render();
      });
    });

    const addTeam = document.getElementById("add-team");
    if (addTeam) addTeam.addEventListener("click", () => {
      const name = window.prompt("Team member name");
      if (name) {
        data.team.push([name, "On Track", "Set focus area", 0]);
        saveData();
        render();
      }
    });

    const addCoaching = document.getElementById("add-coaching");
    if (addCoaching) addCoaching.addEventListener("click", () => {
      const name = window.prompt("Employee name");
      if (name) {
        data.coaching.push([name, "Focus area", "Next step", "Next week", "Follow Up"]);
        saveData();
        render();
      }
    });

    const addTraining = document.getElementById("add-training");
    if (addTraining) addTraining.addEventListener("click", () => {
      const name = window.prompt("Employee name");
      if (name) {
        data.training.push([name, "New training", 0, "Not Started", "Set date"]);
        saveData();
        render();
      }
    });

    const saveHuddle = document.getElementById("save-huddle");
    if (saveHuddle) saveHuddle.addEventListener("click", () => {
      data.huddle[0] = document.getElementById("huddle-focus").value;
      data.huddle[1] = document.getElementById("huddle-details").value;
      data.huddle[2] = document.getElementById("huddle-challenge").value;
      data.huddle[3] = document.getElementById("huddle-recognition").value;
      saveData();
      render();
    });

    const addAction = document.getElementById("add-action");
    if (addAction) addAction.addEventListener("click", () => {
      data.actions.push("New action item");
      saveData();
      render();
    });

    pagesEl.querySelectorAll("[data-action]").forEach(input => {
      input.addEventListener("change", () => {
        const index = Number(input.dataset.action);
        data.actions[index] = input.value;
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

    const saveSettings = document.getElementById("save-settings");
    if (saveSettings) saveSettings.addEventListener("click", () => {
      data.manager = document.getElementById("manager-name").value;
      data.salesGoal = Number(document.getElementById("sales-goal").value) || 0;
      data.convGoal = Number(document.getElementById("conv-goal").value) || 0;
      data.atvGoal = Number(document.getElementById("atv-goal").value) || 0;
      data.cxGoal = Number(document.getElementById("cx-goal").value) || 0;
      data.metricTitles = [0, 1, 2, 3].map(i => document.getElementById("metric-title-" + i).value.trim() || defaults.metricTitles[i]);
      saveData();
      render();
    });
  }

  window.addEventListener("hashchange", render);
  window.addEventListener("DOMContentLoaded", render);
  render();
})();