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

  function esc(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function reportingWeek() {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    const fmt = d => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return fmt(start) + " – " + fmt(end) + ", " + end.getFullYear();
  }

  const statusOptions = {
    team: ["On Track", "Need Coaching", "Need Training"],
    coaching: ["On Track", "Follow Up", "Overdue"],
    training: ["Not Started", "In Progress", "Completed"]
  };

  function cell(table, row, col, type, placeholder) {
    const value = data[table][row][col];
    const attrs = ' data-table="' + table + '" data-row="' + row + '" data-col="' + col + '"';
    if (type === "status") {
      return '<select class="status status-select ' + statusTone(table, value) + '"' + attrs + '>' +
        statusOptions[table].map(o => '<option' + (o === value ? " selected" : "") + '>' + o + '</option>').join("") + '</select>';
    }
    if (type === "number") {
      return '<input class="cell-input cell-num" type="number" min="0" max="100" data-type="number"' + attrs + ' value="' + esc(value) + '">';
    }
    return '<input class="cell-input" placeholder="' + esc(placeholder || "") + '"' + attrs + ' value="' + esc(value) + '">';
  }

  function statusTone(table, value) {
    if (table === "team") return value === "On Track" ? "good" : value === "Need Training" ? "warn" : "bad";
    if (table === "coaching") return value === "Overdue" ? "bad" : value === "Follow Up" ? "warn" : "good";
    return value === "Not Started" ? "bad" : value === "In Progress" ? "warn" : "good";
  }

  function deleteCell(table, row) {
    return '<td><button type="button" class="action-delete" title="Delete row" data-delete-row="' + table + ':' + row + '">×</button></td>';
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
    return '<div class="top"><div><h1>' + title + '</h1><div class="sub">' + subtitle + '</div></div><div class="week">Reporting week<b>' + reportingWeek() + '</b></div></div>';
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
    const overdue = data.coaching.filter(x => x[4] === "Overdue").length;
    if (overdue) attention.push(["Coaching", overdue + (overdue === 1 ? " follow-up needs" : " follow-ups need") + " attention"]);

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
      '</div></div><div class="card pad"><div class="head"><div><h2>Today’s key actions</h2><p>Keep it short. Keep it moving.</p></div><button type="button" class="btn" id="add-action">+ Add Action</button></div>' +
      data.actions.map((action, i) => '<div class="action action-edit"><input class="action-input" data-action="' + i + '" value="' + esc(action) + '"><button type="button" class="action-delete" data-delete-action="' + i + '">×</button></div>').join("") + '</div></div>';
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
      '<div class="card pad"><div class="head"><div><h2>Team overview</h2><p>Performance, focus and training in one view. Click any cell to edit.</p></div><button class="btn" id="add-team">+ Add Team Member</button></div>' +
      '<div class="table"><table><tr><th>Employee</th><th>Status</th><th>Focus</th><th>Training %</th><th></th></tr>' +
      data.team.map((x, i) => '<tr><td>' + cell("team", i, 0, "text", "Name") + '</td><td>' + cell("team", i, 1, "status") + '</td><td>' + cell("team", i, 2, "text", "Focus area") + '</td><td>' + cell("team", i, 3, "number") + '<div class="bar"><i style="width:' + Math.min(100, Number(x[3]) || 0) + '%"></i></div></td>' + deleteCell("team", i) + '</tr>').join("") +
      '</table></div></div>';
  }

  function coachingPage() {
    return top("Team Coaching", "Meaningful conversations. Clear commitments. Stronger performance.") +
      '<div class="grid4"><div class="card pad kpi"><b>Conversations</b><div class="metric">' + data.coaching.length + '</div><div class="goal">This week</div></div>' +
      '<div class="card pad kpi"><b>Follow Ups</b><div class="metric">' + data.coaching.filter(x => x[4] === "Follow Up").length + '</div><div class="goal">Due</div></div>' +
      '<div class="card pad kpi"><b>Overdue</b><div class="metric">' + data.coaching.filter(x => x[4] === "Overdue").length + '</div><div class="goal">Needs attention</div></div>' +
      '<div class="card pad kpi"><b>Team Covered</b><div class="metric">' + new Set(data.coaching.map(x => x[0])).size + '/' + data.team.length + '</div><div class="goal">Members</div></div></div>' +
      '<div class="card pad" style="margin-top:15px"><div class="head"><h2>Coaching tracker</h2><button class="btn" id="add-coaching">+ Add Coaching</button></div>' +
      '<div class="table"><table><tr><th>Employee</th><th>Focus</th><th>Next Step</th><th>Follow Up</th><th>Status</th><th></th></tr>' +
      data.coaching.map((x, i) => '<tr><td>' + cell("coaching", i, 0, "text", "Name") + '</td><td>' + cell("coaching", i, 1, "text", "Focus area") + '</td><td>' + cell("coaching", i, 2, "text", "Next step") + '</td><td>' + cell("coaching", i, 3, "text", "e.g. 10/12") + '</td><td>' + cell("coaching", i, 4, "status") + '</td>' + deleteCell("coaching", i) + '</tr>').join("") +
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
      '<div class="table"><table><tr><th>Employee</th><th>Training</th><th>Progress %</th><th>Status</th><th>Due</th><th></th></tr>' +
      data.training.map((x, i) => '<tr><td>' + cell("training", i, 0, "text", "Name") + '</td><td>' + cell("training", i, 1, "text", "Training") + '</td><td>' + cell("training", i, 2, "number") + '<div class="bar"><i class="' + (x[2] < 70 ? "bad" : x[2] < 80 ? "warn" : "") + '" style="width:' + Math.min(100, Number(x[2]) || 0) + '%"></i></div></td><td>' + cell("training", i, 3, "status") + '</td><td>' + cell("training", i, 4, "text", "e.g. 10/12") + '</td>' + deleteCell("training", i) + '</tr>').join("") +
      '</table></div></div>';
  }

  function huddlePage() {
    return top("Today’s Team Huddle", "Align. Motivate. Win the day.") +
      '<div class="card pad"><div class="huddle"><div class="label">TODAY’S FOCUS</div><h2>' + data.huddle[0] + '</h2><div class="sub">' + data.huddle[1] + '</div></div>' +
      '<div class="hgrid"><div class="hbox"><b>Team Challenge</b><strong>' + data.huddle[2] + '</strong></div><div class="hbox"><b>Recognition</b><strong>' + data.huddle[3] + '</strong></div></div></div>' +
      '<div class="card pad" style="margin-top:15px"><div class="head"><h2>Today’s action items</h2></div>' +
      (data.actions.length ? data.actions.map(action => '<div class="action"><span class="check"></span>' + esc(action) + '</div>').join("") : '<div class="notice">No action items yet. Add them from the Dashboard.</div>') + '</div>';
  }

  function settingsPage() {
    return top("Settings", "Set the rules once. Use them everywhere.") +
      '<div class="card pad"><div class="head"><h2>Manager & KPI goals</h2></div><div class="two">' +
      '<div><label>Manager name</label><input id="manager-name" value="' + esc(data.manager) + '"></div>' +
      '<div><label>Metric 1 title</label><input id="metric-title-0" value="' + esc(data.metricTitles[0]) + '"></div><div><label>Metric 2 title</label><input id="metric-title-1" value="' + esc(data.metricTitles[1]) + '"></div>' +
      '<div><label>Metric 3 title</label><input id="metric-title-2" value="' + esc(data.metricTitles[2]) + '"></div><div><label>Metric 4 title</label><input id="metric-title-3" value="' + esc(data.metricTitles[3]) + '"></div>' +
      '<div><label>Sales goal</label><input id="sales-goal" type="number" value="' + data.salesGoal + '"></div>' +
      '<div><label>Conversion goal %</label><input id="conv-goal" type="number" value="' + data.convGoal + '"></div><div><label>Avg. transaction goal</label><input id="atv-goal" type="number" value="' + data.atvGoal + '"></div>' +
      '<div><label>CX goal %</label><input id="cx-goal" type="number" value="' + data.cxGoal + '"></div></div><button class="btn" id="save-settings" style="margin-top:15px">Save Settings</button></div>';
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
        data.team.push([name, "On Track", "", 0]);
        saveData();
        render();
      }
    });

    const addCoaching = document.getElementById("add-coaching");
    if (addCoaching) addCoaching.addEventListener("click", () => {
      const name = window.prompt("Employee name");
      if (name) {
        data.coaching.push([name, "", "", "", "Follow Up"]);
        saveData();
        render();
      }
    });

    const addTraining = document.getElementById("add-training");
    if (addTraining) addTraining.addEventListener("click", () => {
      const name = window.prompt("Employee name");
      if (name) {
        data.training.push([name, "", 0, "Not Started", ""]);
        saveData();
        render();
      }
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

    pagesEl.querySelectorAll("[data-table]").forEach(field => {
      field.addEventListener("change", () => {
        const row = data[field.dataset.table][Number(field.dataset.row)];
        const isNumber = field.dataset.type === "number";
        row[Number(field.dataset.col)] = isNumber ? Math.max(0, Math.min(100, Number(field.value) || 0)) : field.value;
        saveData();
        if (isNumber || field.tagName === "SELECT") render();
      });
    });

    pagesEl.querySelectorAll("[data-delete-row]").forEach(button => {
      button.addEventListener("click", () => {
        const parts = button.dataset.deleteRow.split(":");
        const row = data[parts[0]][Number(parts[1])];
        if (window.confirm("Delete " + (row[0] || "this row") + "?")) {
          data[parts[0]].splice(Number(parts[1]), 1);
          saveData();
          render();
        }
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