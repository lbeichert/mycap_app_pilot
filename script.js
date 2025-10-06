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
      title: 'Capture of Acceleration Data',
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
  else if (page.type === 'captureImage') {
    html += `<h2>${page.title}</h2>`;
    page.instructions.forEach(i => html += `<p>${i}</p>`);
    html += `<video id="video" autoplay playsinline style="width:100%;max-width:400px;"></video>
             <canvas id="canvas" style="display:none;"></canvas>
             <div class="bottom-bar">
               <button id="captureButton" class="btn btn-primary">Capture</button>
               <button id="skipImage" class="btn btn-secondary ml-2">Skip</button>
             </div>`;
  }
  else if (page.type === 'recordAudio') {
    html += `<h2>${page.title}</h2>`;
    page.instructions.forEach(i => html += `<p>${i}</p>`);
    html += `<div id="audioControls" class="mb-3">
               <button id="startRecording" class="btn btn-primary">Start Recording</button>
               <button id="stopRecording" class="btn btn-secondary" disabled>Stop Recording</button>
             </div>
             <button id="skipAudio" class="btn btn-secondary">Skip</button>`;
  }
  else if (page.type === 'captureLocation') {
    html += `<h2>${page.title}</h2>`;
    page.instructions.forEach(i => html += `<p>${i}</p>`);
    html += `<p id="locationStatus">Attempting to get location...</p>
             <button id="locationNextButton" class="btn btn-primary">Next</button>`;
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
  if (page.type === 'captureImage') setupCaptureImage();
  if (page.type === 'recordAudio') setupRecordAudio();
  if (page.type === 'captureLocation') setupCaptureLocation();
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

    const stopDuringCountdown = () => {
      cancelled = true;
      if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
      countdownEl.style.display = 'none';
      startBtn.disabled = false;
      stopBtn.disabled = true;
      status.textContent = 'Cancelled.';
      // remove this handler to avoid double-execution when real stop happens
      stopBtn.removeEventListener('click', stopDuringCountdown);
    };
    // Add temporary listener which will be removed when real stop handler runs
    stopBtn.addEventListener('click', stopDuringCountdown);
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
