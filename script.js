// script.js

/**************** Read Flutter-injected & URL Parameters ****************/
const injectedParams = window.flutterQueryParams || {};
const urlParams = window.searchParams || new URLSearchParams(window.location.search);

const config = {
  identifier: injectedParams.identifier
              || urlParams.get('identifier')
              || 'defaultIdentifier',
  lengthOfTest: parseInt(injectedParams.length_of_test)
                || parseInt(urlParams.get('length_of_test'))
                || 3,   // default 3 seconds
  // countdown before recording starts (seconds)
  countdownSeconds: parseInt(injectedParams.countdown_seconds)
                    || parseInt(urlParams.get('countdown_seconds'))
                    || 3,
  intendedUseDescription: injectedParams.intendedUseDescription
                          || urlParams.get('intendedUseDescription')
                          || 'Welcome to the Custom Active Task Demo. Please follow the instructions below.',
  // Beep configuration: frequency in Hz and duration in milliseconds.
  // Can be overridden via injectedParams.beep_frequency_hz or URL param beep_frequency_hz
  // and injectedParams.beep_duration_ms or URL param beep_duration_ms.
  beepFrequencyHz: parseInt(injectedParams.beep_frequency_hz)
                   || parseInt(urlParams.get('beep_frequency_hz'))
                   || 880,
  beepDurationMs: parseInt(injectedParams.beep_duration_ms)
                  || parseInt(urlParams.get('beep_duration_ms'))
                  || 150
};

let result = {
  rightHand: {},
  image: null,
  audio: null,
  location: { latitude: null, longitude: null },
  acceleration: null
};

let currentPageIndex = 0;
let pages = [];
let totalPages = 0;

let testRunning = false;
let testStartTime = 0;
let tapCount = 0;
let samples = [];
let accEvents = [];
let testInterval = null;

/**************** Page Definitions ****************/
function initPages() {
  pages = [
    {
      type: 'intro',
      title: 'Capture of Acceleration Data 19:39',
      instructions: [
        config.intendedUseDescription,
        `This test will capture acceleration data for as long as you like.`
      ]
    },
    // { type: 'test', hand: 'RIGHT' },
    {
      type: 'acceleration',
      title: 'Capture Acceleration',
      instructions: ['Please hold the phone as instructed. Tap Start to begin recording acceleration data; Stop to finish.']
    },
    {
      type: 'timedAcceleration',
      title: 'Timed Acceleration Capture',
      instructions: ['Configure the measurement duration and countdown, then press Start. The device will record acceleration automatically for the configured duration.']
    },
    // {
    //   type: 'errorPrompt',
    //   title: 'Error Test',
    //   instructions: ['Do you want to throw an error?']
    // },
    {
      type: 'completion',
      title: 'Completion',
      instructions: ['Test complete. Thank you!']
    }
  ];
  totalPages = pages.length;
}

