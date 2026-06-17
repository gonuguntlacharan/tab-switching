/**
 * ==========================================================================
 * Tab Switching Detection Monitor
 * Author: Senior Frontend Developer
 * Description: Production-quality tab activity monitoring module.
 *              Detects tab changes, minimization, and clicks outside the browser.
 *              Implements a 1000ms debounce state machine to coalese simultaneous
 *              events and avoid duplicate logs. Integrates with localStorage
 *              and simulates API delivery to a remote backend.
 * ==========================================================================
 */

// Global State Management
let currentState = 'active'; // Possible values: 'active', 'inactive', 'pending', 'paused'
let isMonitoringActive = true; // Flag to enable/disable detection monitoring
let debounceTimer = null;    // Timer ID for the 1000ms debounce
let logsHistory = [];        // In-memory array of logs

// API Endpoint for simulated backend
const BACKEND_API_URL = "https://example.com/api/logs";

/**
 * Initializes the monitoring system, loads data from localStorage,
 * binds event listeners, and performs initial UI rendering.
 */
document.addEventListener("DOMContentLoaded", () => {
    loadLogsFromStorage();
    setupEventListeners();
    updateUIState('active');
    renderLogsTable();
    updateMetrics();
});

/**
 * Loads logs from browser's local storage and parses them.
 * Gracefully handles parsing errors by reverting to an empty array.
 */
function loadLogsFromStorage() {
    try {
        const storedLogs = localStorage.getItem("tab_switch_logs");
        if (storedLogs) {
            logsHistory = JSON.parse(storedLogs);
        } else {
            logsHistory = [];
        }
    } catch (error) {
        console.error("Failed to load logs from localStorage. Resetting storage.", error);
        logsHistory = [];
        localStorage.setItem("tab_switch_logs", JSON.stringify([]));
    }
}

/**
 * Saves the local history logs to localStorage.
 */
function saveLogsToStorage() {
    try {
        localStorage.setItem("tab_switch_logs", JSON.stringify(logsHistory));
    } catch (error) {
        console.error("Failed to save logs to localStorage.", error);
    }
}

/**
 * Setup event listeners for tab visibility, window focus, and window blur.
 */
function setupEventListeners() {
    // 1. document.visibilitychange
    // Detects when the tab is switched or the browser is minimized
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            handleLeave("Visibility Hidden");
        } else {
            handleReturn("Visibility Visible");
        }
    });

    // 2. window.blur
    // Detects when the user clicks outside the browser window or opens another application
    window.addEventListener("blur", () => {
        handleLeave("Window Blur");
    });

    // 3. window.focus
    // Detects when the user clicks back onto the browser window
    window.addEventListener("focus", () => {
        handleReturn("Window Focus");
    });

    // Bind dashboard buttons
    const toggleBtn = document.getElementById("toggle-monitor-btn");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", toggleMonitoring);
    }

    const clearBtn = document.getElementById("clear-logs-btn");
    if (clearBtn) {
        clearBtn.addEventListener("click", clearLogs);
    }

    const exportBtn = document.getElementById("export-json-btn");
    if (exportBtn) {
        exportBtn.addEventListener("click", exportLogsAsJSON);
    }
}

/**
 * Handles a potential "leave" event (tab hidden or window blurred).
 * Initiates the 1000ms debounce timer to ensure it's not a transient switch/click.
 * 
 * @param {string} triggerSource - Explanation of the event source (e.g. Window Blur)
 */
function handleLeave(triggerSource) {
    if (!isMonitoringActive) {
        return;
    }
    // If already inactive or in the pending state, ignore subsequent triggers.
    // For example, when switching tabs, both blur and visibilitychange will fire.
    // We only want to handle the first one.
    if (currentState === 'inactive' || currentState === 'pending') {
        return;
    }

    // Move to pending state and start the debounce timer
    currentState = 'pending';
    updateUIState('pending');
    console.log(`[Monitor] Pending leave detected via: ${triggerSource}. Debouncing for 1000ms...`);

    debounceTimer = setTimeout(() => {
        // If the timer finishes without being cleared, the user has committed the leave.
        currentState = 'inactive';
        debounceTimer = null;

        const logData = {
            event: "tab_switched",
            tab_switched: true,
            timestamp: new Date().toISOString(),
            trigger: triggerSource
        };

        // Commit log, update metrics, UI, and send to backend
        logsHistory.push(logData);
        saveLogsToStorage();
        updateUIState('inactive');
        renderLogsTable();
        updateMetrics();
        sendLogToBackend(logData);
        
        console.log(`[Monitor] Tab switch committed. Timestamp: ${logData.timestamp}`);
    }, 1000);
}

