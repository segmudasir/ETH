let isTrackingStarted = false; // Flag to track if tracking has started
let priceData = [];
let timeLabels = [];
let entryValue = null;
let positionType = 'long'; // Default value
let size = null;
let entryLineData = [];
let stopCrossed = false;
let direction = null;
let firstvaluecount = null;
let leverage = 5; // Default leverage
let confirmedStopValue = null;
let stopInputDebounceTimer = null;

const ctx = document.getElementById('ethChart').getContext('2d');
const ethChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: timeLabels,
    datasets: [
      {
        label: 'ETH Price (USD)',
        data: priceData,
        borderColor: 'darkorange',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        tension: 0.25,
        fill: false,
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 0,
        pointStyle: 'line',
        pointBackgroundColor: 'transparent',
        pointBorderColor: 'transparent',
        yAxisID: 'y'
      },
      {
        label: 'Entry Price Line',
        data: entryLineData,
        borderColor: 'rgb(45, 60, 249)',
        backgroundColor: 'rgba(0, 255, 0, 0.2)',
        tension: 0.25,
        fill: false,
        borderWidth: 2,
        pointRadius: 0,
        yAxisID: 'y1',
        borderDash: [5, 5]
      },
      {
        label: 'Area Fill (Profit/Loss)',
        data: priceData,
        borderColor: 'transparent',
        backgroundColor: 'rgba(255, 99, 71, 0.2)',
        fill: true,
        tension: 0.25,
        borderWidth: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 0,
        pointStyle: 'line',
        pointBackgroundColor: 'transparent',
        pointBorderColor: 'transparent',
        yAxisID: 'y'
      }
    ]
  },
  options: {
    responsive: true,
    animation: false,
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time',
          color: 'rgba(54, 209, 250, 1)',
          font: { size: 16, weight: 'bold' }
        },
        ticks: {
          color: 'black',
          autoSkip: true,
          maxTicksLimit: 10,
          font: { size: 14 }
        }
      },
      y: {
        type: 'linear',
        position: 'left',
        title: {
          display: true,
          text: 'Price (USD)',
          color: 'rgb(54, 209, 250, 1)',
          font: { size: 16, weight: 'bold' }
        },
        ticks: {
          color: 'black',
          font: { size: 14 }
        }
      },
      y1: {
        type: 'linear',
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: {
          color: 'black',
          font: { size: 14 }
        }
      }
    },
    plugins: {
      legend: { display: false }
    }
  }
});

// ✅ confirm/debounce helpers
function confirmStopValue() {
  const el = document.getElementById('stopPrice');
  const stopBox = document.getElementById('stop-price');
  const val = parseFloat(el?.value);
  if (!isNaN(val)) {
    confirmedStopValue = val;
    firstvaluecount = 1;   // recalc direction
    stopCrossed = false;   // reset
    stopBox.textContent = 'Waiting...';
    stopBox.style.backgroundColor = '#fa5c47';
    stopBox.style.borderColor = '#0ee4f7';
  } else {
    stopBox.textContent = 'Invalid target';
    stopBox.style.backgroundColor = '#f7c8c6';
  }
}

const stopInputEl = document.getElementById('stopPrice');
if (stopInputEl) {
  stopInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      confirmStopValue();
      stopInputEl.blur();
    }
  });

  stopInputEl.addEventListener('input', () => {
    const stopBox = document.getElementById('stop-price');
    stopBox.textContent = 'Editing...';
    stopBox.style.backgroundColor = '#f7c8c6';
    clearTimeout(stopInputDebounceTimer);
    stopInputDebounceTimer = setTimeout(() => {
      confirmStopValue();
    }, 1000);
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('https://data-staff-api.onrender.com/crypto');
    const data = await response.json();
    // default values code (disabled)
  } catch (error) {
    console.error('Failed to fetch initial data:', error);
  }
});

function startTracking() {
  const inputValue = parseFloat(document.getElementById('entryPrice').value);
  const sizeValue = parseFloat(document.getElementById('size').value);
  const rawStop = parseFloat(document.getElementById('stopPrice')?.value);

  if (!isNaN(rawStop)) {
    confirmedStopValue = rawStop;
    document.getElementById('stop-price').textContent = `Target: ${confirmedStopValue.toFixed(2)} $`;
  } else {
    confirmedStopValue = null;
    document.getElementById('stop-price').textContent = 'No target set';
  }

  firstvaluecount = 1;
  direction = null;
  positionType = document.querySelector('input[name="position"]:checked').value;
  priceData.length = 0;
  timeLabels.length = 0;
  entryLineData.length = 0;

  ethChart.data.labels = timeLabels;
  ethChart.data.datasets[0].data = priceData;
  ethChart.data.datasets[1].data = entryLineData;
  ethChart.data.datasets[2].data = priceData;

  entryValue = inputValue;
  size = sizeValue;

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  priceData.push(inputValue);
  timeLabels.push(currentTime);
  entryLineData.push(inputValue);
  ethChart.update();

  document.getElementById('latest-price').textContent = `${inputValue.toFixed(2)} $`;
  updatePriceColor(inputValue);
  updateProfitDisplay(inputValue);
  syncRightAxis();

  isTrackingStarted = true;
  stopCrossed = false;

  const stopBox = document.getElementById('stop-price');
  stopBox.textContent = 'Waiting...';
  stopBox.style.backgroundColor = '#fa5c47';
  stopBox.style.borderColor = '#0ee4f7';
}