/**************** Rendering & Navigation ****************/
function renderPage(index) {
  const page = pages[index];
  let html = `<div class="top-bar d-flex justify-content-between align-items-center">
                <div>Page ${index + 1} of ${totalPages}</div>`;
  if (index > 0) {
    html += `<button id="backButton" class="btn btn-secondary">Back</button>`;
  }
  html += `</div><div class="content">`;

  if (page.type === 'intro') {
    html += `<h2>${page.title}</h2>`;
    page.instructions.forEach(i => html += `<p>${i}</p>`);
    html += `<div class="card mb-3"><div class="card-body">
               <h5 class="card-title">URL Parameters</h5>
               <pre>${JSON.stringify(Object.fromEntries(urlParams.entries()), null, 2)}</pre>
             </div></div>
             <button id="nextButton" class="btn btn-primary">Next</button>`;
  }
  else if (page.type === 'test') {
    html += `<h2>Tapping Speed Test</h2>
             <div class="progress mb-3">
               <div id="progressBar" class="progress-bar" style="width:0%"></div>
             </div>
             <p>Total Taps: <span id="tapCount">0</span></p>
             <div class="d-flex justify-content-center">
               <button id="rightButton" class="tap-button">Tap</button>
             </div>`;
  }
  else if (page.type === 'timedAcceleration') {
    html += `<h2>${page.title}</h2>`;
    page.instructions.forEach(i => html += `<p>${i}</p>`);
    // Show configured (read-only) values - parameters come from injectedParams/URL or defaults
    html += `<div class="card mb-3"><div class="card-body">
               <p><strong>Measurement duration:</strong> ${config.lengthOfTest} seconds</p>
               <p><strong>Countdown before start:</strong> ${config.countdownSeconds} seconds</p>
               <p><strong>Beep duration:</strong> ${config.beepDurationMs} ms</p>
               <p style="font-size:0.9em;color:#666;margin-top:8px;">These values are configured via host parameters and are not editable here.</p>
             </div></div>
             <div id="timedControls" class="mb-3">
               <button id="startTimed" class="btn btn-primary">Start</button>
               <button id="stopTimed" class="btn btn-secondary" disabled>Stop</button>
               <button id="downloadCsv" class="btn btn-success" style="display:none;margin-left:8px;">Download CSV</button>
             </div>
             <p id="timedStatus">Samples: 0</p>
             <p id="timedCountdown" style="font-size:1.5em;font-weight:bold;display:none;"></p>
             <canvas id="timedAccCanvas" width="600" height="200" style="width:100%;max-width:600px;background:#fff;border:1px solid #ddd;"></canvas>
             <div class="mt-2">
               <button id="timedNext" class="btn btn-primary" style="display:none;margin-right:8px;">Next</button>
               <button id="timedSkip" class="btn btn-secondary">Skip</button>
             </div>`;
  }
  else if (page.type === 'acceleration') {
    html += `<h2>${page.title}</h2>`;
    page.instructions.forEach(i => html += `<p>${i}</p>`);
    html += `<div id="accControls" class="mb-3">
               <button id="startAcc" class="btn btn-primary">Start</button>
               <button id="stopAcc" class="btn btn-secondary" disabled>Stop</button>
             </div>
             <p id="accStatus">Samples: 0</p>
            <p id="accCountdown" style="font-size:1.25em;font-weight:bold;display:none;"> </p>
             <canvas id="accCanvas" width="600" height="200" style="width:100%;max-width:600px;background:#fff;border:1px solid #ddd;"></canvas>
             <div class="mt-2">
               <button id="accNext" class="btn btn-primary" style="display:none;margin-right:8px;">Next</button>
               <button id="skipAcc" class="btn btn-secondary">Skip</button>
             </div>`;
  }
  else if (page.type === 'errorPrompt') {
    html += `<h2>${page.title}</h2>`;
    page.instructions.forEach(i => html += `<p>${i}</p>`);
    html += `<div class="d-flex justify-content-center">
               <button id="errorYes" class="btn btn-danger mx-2">Yes</button>
               <button id="errorNo" class="btn btn-secondary mx-2">No</button>
             </div>`;
  }
  else if (page.type === 'completion') {
    html += `<h2>${page.title}</h2>`;
    page.instructions.forEach(i => html += `<p>${i}</p>`);
    html += `<p>Submitting results…</p>
             <button id="submitButton" class="btn btn-success">Submit</button>`;
  }

  html += `</div>`;
  document.getElementById('app').innerHTML = html;

  // Event listeners
  if (page.type !== 'intro') {
    const back = document.getElementById('backButton');
    if (back) back.addEventListener('click', prevPage);
  }
  if (page.type === 'intro') {
    document.getElementById('nextButton').addEventListener('click', nextPage);
  }
  if (page.type === 'test') setupTestPage();
  if (page.type === 'timedAcceleration') setupTimedAcceleration();
  if (page.type === 'acceleration') setupCaptureAcceleration();
  if (page.type === 'errorPrompt') {
    document.getElementById('errorYes').addEventListener('click', throwError);
    document.getElementById('errorNo').addEventListener('click', nextPage);
  }
  if (page.type === 'completion') {
    document.getElementById('submitButton').addEventListener('click', submitResults);
  }
}

function nextPage() {
  if (currentPageIndex < totalPages - 1) {
    currentPageIndex++;
    renderPage(currentPageIndex);
  } else {
    submitResults();
  }
}
function prevPage() {
  if (currentPageIndex > 0) {
    currentPageIndex--;
    renderPage(currentPageIndex);
  }
}