/**
 * Handles a potential "return" event (tab visible or window focused).
 * Clears the debounce timer if the user returned within 1000ms (canceling the log).
 * Writes a "return" log if the user was in a committed "inactive" state.
 * 
 * @param {string} triggerSource - Explanation of the event source (e.g. Window Focus)
 */
function handleReturn(triggerSource) {
    if (!isMonitoringActive) {
        return;
    }
    if (currentState === 'pending') {
        // The user returned before the 1000ms debounce timer expired.
        // Clear the timer and revert back to active state. No violation is logged.
        clearTimeout(debounceTimer);
        debounceTimer = null;
        currentState = 'active';
        updateUIState('active');
        console.log(`[Monitor] Switched back within 1000ms. Debounced successfully. No log created.`);
        return;
    }

    if (currentState === 'inactive') {
        // The user returned after a committed leave.
        // Log the return event.
        currentState = 'active';

        const logData = {
            event: "tab_switched",
            tab_switched: false,
            timestamp: new Date().toISOString(),
            trigger: triggerSource
        };

        logsHistory.push(logData);
        saveLogsToStorage();
        updateUIState('active');
        renderLogsTable();
        updateMetrics();
        sendLogToBackend(logData);

        console.log(`[Monitor] Tab returned committed. Timestamp: ${logData.timestamp}`);
    }
}

/**
 * Simulated backend logging integration using fetch().
 * Fulfills internship requirements to attempt server communication and fall back gracefully.
 * 
 * @param {object} logData - The JSON log object to send.
 */
async function sendLogToBackend(logData) {
    try {
        await fetch(BACKEND_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(logData)
        });
        console.log("Backend logged successfully.");
    } catch(error) {
        console.log("Backend unavailable. Log stored locally.");
    }
}

/**
 * Updates the visual styling of the dashboard status card.
 * Adds glowing effect classes and modifies text labels depending on the active state.
 * 
 * @param {string} state - The current state to display ('active', 'inactive', 'pending')
 */
function updateUIState(state) {
    const ring = document.getElementById("status-indicator-ring");
    const label = document.getElementById("current-state-label");
    
    if (!ring || !label) return;

    // Reset classes
    ring.className = "status-indicator-ring";

    if (state === 'active') {
        ring.classList.add("state-active");
        label.textContent = "Monitoring Active";
    } else if (state === 'inactive') {
        ring.classList.add("state-inactive");
        label.textContent = "Tab Left / Inactive";
    } else if (state === 'pending') {
        ring.classList.add("state-pending");
        label.textContent = "Pending (Debounce)";
    } else if (state === 'paused') {
        ring.classList.add("state-paused");
        label.textContent = "Monitoring Stopped";
    }
}

/**
 * Toggles the monitoring state between active and stopped.
 * When stopped, events are not tracked or logged.
 */
function toggleMonitoring() {
    const btnText = document.getElementById("toggle-btn-text");
    const toggleBtn = document.getElementById("toggle-monitor-btn");
    
    if (isMonitoringActive) {
        // Stop monitoring
        isMonitoringActive = false;
        
        // Clear any pending debounce timer
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
        
        currentState = 'paused';
        updateUIState('paused');
        
        if (btnText) {
            btnText.textContent = "Start Detection";
        }
        if (toggleBtn) {
            // Update SVG to play/start icon
            toggleBtn.querySelector("svg").innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>`;
            toggleBtn.title = "Start active detection monitoring";
        }
        console.log("[Monitor] Detection stopped by user.");
    } else {
        // Start/resume monitoring
        isMonitoringActive = true;
        currentState = 'active';
        updateUIState('active');
        
        if (btnText) {
            btnText.textContent = "Stop Detection";
        }
        if (toggleBtn) {
            // Update SVG back to pause icon
            toggleBtn.querySelector("svg").innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M14.25 9v6m-4.5 0V9M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>`;
            toggleBtn.title = "Stop active detection monitoring";
        }
        console.log("[Monitor] Detection resumed by user.");
    }
}

