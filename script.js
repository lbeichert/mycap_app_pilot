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
                || 10,   // default 10 seconds
  countdownSeconds: parseInt(injectedParams.countdown_seconds)
                    || parseInt(urlParams.get('countdown_seconds'))
                    || 3,
  intendedUseDescription: injectedParams.intendedUseDescription
                          || urlParams.get('intendedUseDescription')
                          || 'Welcome. These instructions can be configured within redcap.',
  // Beep configuration: frequency in Hz and duration in milliseconds.
  beepFrequencyStartHz: parseInt(injectedParams.beep_frequency_start_hz)
                   || parseInt(urlParams.get('beep_frequency_start_hz'))
                   || 880,
  beepFrequencyEndHz: parseInt(injectedParams.beep_frequency_end_hz)
                   || parseInt(urlParams.get('beep_frequency_end_hz'))
                   || 440,                   
  beepDurationMs: parseInt(injectedParams.beep_duration_ms)
                  || parseInt(urlParams.get('beep_duration_ms'))
                  || 750
};

let result = {
  acceleration: null
};

let currentPageIndex = 0;
let pages = [];
let totalPages = 0;

let testRunning = false;
let testStartTime = 0;
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
        `This is a demo app to capture acceleration data (free and timed).`
      ]
    },
    {
      type: 'acceleration',
      title: 'Capture Acceleration',
      instructions: ['Please hold the phone as instructed. Tap Start to begin recording acceleration data; Stop to finish.']
    },
    {
      type: 'timedAcceleration',
      title: 'Timed Acceleration Capture',
      instructions: ['After you press Start, the app will count down and record for a fixed time as specified.']
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
    html += `<p style="font-size:0.9em;color:#666;margin-top:8px;">Version from 2025-10-06 22:08</p>`;
    page.instructions.forEach(i => html += `<p>${i}</p>`);
    html += `<div class="card mb-3"><div class="card-body">
               <h5 class="card-title">URL Parameters</h5>
               <pre>${JSON.stringify(Object.fromEntries(urlParams.entries()), null, 2)}</pre>
             </div></div>
             <button id="nextButton" class="btn btn-primary">Next</button>`;
  }
  else if (page.type === 'timedAcceleration') {
    html += `<h2>${page.title}</h2>`;
    page.instructions.forEach(i => html += `<p>${i}</p>`);
    // Show configured (read-only) values - parameters come from injectedParams/URL or defaults
    html += `<div class="card mb-3"><div class="card-body">
               <p><strong>Countdown before start:</strong> ${config.countdownSeconds} seconds</p>
               <p><strong>Measurement duration:</strong> ${config.lengthOfTest} seconds</p>
             </div></div>
             <div id="timedControls" class="mb-3">
               <button id="startTimed" class="btn btn-primary">Start</button>
               <button id="stopTimed" class="btn btn-secondary" disabled>Stop</button>
               <button id="downloadCsv" class="btn btn-success" style="display:none;margin-left:8px;">Download CSV</button>
             </div>
             <p id="timedStatus">Samples: 0</p>
             <p id="timedCountdown" style="font-size:1.5em;font-weight:bold;display:none;"></p>
             <!-- Two canvases: acceleration (top) and gyroscope (bottom) -->
             <canvas id="timedAccCanvas" width="600" height="180" style="width:100%;max-width:600px;background:#fff;border:1px solid #ddd;margin-bottom:8px;"></canvas>
             <canvas id="timedGyroCanvas" width="600" height="140" style="width:100%;max-width:600px;background:#fff;border:1px solid #ddd;"></canvas>
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
               <button id="downloadCsv" class="btn btn-success" style="display:none;margin-left:8px;">Download CSV</button>
             </div>
             <p id="accStatus">Samples: 0</p>
             <p id="accCountdown" style="font-size:1.25em;font-weight:bold;display:none;"> </p>
             <!-- Two canvases: acceleration (top) and gyroscope (bottom) -->
             <canvas id="accCanvas" width="600" height="180" style="width:100%;max-width:600px;background:#fff;border:1px solid #ddd;margin-bottom:8px;"></canvas>
             <canvas id="gyroCanvas" width="600" height="140" style="width:100%;max-width:600px;background:#fff;border:1px solid #ddd;"></canvas>
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

/**************** Untimed Acceleration Data Logic ****************/
function setupCaptureAcceleration() {
  const startBtn = document.getElementById('startAcc');
  const stopBtn = document.getElementById('stopAcc');
  const downloadBtn = document.getElementById('downloadCsv');
  const skipBtn = document.getElementById('skipAcc');
  const status = document.getElementById('accStatus');

  let accRecorder = [];
  let accStartTime = 0;

  function accHandler(ev) {
    // Capture accelerometer + gyroscope (rotationRate) if present
    const a = ev.acceleration || ev.accelerationIncludingGravity || {};
    const r = ev.rotationRate || {};
    // If neither acceleration nor rotationRate present, skip
    if (!a && !r) return;
    const ts = Date.now() - accStartTime;
    accRecorder.push({
      x: (a && typeof a.x !== 'undefined') ? a.x : null,
      y: (a && typeof a.y !== 'undefined') ? a.y : null,
      z: (a && typeof a.z !== 'undefined') ? a.z : null,
      gyroAlpha: (r && typeof r.alpha !== 'undefined') ? r.alpha : null,
      gyroBeta: (r && typeof r.beta !== 'undefined') ? r.beta : null,
      gyroGamma: (r && typeof r.gamma !== 'undefined') ? r.gamma : null,
      timestamp: ts
    });
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
      try { playTone(config.beepFrequencyStartHz, config.beepDurationMs); } catch (e) { /* ignore audio errors */ }
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
    if(downloadBtn) {
      downloadBtn.style.display = 'inline-block';
      downloadBtn.onclick = () => { downloadCSV(accRecorder); };
    }
  });

  skipBtn.addEventListener('click', nextPage);
}

function showAccGraph(accRecorder) {
  // Acceleration canvas
  const accCanvas = document.getElementById('accCanvas');
  const gyroCanvas = document.getElementById('gyroCanvas');
  if (!accCanvas && !gyroCanvas) return;

  // Helper to draw a series on a given canvas with its own scaling and legend
  function drawOnCanvas(canvas, seriesList, options = {}) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width; const h = canvas.height;
    ctx.clearRect(0,0,w,h);
    if (!seriesList || seriesList.length === 0 || seriesList[0].data.length === 0) {
      ctx.fillStyle = '#666'; ctx.fillText('No samples to display', 10, 20); return;
    }
    const times = seriesList[0].times;
    const tMin = Math.min(...times); const tMax = Math.max(...times);
    // compute vMin/vMax across provided series
    const vals = [].concat(...seriesList.map(s => s.data));
    const vMin = Math.min(...vals); const vMax = Math.max(...vals);
    const pad = 10;
    function tx(t) { return pad + ((t - tMin) / (tMax - tMin || 1)) * (w - pad * 2); }
    function ty(v) { return h - pad - ((v - vMin) / (vMax - vMin || 1)) * (h - pad * 2); }

    // Draw axes/grid
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad,pad); ctx.lineTo(pad,h-pad); ctx.lineTo(w-pad,h-pad); ctx.stroke();
    ctx.strokeStyle = '#f0f0f0';
    for (let i=0;i<=4;i++){ const y = pad + (i/4)*(h-pad*2); ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(w-pad,y); ctx.stroke(); }

    // Draw series
    seriesList.forEach(s => {
      ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath();
      s.data.forEach((v,i) => {
        const xP = tx(s.times[i]); const yP = ty(v);
        if (i === 0) ctx.moveTo(xP,yP); else ctx.lineTo(xP,yP);
      });
      if (s.dashed) { ctx.setLineDash([4,2]); } else { ctx.setLineDash([]); }
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Legend
    ctx.fillStyle = '#000'; ctx.font = '12px sans-serif';
    let xLegend = pad + 4;
    seriesList.forEach(s => {
      ctx.fillStyle = '#000'; ctx.fillText(s.label, xLegend, pad + 12);
      ctx.fillStyle = s.color; ctx.fillRect(xLegend + 20, pad + 4, 12, 8);
      xLegend += 90;
    });

    // Optional title/text
    if (options.title) {
      ctx.fillStyle = '#333'; ctx.font = '14px sans-serif';
      ctx.fillText(options.title, pad, 16);
    }
  }

  // Prepare common time axis and arrays
  if (!accRecorder || accRecorder.length === 0) {
    if (accCanvas) { accCanvas.getContext('2d').clearRect(0,0,accCanvas.width,accCanvas.height); accCanvas.getContext('2d').fillStyle='#666'; accCanvas.getContext('2d').fillText('No acceleration samples',10,20); }
    if (gyroCanvas) { gyroCanvas.getContext('2d').clearRect(0,0,gyroCanvas.width,gyroCanvas.height); gyroCanvas.getContext('2d').fillStyle='#666'; gyroCanvas.getContext('2d').fillText('No gyroscope samples',10,20); }
    return;
  }
  const times = accRecorder.map(s => s.timestamp);
  const xs = accRecorder.map(s => (s.x!=null)?s.x:0);
  const ys = accRecorder.map(s => (s.y!=null)?s.y:0);
  const zs = accRecorder.map(s => (s.z!=null)?s.z:0);
  const alpha = accRecorder.map(s => (s.gyroAlpha!=null)?s.gyroAlpha:0);
  const beta  = accRecorder.map(s => (s.gyroBeta!=null)?s.gyroBeta:0);
  const gamma = accRecorder.map(s => (s.gyroGamma!=null)?s.gyroGamma:0);
  const gmag = accRecorder.map((s,i)=>Math.sqrt(alpha[i]*alpha[i]+beta[i]*beta[i]+gamma[i]*gamma[i]||0));

  // draw acceleration (x,y,z) on accCanvas
  if (accCanvas) {
    drawOnCanvas(accCanvas, [
      { label: 'x', data: xs, times, color: '#d9534f' },
      { label: 'y', data: ys, times, color: '#5cb85c' },
      { label: 'z', data: zs, times, color: '#5bc0de' }
    ], { title: 'Acceleration (m/s²) — Mean Sampling Rate: ' + (function(){
        const tMin = Math.min(...times), tMax = Math.max(...times);
        const dur = (tMax - tMin)/1000; return (dur>0? (accRecorder.length/dur).toFixed(1)+' Hz':'0 Hz');
      })()
    });
  }

  // draw gyroscope (alpha,beta,gamma and magnitude as dashed) on gyroCanvas
  if (gyroCanvas) {
    drawOnCanvas(gyroCanvas, [
      { label: 'alpha', data: alpha, times, color: '#6f42c1' },
      { label: 'beta',  data: beta,  times, color: '#20c997' },
      { label: 'gamma', data: gamma, times, color: '#fd7e14' },
      { label: '|ω|',   data: gmag,  times, color: '#343a40', dashed: true }
    ], { title: 'Gyroscope (deg/s)' });
  }
}

function drawTimedGraph(accRecorder) {
  const accCanvas = document.getElementById('timedAccCanvas');
  const gyroCanvas = document.getElementById('timedGyroCanvas');
  if (!accCanvas && !gyroCanvas) return;

  if (!accRecorder || accRecorder.length === 0) {
    if (accCanvas) { accCanvas.getContext('2d').clearRect(0,0,accCanvas.width,accCanvas.height); accCanvas.getContext('2d').fillStyle='#666'; accCanvas.getContext('2d').fillText('No samples to display',10,20); }
    if (gyroCanvas) { gyroCanvas.getContext('2d').clearRect(0,0,gyroCanvas.width,gyroCanvas.height); gyroCanvas.getContext('2d').fillStyle='#666'; gyroCanvas.getContext('2d').fillText('No samples to display',10,20); }
    return;
  }

  // reuse logic from showAccGraph but map to timed canvases
  const times = accRecorder.map(s => s.timestamp);
  const xs = accRecorder.map(s => (s.x!=null)?s.x:0);
  const ys = accRecorder.map(s => (s.y!=null)?s.y:0);
  const zs = accRecorder.map(s => (s.z!=null)?s.z:0);
  const alpha = accRecorder.map(s => (s.gyroAlpha!=null)?s.gyroAlpha:0);
  const beta  = accRecorder.map(s => (s.gyroBeta!=null)?s.gyroBeta:0);
  const gamma = accRecorder.map(s => (s.gyroGamma!=null)?s.gyroGamma:0);
  const gmag = accRecorder.map((s,i)=>Math.sqrt(alpha[i]*alpha[i]+beta[i]*beta[i]+gamma[i]*gamma[i]||0));

  // internal draw helper (duplicate from showAccGraph scope)
  function drawOnCanvas(canvas, seriesList, options = {}) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width; const h = canvas.height;
    ctx.clearRect(0,0,w,h);
    if (!seriesList || seriesList.length === 0 || seriesList[0].data.length === 0) {
      ctx.fillStyle = '#666'; ctx.fillText('No samples to display', 10, 20); return;
    }
    const times = seriesList[0].times;
    const tMin = Math.min(...times); const tMax = Math.max(...times);
    const vals = [].concat(...seriesList.map(s => s.data));
    const vMin = Math.min(...vals); const vMax = Math.max(...vals);
    const pad = 10;
    function tx(t) { return pad + ((t - tMin) / (tMax - tMin || 1)) * (w - pad * 2); }
    function ty(v) { return h - pad - ((v - vMin) / (vMax - vMin || 1)) * (h - pad * 2); }

    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad,pad); ctx.lineTo(pad,h-pad); ctx.lineTo(w-pad,h-pad); ctx.stroke();
    ctx.strokeStyle = '#f0f0f0';
    for (let i=0;i<=4;i++){ const y = pad + (i/4)*(h-pad*2); ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(w-pad,y); ctx.stroke(); }

    seriesList.forEach(s => {
      ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath();
      s.data.forEach((v,i) => {
        const xP = tx(s.times[i]); const yP = ty(v);
        if (i === 0) ctx.moveTo(xP,yP); else ctx.lineTo(xP,yP);
      });
      if (s.dashed) ctx.setLineDash([4,2]); else ctx.setLineDash([]);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Legend
    ctx.fillStyle = '#000'; ctx.font = '12px sans-serif';
    let xLegend = pad + 4;
    seriesList.forEach(s => {
      ctx.fillStyle = '#000'; ctx.fillText(s.label, xLegend, pad + 12);
      ctx.fillStyle = s.color; ctx.fillRect(xLegend + 20, pad + 4, 12, 8);
      xLegend += 90;
    });

    if (options.title) { ctx.fillStyle = '#333'; ctx.font = '14px sans-serif'; ctx.fillText(options.title, pad, 16); }
  }

  if (accCanvas) {
    drawOnCanvas(accCanvas, [
      { label: 'x', data: xs, times, color: '#d9534f' },
      { label: 'y', data: ys, times, color: '#5cb85c' },
      { label: 'z', data: zs, times, color: '#5bc0de' }
    ], { title: 'Acceleration (m/s²)' });
  }
  if (gyroCanvas) {
    drawOnCanvas(gyroCanvas, [
      { label: 'alpha', data: alpha, times, color: '#6f42c1' },
      { label: 'beta',  data: beta,  times, color: '#20c997' },
      { label: 'gamma', data: gamma, times, color: '#fd7e14' },
      { label: '|ω|',   data: gmag,  times, color: '#343a40', dashed: true }
    ], { title: 'Gyroscope (deg/s) — Mean Sampling Rate: ' + (function(){
        const tMin = Math.min(...times), tMax = Math.max(...times);
        const dur = (tMax - tMin)/1000; return (dur>0? (accRecorder.length/dur).toFixed(1)+' Hz':'0 Hz');
      })()
    });
  }
}

// Play a simple tone for a given duration (ms) and frequency (Hz)
function playTone(freq = 440, durationMs = 300, gainValue = 0.25, rampTimeMs = 10) {
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

    // Use rampTimeMs as the minimum of rampTimeMs and durationMs / 4
    rampTimeMs = Math.min(rampTimeMs, Math.floor(durationMs / 4));

    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gainValue, now + rampTimeMs / 1000);
    o.start(now);

    const decayStart = now + (durationMs - rampTimeMs) / 1000;
    const decayEnd = now + durationMs / 1000;
    g.gain.setValueAtTime(gainValue, decayStart);
    g.gain.exponentialRampToValueAtTime(0.0001, decayEnd);
    o.stop(decayEnd + 0.02);
    setTimeout(() => { try { ctx.close(); } catch (e) {} }, durationMs + 200);
  } catch (e) {}
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
    const a = ev.acceleration || ev.accelerationIncludingGravity || {};
    const r = ev.rotationRate || {};
    if (!a && !r) return;
    const ts = Date.now() - startTime;
    recorder.push({
      x: (a && typeof a.x !== 'undefined') ? a.x : null,
      y: (a && typeof a.y !== 'undefined') ? a.y : null,
      z: (a && typeof a.z !== 'undefined') ? a.z : null,
      gyroAlpha: (r && typeof r.alpha !== 'undefined') ? r.alpha : null,
      gyroBeta: (r && typeof r.beta !== 'undefined') ? r.beta : null,
      gyroGamma: (r && typeof r.gamma !== 'undefined') ? r.gamma : null,
      timestamp: ts
    });
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
      // Indicate start with tone
      playTone(config.beepFrequencyStartHz, config.beepDurationMs);
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
    try { window.removeEventListener('devicemotion', accHandler); } catch (e) { }
    if (measurementTimer) { clearTimeout(measurementTimer); measurementTimer = null; }
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    if (status) status.textContent = `Stopped. Samples: ${recorder.length}`;
    // Use configured beep duration (avoid querying removed DOM input)
    playTone(config.beepFrequencyEndHz, config.beepDurationMs);
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
  const accCanvas = document.getElementById('timedAccCanvas');
  const gyroCanvas = document.getElementById('timedGyroCanvas');
  if (!accCanvas && !gyroCanvas) return;

  if (!accRecorder || accRecorder.length === 0) {
    if (accCanvas) { accCanvas.getContext('2d').clearRect(0,0,accCanvas.width,accCanvas.height); accCanvas.getContext('2d').fillStyle='#666'; accCanvas.getContext('2d').fillText('No samples to display',10,20); }
    if (gyroCanvas) { gyroCanvas.getContext('2d').clearRect(0,0,gyroCanvas.width,gyroCanvas.height); gyroCanvas.getContext('2d').fillStyle='#666'; gyroCanvas.getContext('2d').fillText('No samples to display',10,20); }
    return;
  }

  // reuse logic from showAccGraph but map to timed canvases
  const times = accRecorder.map(s => s.timestamp);
  const xs = accRecorder.map(s => (s.x!=null)?s.x:0);
  const ys = accRecorder.map(s => (s.y!=null)?s.y:0);
  const zs = accRecorder.map(s => (s.z!=null)?s.z:0);
  const alpha = accRecorder.map(s => (s.gyroAlpha!=null)?s.gyroAlpha:0);
  const beta  = accRecorder.map(s => (s.gyroBeta!=null)?s.gyroBeta:0);
  const gamma = accRecorder.map(s => (s.gyroGamma!=null)?s.gyroGamma:0);
  const gmag = accRecorder.map((s,i)=>Math.sqrt(alpha[i]*alpha[i]+beta[i]*beta[i]+gamma[i]*gamma[i]||0));

  // internal draw helper (duplicate from showAccGraph scope)
  function drawOnCanvas(canvas, seriesList, options = {}) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width; const h = canvas.height;
    ctx.clearRect(0,0,w,h);
    if (!seriesList || seriesList.length === 0 || seriesList[0].data.length === 0) {
      ctx.fillStyle = '#666'; ctx.fillText('No samples to display', 10, 20); return;
    }
    const times = seriesList[0].times;
    const tMin = Math.min(...times); const tMax = Math.max(...times);
    const vals = [].concat(...seriesList.map(s => s.data));
    const vMin = Math.min(...vals); const vMax = Math.max(...vals);
    const pad = 10;
    function tx(t) { return pad + ((t - tMin) / (tMax - tMin || 1)) * (w - pad * 2); }
    function ty(v) { return h - pad - ((v - vMin) / (vMax - vMin || 1)) * (h - pad * 2); }

    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad,pad); ctx.lineTo(pad,h-pad); ctx.lineTo(w-pad,h-pad); ctx.stroke();
    ctx.strokeStyle = '#f0f0f0';
    for (let i=0;i<=4;i++){ const y = pad + (i/4)*(h-pad*2); ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(w-pad,y); ctx.stroke(); }

    seriesList.forEach(s => {
      ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath();
      s.data.forEach((v,i) => {
        const xP = tx(s.times[i]); const yP = ty(v);
        if (i === 0) ctx.moveTo(xP,yP); else ctx.lineTo(xP,yP);
      });
      if (s.dashed) ctx.setLineDash([4,2]); else ctx.setLineDash([]);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Legend
    ctx.fillStyle = '#000'; ctx.font = '12px sans-serif';
    let xLegend = pad + 4;
    seriesList.forEach(s => {
      ctx.fillStyle = '#000'; ctx.fillText(s.label, xLegend, pad + 12);
      ctx.fillStyle = s.color; ctx.fillRect(xLegend + 20, pad + 4, 12, 8);
      xLegend += 90;
    });

    if (options.title) { ctx.fillStyle = '#333'; ctx.font = '14px sans-serif'; ctx.fillText(options.title, pad, 16); }
  }

  if (accCanvas) {
    drawOnCanvas(accCanvas, [
      { label: 'x', data: xs, times, color: '#d9534f' },
      { label: 'y', data: ys, times, color: '#5cb85c' },
      { label: 'z', data: zs, times, color: '#5bc0de' }
    ], { title: 'Acceleration (m/s²)' });
  }
  if (gyroCanvas) {
    drawOnCanvas(gyroCanvas, [
      { label: 'alpha', data: alpha, times, color: '#6f42c1' },
      { label: 'beta',  data: beta,  times, color: '#20c997' },
      { label: 'gamma', data: gamma, times, color: '#fd7e14' },
      { label: '|ω|',   data: gmag,  times, color: '#343a40', dashed: true }
    ], { title: 'Gyroscope (deg/s) — Mean Sampling Rate: ' + (function(){
        const tMin = Math.min(...times), tMax = Math.max(...times);
        const dur = (tMax - tMin)/1000; return (dur>0? (accRecorder.length/dur).toFixed(1)+' Hz':'0 Hz');
      })()
    });
  }
}

// Replace CSV to include gyro fields
function downloadCSV(arr) {
  if (!arr || arr.length===0) return;
  let csv = 'timestamp_ms,x,y,z,gyro_alpha,gyro_beta,gyro_gamma\n';
  arr.forEach(r=>{
    csv += `${r.timestamp},${r.x||''},${r.y||''},${r.z||''},${r.gyroAlpha||''},${r.gyroBeta||''},${r.gyroGamma||''}\n`;
  });
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

// Add initialization (ensure DOM element '#app' exists before rendering)
window.addEventListener('DOMContentLoaded', () => {
  initPages();
  renderPage(currentPageIndex);
});