/**************** Test Logic ****************/
function setupTestPage() {
  testRunning = false; tapCount = 0; samples = []; accEvents = [];
  document.getElementById('tapCount').textContent = '0';
  document.getElementById('rightButton').addEventListener('click', e => {
    if (!testRunning) startTest();
    tapCount++;
    document.getElementById('tapCount').textContent = tapCount;
    samples.push({
      locationX: e.clientX,
      locationY: e.clientY,
      buttonIdentifier: '.Right',
      timestamp: Date.now() - testStartTime
    });
  });
}
function startTest() {
  testRunning = true;
  testStartTime = Date.now();
  window.addEventListener('devicemotion', deviceMotionHandler);
  testInterval = setInterval(() => {
    const elapsed = Date.now() - testStartTime;
    const pct = Math.min((elapsed / (config.lengthOfTest * 1000)) * 100, 100);
    document.getElementById('progressBar').style.width = pct + '%';
    if (elapsed >= config.lengthOfTest * 1000) stopTest();
  }, 50);
}
function stopTest() {
  clearInterval(testInterval);
  testRunning = false;
  window.removeEventListener('devicemotion', deviceMotionHandler);
  const btn = document.getElementById('rightButton').getBoundingClientRect();
  result.rightHand = {
    buttonRect: { locationX: btn.left, locationY: btn.top, width: btn.width, height: btn.height },
    stepViewSize: { width: window.innerWidth, height: window.innerHeight },
    samples
  };
  result.rightHandAccData = accEvents;
  setTimeout(nextPage, 500);
}
function deviceMotionHandler(ev) {
  const a = ev.acceleration;
  if (a) accEvents.push({ x: a.x, y: a.y, z: a.z, timestamp: Date.now() - testStartTime });
}

/**************** Capture Acceleration Data ****************/
function setupCaptureAcceleration() {
  const startBtn = document.getElementById('startAcc');
  const stopBtn = document.getElementById('stopAcc');
  const skipBtn = document.getElementById('skipAcc');
  const status = document.getElementById('accStatus');

  let accRecorder = [];
  let accStartTime = 0;

  function accHandler(ev) {
    const a = ev.acceleration || ev.accelerationIncludingGravity;
    if (!a) return;
    const ts = Date.now() - accStartTime;
    accRecorder.push({ x: a.x, y: a.y, z: a.z, timestamp: ts });
    status.textContent = `Samples: ${accRecorder.length}`;
  }

  async function requestPermissionIfNeeded() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const res = await DeviceMotionEvent.requestPermission();
        return res === 'granted';
      } catch (e) {
        return false;
      }
    }
    return true; // not iOS or no permission needed
  }

  startBtn.addEventListener('click', async () => {
    const ok = await requestPermissionIfNeeded();
    if (!ok) { status.textContent = 'Permission denied.'; return; }

    // Prepare recorder and UI for countdown -> recording
    accRecorder = [];
    let countdown = config.countdownSeconds || 0;
    const countdownEl = document.getElementById('accCountdown');
    if (countdown > 0) {
      countdownEl.style.display = 'block';
      countdownEl.textContent = `Starting in ${countdown}...`;
    } else {
      countdownEl.style.display = 'none';
    }

    startBtn.disabled = true;
    stopBtn.disabled = false;

    // If countdown > 0, show countdown and delay start; allow Stop to cancel
    let countdownTimer = null;
    let cancelled = false;

    function finalizeStart() {
      if (cancelled) return;
      // remove temporary countdown stop handler so it doesn't persist into recording
      if (stopBtn) stopBtn.removeEventListener('click', stopDuringCountdown);
      countdownEl.style.display = 'none';
      accStartTime = Date.now();
      window.addEventListener('devicemotion', accHandler);
      status.textContent = 'Recording...';

      // Play a short beep to indicate recording start
      try { playBeep(); } catch (e) { /* ignore audio errors */ }
    }

    if (countdown > 0) {
      countdownTimer = setInterval(() => {
        countdown -= 1;
        if (countdown > 0) {
          countdownEl.textContent = `Starting in ${countdown}...`;
        } else {
          clearInterval(countdownTimer);
          finalizeStart();
        }
      }, 1000);
    } else {
      finalizeStart();
    }

    // Wire Stop to cancel countdown if pressed before start

    function stopDuringCountdown() {
      cancelled = true;
      if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
      if (countdownEl) countdownEl.style.display = 'none';
      startBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = true;
      if (status) status.textContent = 'Cancelled.';
      // remove this handler to avoid double-execution when real stop happens
      if (stopBtn) stopBtn.removeEventListener('click', stopDuringCountdown);
    }
    // Add temporary listener which will be removed when real stop handler runs
    if (stopBtn) stopBtn.addEventListener('click', stopDuringCountdown);
  });

  stopBtn.addEventListener('click', () => {
    // Remove motion listener (safe to call even if not recording)
    try { window.removeEventListener('devicemotion', accHandler); } catch (e) {}
    startBtn.disabled = false;
    stopBtn.disabled = true;
    result.acceleration = accRecorder;
    status.textContent = `Stopped. Samples: ${accRecorder.length}`;
    // Clear any visible countdown if present
    const countdownEl = document.getElementById('accCountdown');
    if (countdownEl) { countdownEl.style.display = 'none'; }
    // Draw basic graph and show Next button
    showAccGraph(accRecorder);
    const nextBtn = document.getElementById('accNext');
    if (nextBtn) {
      nextBtn.style.display = 'inline-block';
      nextBtn.addEventListener('click', nextPage);
    }
  });

  skipBtn.addEventListener('click', nextPage);
}

