# Tab Switching Detection (Interview Integrity Guard)

A production-ready frontend monitoring dashboard designed to detect and log candidate tab switching, window blurring, browser minimization, and focus loss during online assessments. Built with modern web development standards, featuring a glassmorphism dark-mode interface and an elegant state-machine-driven debounce algorithm.

## 🔗 Quick Preview Link

- Open the dashboard here: [index.html](index.html)
- If you are using VS Code Live Server, the preview URL is typically: http://127.0.0.1:5500

---

## 🌟 Features

- **Multi-Event Detection**: Captures tab switching, window minimization, clicking outside the browser, and focus restoration.
- **Coalescing Debounce Algorithm (1000ms)**: Fuses overlapping browser events (e.g. `visibilitychange` + `blur` occurring simultaneously) and filters out quick transient clicks, preventing duplicate logs and minimizing server bandwidth.
- **Dynamic Dashboard UI**: Displays current monitoring status via a glowing, pulsing real-time indicator.
- **Metric Analytics**: Displays total violations, the timestamp of the last switch-away, and the timestamp of the last return.
- **Local Caching & History**: Saves audit history automatically to the browser's `localStorage` to survive page reloads.
- **Simulated Backend API Delivery**: Uses `fetch()` to asynchronously upload JSON logs to a remote API with a fail-safe fallback to local storage on network errors.
- **Responsive Layout**: Adapts perfectly across varying screen sizes from desktop monitors to tablets and smartphones.
- **Controls**: Stop/Start detection dynamically, export current audit logs as a nicely formatted JSON file, or clear log history with a confirmation dialog.

---

## 🛠️ APIs Used

The application harnesses native browser APIs:
1. **`document.visibilitychange`**: Listens for document visibility state transitions (from `visible` to `hidden` and vice versa) to detect tab shifts, minimization, and desktop switches.
2. **`window.blur`**: Triggered when the browser window loses keyboard focus (e.g., clicking on another app, opening DevTools, or clicking outside the window).
3. **`window.focus`**: Triggered when the browser window regains focus.
4. **`localStorage`**: Local storage API utilized to cache event logs persistently.
5. **`fetch()`**: Asynchronous HTTP client API used to try logging to the simulated backend server.

---

## 📂 Project Structure

```text
tab-switching-project/
│
├── index.html       # Dynamic dashboard layout and system guide markup
├── styles.css       # Premium responsive glassmorphism styles and animations
├── tabMonitor.js    # Core monitoring state machine, event hooks, and localStorage integration
└── README.md        # Technical documentation, checklist, and compatibility notes
```

---

## ⚙️ Installation & Setup Steps

No external frameworks or build systems are required. The project is completely self-contained.

1. **Download the Source Code**: Save all project files (`index.html`, `styles.css`, `tabMonitor.js`, and `README.md`) into a single folder.
2. **Launch locally**:
   - Simply double-click the `index.html` file to open it in any modern browser, or
   - Use a local development server extension (like VS Code's *Live Server*) to run it at `http://127.0.0.1:5500`.

---

## 🧪 Testing sandbox & Sandbox Steps

Use the following sequence to test the implementation:

### 1. Verification of Switch Detection & Return
1. Open the dashboard. Observe the status reads **"Monitoring Active"** in green.
2. Click outside the browser window (e.g., on your desktop, text editor, or address bar). The state changes to a pulsing orange **"Pending (Debounce)"**.
3. Hold focus outside for **more than 1.0 second**. The state changes to a pulsing red **"Tab Left / Inactive"**.
4. Click back inside the browser window. The status returns to green, and a pair of logs (`TAB_SWITCHED` with `Left` followed by `TAB_RETURNED` with `Returned`) will appear in the table.
5. Check your DevTools console; you will observe:
   ```text
   [Monitor] Pending leave detected via: Window Blur. Debouncing for 1000ms...
   [Monitor] Tab switch committed. Timestamp: 2026-06-15T13:58:30.000Z
   Backend unavailable. Log stored locally.
   [Monitor] Tab returned committed. Timestamp: 2026-06-15T13:58:32.000Z
   Backend unavailable. Log stored locally.
   ```

### 2. Verification of 1000ms Debounce Safety
1. Switch to another tab or click outside the browser.
2. Click back within **less than 1.0 second**.
3. Confirm that the status reverts to green and **no new logs** are created in the audit table, proving the debounce logic effectively filters rapid transient switches.
4. DevTools console will display:
   ```text
   [Monitor] Pending leave detected via: Window Blur. Debouncing for 1000ms...
   [Monitor] Switched back within 1000ms. Debounced successfully. No log created.
   ```

---

## 📋 Testing Checklist

| Test Case | Steps to Execute | Expected Result | Checked |
| :--- | :--- | :--- | :---: |
| **Initial State** | Open the page fresh. | Status glows green. Table displays empty state. Metrics show `0`, `None`, `None`. | [ ] |
| **Minimization (>1s)** | Minimize browser. Wait 2 seconds. Restore. | 1 Leave Log, 1 Return Log created. Total Violations increments to `1`. | [ ] |
| **Tab Change (>1s)** | Switch to another tab. Wait 2 seconds. Return. | 1 Leave Log, 1 Return Log created. Total Violations increments to `2`. | [ ] |
| **Rapid Tab Switch (<1s)** | Switch tabs and return immediately. | Status transitions to pending then active. **No logs created**. | [ ] |
| **Blur Clicking (>1s)** | Click on desktop or another app. Return after 2s. | 1 Leave Log, 1 Return Log created. Total Violations increments. | [ ] |
| **Rapid Blur (<1s)** | Click on desktop and immediately click back. | Status transitions to pending then active. **No logs created**. | [ ] |
| **LocalStorage Persistence** | Reload page after generating logs. | Log table and metrics reload exactly as they were before. | [ ] |
| **Clear logs** | Click "Clear History". Confirm prompt. | Table resets to empty state. Metrics clear to `0`. LocalStorage is cleared. | [ ] |
| **JSON Export** | Click "Export JSON". | Downloads a `.json` file containing all history logs. | [ ] |

---

## 🌐 Browser Compatibility Notes

The system uses standard modern Web APIs, fully compatible with the latest stable versions of all major browsers:

- **Google Chrome** (v60+) - Full Support
- **Microsoft Edge** (v79+) - Full Support
- **Mozilla Firefox** (v55+) - Full Support
- **Apple Safari** (v14+) - Full Support
- **Mobile Browsers (Chrome / Safari / Edge)** - Full Support (Mobile platforms trigger `visibilitychange` events when minimizing the browser app, locking the screen, or changing active apps).

*Note: In some environments, rapid click blurs may not fire window.blur if the browser prevents click-outside propagation, but tab switching and window minimization are 100% caught across all browsers.*

---

## 📄 Sample Outputs

### JSON Format for Tab Switched Out (Leave):
```json
{
  "event": "tab_switched",
  "tab_switched": true,
  "timestamp": "2026-06-15T13:58:30.124Z",
  "trigger": "Visibility Hidden"
}
```

### JSON Format for Tab Returned (Focus):
```json
{
  "event": "tab_switched",
  "tab_switched": false,
  "timestamp": "2026-06-15T13:58:32.482Z",
  "trigger": "Visibility Visible"
}
```