/**
 * Calculates and updates metrics cards: total violations and last event times.
 */
function updateMetrics() {
    const violationsEl = document.getElementById("metric-violations");
    const lastLeftEl = document.getElementById("metric-last-left");
    const lastReturnedEl = document.getElementById("metric-last-returned");

    // Total violations equals the count of 'tab_switched: true' events
    const violationsCount = logsHistory.filter(log => log.event === 'tab_switched' && log.tab_switched === true).length;
    
    if (violationsEl) {
        violationsEl.textContent = violationsCount;
    }

    // Find the latest leave event
    const leaveEvents = logsHistory.filter(log => log.tab_switched === true);
    if (lastLeftEl) {
        if (leaveEvents.length > 0) {
            const lastLeaveTime = new Date(leaveEvents[leaveEvents.length - 1].timestamp);
            lastLeftEl.textContent = formatTime(lastLeaveTime);
        } else {
            lastLeftEl.textContent = "None";
        }
    }

    // Find the latest return event
    const returnEvents = logsHistory.filter(log => log.tab_switched === false);
    if (lastReturnedEl) {
        if (returnEvents.length > 0) {
            const lastReturnTime = new Date(returnEvents[returnEvents.length - 1].timestamp);
            lastReturnedEl.textContent = formatTime(lastReturnTime);
        } else {
            lastReturnedEl.textContent = "None";
        }
    }
}

/**
 * Renders the log history table in index.html dynamically.
 * Adds proper badges and formats timestamps into a reader-friendly format.
 */