function showAccGraph(accRecorder) {
  const canvas = document.getElementById('accCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  // Clear
  ctx.clearRect(0, 0, w, h);
  if (!accRecorder || accRecorder.length === 0) {
    ctx.fillStyle = '#666'; ctx.fillText('No samples to display', 10, 20); return;
  }

  // Prepare data arrays and time range
  const times = accRecorder.map(s => s.timestamp);
  const xs = accRecorder.map(s => s.x || 0);
  const ys = accRecorder.map(s => s.y || 0);
  const zs = accRecorder.map(s => s.z || 0);
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);

  // Calculate mean sampling rate (Hz)
  const durationSec = (tMax - tMin) / 1000;
  const meanSamplingRate = durationSec > 0 ? (accRecorder.length / durationSec) : 0;

  // Draw mean sampling rate above the graph
  ctx.fillStyle = '#333';
  ctx.font = '16px sans-serif';
  ctx.fillText(`Mean Sampling Rate: ${meanSamplingRate.toFixed(1)} Hz`, 10, 28);

  const vMin = Math.min(...xs, ...ys, ...zs);
  const vMax = Math.max(...xs, ...ys, ...zs);
  const pad = 10;

  function tx(t) { return pad + ((t - tMin) / (tMax - tMin || 1)) * (w - pad * 2); }
  function ty(v) { return h - pad - ((v - vMin) / (vMax - vMin || 1)) * (h - pad * 2); }

  // Draw axes
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, h - pad); ctx.lineTo(w - pad, h - pad); ctx.stroke();

  // Draw grid lines horizontally (3)
  ctx.strokeStyle = '#f0f0f0';
  for (let i = 0; i <= 4; i++) {
    const y = pad + (i / 4) * (h - pad * 2);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
  }

  // Draw each series helper
  function drawSeries(arr, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
    arr.forEach((v, i) => {
      const xP = tx(times[i]);
      const yP = ty(v);
      if (i === 0) ctx.moveTo(xP, yP); else ctx.lineTo(xP, yP);
    });
    ctx.stroke();
  }

  // Plot x (red), y (green), z (blue)
  drawSeries(xs, '#d9534f');
  drawSeries(ys, '#5cb85c');
  drawSeries(zs, '#5bc0de');

  // Legend
  ctx.fillStyle = '#000'; ctx.font = '12px sans-serif';
  ctx.fillText('x', pad + 4, pad + 12); ctx.fillStyle = '#d9534f'; ctx.fillRect(pad + 18, pad + 4, 12, 8);
  ctx.fillStyle = '#000'; ctx.fillText('y', pad + 60, pad + 12); ctx.fillStyle = '#5cb85c'; ctx.fillRect(pad + 74, pad + 4, 12, 8);
  ctx.fillStyle = '#000'; ctx.fillText('z', pad + 116, pad + 12); ctx.fillStyle = '#5bc0de'; ctx.fillRect(pad + 130, pad + 4, 12, 8);
}

