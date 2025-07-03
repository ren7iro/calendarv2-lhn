const csvURL = 'calendar.csv';

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function parseTime(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getTomorrowStr() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

async function fetchEvents(selected = "today") {
  const res = await fetch(csvURL);
  const text = await res.text();
  const rows = text.trim().split("\n").map(r => r.split(','));
  const headers = rows.shift(); // ["Title", "Day", "Date", "TimeStart", "TimeEnd"]

  const todayStr = getTodayStr();
  const tomorrowStr = getTomorrowStr();
  const container = document.getElementById("eventContainer");
  const filterSelect = document.getElementById("dayFilter");
  container.innerHTML = "";

  // Build dropdown once
  if (!filterSelect.dataset.built) {
    const rawDates = [...new Set(rows.map(r => r[2]))].sort();

    // Add tomorrow explicitly as a selectable option
    filterSelect.innerHTML = `
      <option value="today">Today</option>
      <option value="${tomorrowStr}">Tomorrow</option>
      ${rawDates.map(date => {
        const [y, m, d] = date.split("-");
        return `<option value="${date}">${d}:${m}:${y}</option>`;
      }).join("")}
    `;
    filterSelect.dataset.built = "true";
  }

  const filterDate = selected === "today" ? todayStr : selected;
  const match = rows.find(r => r[2] === filterDate);
  const labelDay = match ? match[1] : "(No Events)";
  document.getElementById("dayTitle").textContent = labelDay;

  const events = rows.map(([title, day, date, start, end]) => {
    return {
      title,
      startTime: parseTime(date, start),
      endTime: parseTime(date, end),
      date
    };
  }).filter(e => e.date === filterDate)
    .sort((a, b) => a.startTime - b.startTime);

  if (events.length === 0) {
    container.innerHTML = "<div class='row'>No events found.</div>";
    return;
  }

  events.forEach(({ title, startTime, endTime }) => {
    const row = document.createElement("div");
    row.className = "row";

    const now = new Date();
    const isOngoing = now >= startTime && now <= endTime;
    const isEnded = now > endTime;

    if (isOngoing) row.classList.add("ongoing");
    if (isEnded) row.classList.add("ended");

    const labelDiv = document.createElement("div");
    labelDiv.className = "label";
    labelDiv.textContent = title;

    const timeDiv = document.createElement("div");
    timeDiv.className = "time";

    const infoMsg = document.createElement("span");
    infoMsg.className = "info-msg";

    const updateMsg = () => {
      const now = new Date();
      if (isEnded) {
        infoMsg.innerHTML = `✔️ <span class="ended-time">${formatTime(startTime)}–${formatTime(endTime)}</span>`;
        infoMsg.className = "info-msg info-ended";
      } else if (isOngoing) {
        const remaining = endTime - now;
        const minutes = Math.floor((remaining % 3600000) / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        infoMsg.textContent = `⏳ ${minutes}m ${seconds}s left`;
        infoMsg.className = "info-msg info-ongoing";
      } else {
        const total = startTime - now;
        const minutes = Math.floor((total % 3600000) / 60000);
        const seconds = Math.floor((total % 60000) / 1000);
        infoMsg.textContent = `🕒 ${formatTime(startTime)} (in ${minutes}m ${seconds}s)`;
        infoMsg.className = "info-msg info-upcoming";
      }
    };
    updateMsg();

    if (!isEnded) {
      const interval = setInterval(() => {
        updateMsg();
        if (new Date() > endTime) {
          clearInterval(interval);
          updateMsg();
        }
      }, 1000);
    }

    timeDiv.appendChild(infoMsg);
    row.appendChild(labelDiv);
    row.appendChild(timeDiv);
    container.appendChild(row);
  });
}

// DOM ready
window.addEventListener("DOMContentLoaded", () => {
  const filter = document.getElementById("dayFilter");
  filter.addEventListener("change", () => {
    fetchEvents(filter.value);
  });

  fetchEvents("today");
});