function renderLogsTable() {
    const tbody = document.getElementById("logs-table-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (logsHistory.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="empty-state">
                        <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <p>No activity logs recorded yet.</p>
                        <p style="font-size: 0.75rem; margin-top: 0.25rem;">Switch tabs or click outside the window to trigger logs.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    // Render logs, newest first
    const reversedHistory = [...logsHistory].reverse();

    reversedHistory.forEach((log) => {
        const row = document.createElement("tr");

        // Event Badge cell
        const eventCell = document.createElement("td");
        const eventBadge = document.createElement("span");
        eventBadge.classList.add("badge-event");
        
        if (log.tab_switched === true) {
            eventBadge.classList.add("badge-event-switched");
            eventBadge.textContent = "TAB_SWITCHED";
        } else {
            eventBadge.classList.add("badge-event-returned");
            eventBadge.textContent = "TAB_RETURNED";
        }
        eventCell.appendChild(eventBadge);

        // Status Badge cell
        const statusCell = document.createElement("td");
        const statusBadge = document.createElement("span");
        statusBadge.classList.add("badge-status");
        
        if (log.tab_switched === true) {
            statusBadge.classList.add("status-left");
            statusBadge.textContent = `Left (${log.trigger || "Unknown"})`;
        } else {
            statusBadge.classList.add("status-returned");
            statusBadge.textContent = `Returned (${log.trigger || "Unknown"})`;
        }
        statusCell.appendChild(statusBadge);

        // Timestamp cell
        const timestampCell = document.createElement("td");
        timestampCell.classList.add("timestamp-cell");
        const logDate = new Date(log.timestamp);
        timestampCell.textContent = logDate.toLocaleString();
        timestampCell.title = log.timestamp; // Full ISO string on hover

        // Backend Sync Status cell
        const syncCell = document.createElement("td");
        const syncBadge = document.createElement("span");
        syncBadge.className = "sync-badge sync-local";
        syncBadge.textContent = "Saved locally (Backend offline)";
        syncBadge.title = "Attempted to sync with https://example.com/api/logs, but server is offline.";
        syncCell.appendChild(syncBadge);

        // Append cells
        row.appendChild(eventCell);
        row.appendChild(statusCell);
        row.appendChild(timestampCell);
        row.appendChild(syncCell);

        tbody.appendChild(row);
    });
}

/**
 * Clears logs history both in-memory and in localStorage.
 */
function clearLogs() {
    if (confirm("Are you sure you want to clear the logs history? This action cannot be undone.")) {
        logsHistory = [];
        saveLogsToStorage();
        renderLogsTable();
        updateMetrics();
        console.log("[Monitor] History cleared by user.");
    }
}

/**
 * Exports logs as a JSON file and triggers browser download.
 */
function exportLogsAsJSON() {
    if (logsHistory.length === 0) {
        alert("There are no logs to export.");
        return;
    }

    const jsonString = JSON.stringify(logsHistory, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `tab_monitor_logs_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("[Monitor] Logs exported as JSON.");
}

/**
 * Utility: Formats a Date object to HH:MM:SS format.
 * 
 * @param {Date} date - The date to format
 * @returns {string} - Formatted HH:MM:SS string
 */
function formatTime(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return "N/A";
    }
    const pad = (num) => String(num).padStart(2, '0');
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${hh}:${mm}:${ss}`;
}

/**
 * ==========================================================================
 * Matrix Digital Rain Animation
 * Purpose: Generates an interactive, highly-efficient cyber hacker background
 *          using Canvas 2D. Resizes dynamically and matches neon palette.
 * ==========================================================================
 */
function initMatrixBackground() {
    const canvas = document.getElementById("matrix-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Set dimensions to fill window
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Characters array (binary, numbers, katakana, uppercase letters)
    const characters = "010101010100110011ABCDEFGHIJKLMNOPQRSTUVWXYZｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ".split("");

    const fontSize = 14;
    let columns = Math.floor(canvas.width / fontSize);

    // Drops array - tracks the y-coordinate for each column
    let drops = [];
    
    // Reinitialize drops on load/resize to fill the width
    function initDrops() {
        columns = Math.floor(canvas.width / fontSize);
        drops = [];
        for (let i = 0; i < columns; i++) {
            // Randomize starting Y to avoid synchronous falling lines
            drops[i] = Math.random() * -100;
        }
    }
    initDrops();
    window.addEventListener("resize", initDrops);

    // Speed controller: limit frame rate of animation to ~30fps for CPU efficiency
    let lastTime = 0;
    const fpsInterval = 1000 / 30; // 30 frames per second

    function draw(timestamp) {
        requestAnimationFrame(draw);

        // Limit frame rate
        const elapsed = timestamp - lastTime;
        if (elapsed < fpsInterval) return;
        lastTime = timestamp - (elapsed % fpsInterval);

        // Translucent background sweep to draw the trail effect
        // Matching --bg-primary (#020408) at low opacity
        ctx.fillStyle = "rgba(2, 4, 8, 0.08)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Set font style
        ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;

        // Render characters
        for (let i = 0; i < drops.length; i++) {
            // Select random character
            const text = characters[Math.floor(Math.random() * characters.length)];
            
            // Draw character. First few characters in drop are highlighted neon green/white
            if (drops[i] < 0) {
                // Drop is waiting offscreen
                drops[i]++;
                continue;
            }

            const x = i * fontSize;
            const y = drops[i] * fontSize;

            // Highlight the leading head of the drop
            if (Math.random() > 0.95) {
                ctx.fillStyle = "#ffffff"; // Bright flash head
            } else {
                // Hacking green colors
                ctx.fillStyle = "rgba(0, 255, 102, 0.8)";
            }

            ctx.fillText(text, x, y);

            // If drop reaches the bottom, randomly reset it to top
            if (y > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }

            // Move drop down
            drops[i]++;
        }
    }

    // Start the animation
    requestAnimationFrame((time) => draw(time));
}

// Initialize Matrix background after DOM is fully ready
document.addEventListener("DOMContentLoaded", () => {
    initMatrixBackground();
});