// Play a short beep using WebAudio to indicate recording start
// Play a short beep using WebAudio to indicate recording start
function playBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    // create oscillator for short beep
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    // use config values with sensible defaults
    const freq = Number(config.beepFrequencyHz) || 880;
    const durMs = Math.max(10, Number(config.beepDurationMs) || 500); // at least 10ms
    const rampUpMs = Math.min(10, Math.floor(durMs / 3)); // quick ramp but never longer than a third of duration

    o.frequency.value = freq;
    g.gain.value = 0.0001; // start near silence to avoid pops
    o.connect(g);
    g.connect(ctx.destination);

    // ramp up quickly and stop after durMs
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.2, now + rampUpMs / 1000);
    o.start(now);
    // ramp down to near silence at end of duration
    g.gain.exponentialRampToValueAtTime(0.0001, now + durMs / 1000);
    // stop a tiny bit after the gain reaches near-zero
    o.stop(now + durMs / 1000 + 0.02);
    // close context shortly after to release audio hardware
    setTimeout(() => { try { ctx.close(); } catch (e) {} }, durMs + 300);
  } catch (e) {
    // ignore audio errors
  }
}

// Play a simple tone for a given duration (ms) and frequency (Hz)
function playTone(freq = 440, durationMs = 300) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.value = 0.0001;
    o.connect(g); g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
    o.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    o.stop(now + durationMs / 1000 + 0.02);
    setTimeout(() => { try { ctx.close(); } catch (e) {} }, durationMs + 200);
  } catch (e) {}
}

// Play a long beep (used for start and end) - frequency and duration configurable
function playLongBeep(ms, freq) {
  try { playTone(freq || Number(config.beepFrequencyHz) || 880, ms || Number(config.beepDurationMs) || 400); } catch (e) {}
}

// Setup timed acceleration capture page logic

function setupTimedAcceleration() {
  const startBtn = document.getElementById('startTimed');
  const stopBtn = document.getElementById('stopTimed');
  const downloadBtn = document.getElementById('downloadCsv');
  const nextBtn = document.getElementById('timedNext');
  const skipBtn = document.getElementById('timedSkip');
  const status = document.getElementById('timedStatus');
  const countdownEl = document.getElementById('timedCountdown');

  let recorder = [];
  let startTime = 0;
  let measurementTimer = null;
  let countdownTimer = null;

  function accHandler(ev) {
    const a = ev.acceleration || ev.accelerationIncludingGravity;
    if (!a) return;
    const ts = Date.now() - startTime;
    recorder.push({ x: a.x, y: a.y, z: a.z, timestamp: ts });
    if (status) status.textContent = `Samples: ${recorder.length}`;
  }

  async function requestPermissionIfNeeded() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try { const res = await DeviceMotionEvent.requestPermission(); return res === 'granted'; } catch (e) { return false; }
    }
    return true;
  }

  if (startBtn) startBtn.addEventListener('click', async () => {
    const ok = await requestPermissionIfNeeded();
    if (!ok) { if (status) status.textContent = 'Permission denied.'; return; }
    // Use configured values (injectedParams / URL / defaults). Avoid relying on DOM inputs.
    const dur = Math.max(1, Number(config.lengthOfTest) || 1);
    let countdown = Math.max(0, Number(config.countdownSeconds) || 0);
    const beepMs = Math.max(10, Number(config.beepDurationMs) || 10);

    recorder = [];
    if (status) status.textContent = 'Preparing...';
    startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
    if (downloadBtn) downloadBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';

    let remaining = countdown;
    if (remaining > 0) {
      if (countdownEl) { countdownEl.style.display = 'block'; countdownEl.textContent = `Starting in ${remaining}...`; }
    } else {
      if (countdownEl) countdownEl.style.display = 'none';
    }

    let cancelled = false;

    function beginRecording() {
      if (cancelled) return;
      if (countdownEl) countdownEl.style.display = 'none';
      // Remove temporary countdown stop handler so it doesn't persist into recording
      if (stopBtn) stopBtn.removeEventListener('click', stopDuringCountdown);
      // Indicate start with a short beep; use configured beep duration
      playLongBeep(beepMs);
      startTime = Date.now();
      window.addEventListener('devicemotion', accHandler);
      if (status) status.textContent = 'Recording...';

      measurementTimer = setTimeout(() => { stopRecording(true); }, dur * 1000);
    }

    if (remaining > 0) {
      countdownTimer = setInterval(() => {
        remaining -= 1;
        if (remaining > 0) {
          if (countdownEl) countdownEl.textContent = `Starting in ${remaining}...`;
        } else {
          clearInterval(countdownTimer); countdownTimer = null; beginRecording();
        }
      }, 1000);
    } else {
      beginRecording();
    }

    // Handler to cancel during countdown; will be removed once recording begins or when stopped
    function stopDuringCountdown() {
      cancelled = true;
      if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
      if (countdownEl) countdownEl.style.display = 'none';
      startBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = true;
      if (status) status.textContent = 'Cancelled.';
      // remove this temporary listener
      if (stopBtn) stopBtn.removeEventListener('click', stopDuringCountdown);
    }
    if (stopBtn) stopBtn.addEventListener('click', stopDuringCountdown);
  });

  function stopRecording(isAutomated = false) {
    try { window.removeEventListener('devicemotion', accHandler); } catch (e) {}
    if (measurementTimer) { clearTimeout(measurementTimer); measurementTimer = null; }
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    if (status) status.textContent = `Stopped. Samples: ${recorder.length}`;
  // Use configured beep duration (avoid querying removed DOM input)
  playLongBeep(Math.max(50, Number(config.beepDurationMs) || 50));
    result.acceleration = recorder;
    drawTimedGraph(recorder);
    if (downloadBtn) downloadBtn.style.display = 'inline-block';
    if (nextBtn) nextBtn.style.display = 'inline-block';
    if (downloadBtn) downloadBtn.onclick = () => { downloadCSV(recorder); };
    if (nextBtn) nextBtn.onclick = () => { nextPage(); };
  }

  if (stopBtn) stopBtn.addEventListener('click', () => stopRecording(false));
  if (skipBtn) skipBtn.addEventListener('click', nextPage);
}

