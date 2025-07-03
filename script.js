const csvURL = 'calendar_lhn_flattened.csv';

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function parseTime(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

async function fetchEvents(selected = "today") {
  const res = await fetch(csvURL);
  const text = await res.text();
  const rows = text.trim().split("\n").map(r => r.split(','));
  rows.shift(); // remove header

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const container = document.getElementById("eventContainer");
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  document.getElementById("dayTitle").textContent = dayName;
  container.innerHTML = "";

  const events = rows.map(([title, date, start, end]) => {
    return {
      title,
      startTime: parseTime(date, start),
      endTime: parseTime(date, end),
      date
    };
  }).filter(e => {
    if (selected === "all") return true;
    if (selected === "today") return e.date === todayStr;
    return e.date === selected;
  }).sort((a, b) => a.startTime - b.startTime);

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

// Wait for DOM and set up filter listener
window.addEventListener("DOMContentLoaded", () => {
  const filter = document.getElementById("dayFilter");
  filter.addEventListener("change", () => {
    fetchEvents(filter.value);
  });

  fetchEvents(filter.value); // initial load
});