setInterval(getETHPrice, 1000);

async function getETHPrice() {
  try {
    const response = await fetch('https://api.bybit.com/v5/market/tickers?category=linear&symbol=ETHUSDT');
    const json = await response.json();
    const ticker = json.result.list[0];
    const price = parseFloat(ticker.lastPrice);
    const high = parseFloat(ticker.highPrice24h);
    const low = parseFloat(ticker.lowPrice24h);
    const average_24 = parseFloat(ticker.indexPrice);
    const prevPrice1h = parseFloat(ticker.prevPrice1h);
    const priceChange1hPct = ((price - prevPrice1h) / prevPrice1h) * 100;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    priceData.push(price);
    timeLabels.push(currentTime);
    entryLineData.push(entryValue);

    // set direction on first tick after confirm
    if (firstvaluecount === 1 && confirmedStopValue !== null) {
      direction = (price > confirmedStopValue) ? 'down' : 'up';
      firstvaluecount++;
    }

    const stopBox = document.getElementById('stop-price');
const stopValue = confirmedStopValue;

if (isTrackingStarted && stopValue !== null && !stopCrossed) {
  if (direction === 'up') {
    if (price >= stopValue) {
      triggerTargetHit();
    } else {
      stopBox.textContent = 'Waiting...';
    }
  } else if (direction === 'down') {
    if (price <= stopValue) {
      triggerTargetHit();
    } else {
      stopBox.textContent = 'Waiting...';
    }
  }
}

    const isLoss = (positionType === 'long') ? price < entryValue : price > entryValue;
    ethChart.data.datasets[2].backgroundColor = isLoss ? 'rgba(255, 99, 71, 0.2)' : 'rgba(0, 255, 0, 0.2)';

    document.getElementById('latest-price').textContent = `${price.toFixed(2)} $`;
    document.title = `${price.toFixed(2)} | ETH`;
    updatePriceColor(price);
    updateProfitDisplay(price);
    syncRightAxis();

    document.getElementById('high24h').textContent = `${high.toFixed(2)} $`;
    document.getElementById('low24h').textContent = `${low.toFixed(2)} $`;

    const diff = high - low;
    const closeToMax = ((price - low) / diff) * 100;
    const closeToMin = 100 - closeToMax;

    const inputValue = parseFloat(document.getElementById('entryPrice').value);
    const factor = inputValue * (1 / leverage);
    let liq_price = (positionType === 'long')
      ? inputValue - factor + 12.75
      : inputValue + factor - 12.75;

    document.querySelector('.info-line .value[data-type="max"]').textContent = `${closeToMax.toFixed(2)} %`;
    document.querySelector('.info-line .value[data-type="min"]').textContent = `${closeToMin.toFixed(2)} %`;
    document.querySelector('.info-line .value[data-type="24average"]').textContent = `${average_24.toFixed(2)} $`;
    document.querySelector('.info-line .value[data-type="prev1h"]').textContent = `${prevPrice1h.toFixed(2)} $`;
    document.querySelector('.info-line .value[data-type="average"]').textContent = `${priceChange1hPct.toFixed(2)} %`;
    document.querySelector('.value[data-type="levr"]').textContent = `x${parseInt(leverage)}`;
    document.querySelector('.info-line .value[data-type="liqPrice"]').textContent = `${liq_price.toFixed(2)} $`;
  } catch (error) {
    console.error('Error fetching ETH price:', error);
  }
}

// ✅ extracted target hit logic
function triggerTargetHit() {
  stopCrossed = true;
  const stopBox = document.getElementById('stop-price');
  stopBox.style.backgroundColor = '#61ee6f';
  stopBox.style.borderColor = '#f7941e';
  stopBox.textContent = 'Target Hit';

  const alertTone = new Audio('Tone 1.mp3');
  alertTone.play();
  alertTone.onended = () => {
    const msg = new SpeechSynthesisUtterance("Target price is reached.");
    window.speechSynthesis.speak(msg);
  };
}

function updateProfitDisplay(currentPrice) {
  let profitLoss = (positionType === 'long')
    ? (currentPrice - entryValue) * size
    : (entryValue - currentPrice) * size;

  const profitDisplay = document.getElementById('profitDisplay');
  if (!isTrackingStarted) {
    profitDisplay.style.backgroundColor = 'rgba(235, 202, 166, 0.56)';
  } else {
    if (profitLoss >= 0) {
      profitDisplay.innerHTML = `Profit: ${profitLoss.toFixed(2)} $`;
      profitDisplay.style.backgroundColor = 'rgba(137, 234, 138, 0.82)';
    } else {
      profitDisplay.innerHTML = `Loss: ${Math.abs(profitLoss).toFixed(2)} $`;
      profitDisplay.style.backgroundColor = 'rgba(247, 52, 48, 0.56)';
    }
  }
}

function updatePriceColor(currentPrice) {
  const priceElement = document.getElementById('latest-price');
  priceElement.style.color = 'black';
  priceElement.style.borderColor = 'orange';
}

function syncRightAxis() {
  const yScale = ethChart.scales.y;
  if (yScale) {
    ethChart.options.scales.y1.min = yScale.min;
    ethChart.options.scales.y1.max = yScale.max;
    ethChart.update();
  }
}