function drawTimedGraph(accRecorder) {
  const canvas = document.getElementById('timedAccCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width; const h = canvas.height;
  ctx.clearRect(0,0,w,h);
  if (!accRecorder || accRecorder.length === 0) { ctx.fillStyle='#666'; ctx.fillText('No samples to display',10,20); return; }
  const times = accRecorder.map(s => s.timestamp);
  const xs = accRecorder.map(s => s.x||0);
  const ys = accRecorder.map(s => s.y||0);
  const zs = accRecorder.map(s => s.z||0);
  const tMin = Math.min(...times); const tMax = Math.max(...times);
  const durationSec = (tMax - tMin)/1000;
  const meanSamplingRate = durationSec>0 ? (accRecorder.length/durationSec):0;
  ctx.fillStyle='#333'; ctx.font='16px sans-serif'; ctx.fillText(`Mean Sampling Rate: ${meanSamplingRate.toFixed(1)} Hz`,10,28);
  const vMin = Math.min(...xs,...ys,...zs); const vMax = Math.max(...xs,...ys,...zs); const pad=10;
  function tx(t){ return pad+((t-tMin)/(tMax-tMin||1))*(w-pad*2); }
  function ty(v){ return h-pad-((v-vMin)/(vMax-vMin||1))*(h-pad*2); }
  ctx.strokeStyle='#ccc'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(pad,pad); ctx.lineTo(pad,h-pad); ctx.lineTo(w-pad,h-pad); ctx.stroke();
  ctx.strokeStyle='#f0f0f0'; for(let i=0;i<=4;i++){ const y = pad+(i/4)*(h-pad*2); ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(w-pad,y); ctx.stroke(); }
  function drawSeries(arr,color){ ctx.strokeStyle=color; ctx.lineWidth=2; ctx.beginPath(); arr.forEach((v,i)=>{ const xP=tx(times[i]); const yP=ty(v); if(i===0) ctx.moveTo(xP,yP); else ctx.lineTo(xP,yP); }); ctx.stroke(); }
  drawSeries(xs,'#d9534f'); drawSeries(ys,'#5cb85c'); drawSeries(zs,'#5bc0de');
}

function downloadCSV(arr) {
  if (!arr || arr.length===0) return;
  let csv = 'timestamp_ms,x,y,z\n';
  arr.forEach(r=>{ csv += `${r.timestamp},${r.x||''},${r.y||''},${r.z||''}\n`; });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${config.identifier || 'acc'}_acceleration.csv`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),5000);
}

/**************** Error Prompt ****************/
function throwError() {
  const errJson = JSON.stringify({ error: true });
  window.flutter_inappwebview.callHandler('returnData', errJson);
  setTimeout(() => window.close(), 500);
}

/**************** Submit Results ****************/
function submitResults() {
  const jsonResult = JSON.stringify(result);
  window.flutter_inappwebview.callHandler('returnData', jsonResult);
  setTimeout(() => window.close(), 500);
}


/**************** Initialization ****************/
initPages();
renderPage(currentPageIndex);
