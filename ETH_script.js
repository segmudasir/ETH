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
          borderColor: 'rgb(45, 60, 249)',  // Entry line color
          backgroundColor: 'rgba(0, 255, 0, 0.2)',  // Entry line fill color
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
            backgroundColor: 'rgba(255, 99, 71, 0.2)', // Light red (loss) by default
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

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('https://staff-api-plz8.onrender.com/data');
    const data = await response.json();

    if (data.EntryPrice !== undefined) {
      document.getElementById('entryPrice').value = data.EntryPrice;
      entryValue = data.EntryPrice;  // update global variable
    }
    if (data.Size !== undefined) {
      document.getElementById('size').value = data.Size;
      size = data.Size;  // update global variable
    }
    if (data.StopPrice !== undefined) {
      document.getElementById('stopPrice').value = data.StopPrice;
      // If you use a global variable for stopPrice, update it here too
    }
    if (data.Leverage !== undefined) {
     document.querySelector('.value[data-type="levr"]').textContent = `x${data.Leverage}`;
      leverage = parseFloat(data.Leverage); // ✅ Store in global variable
    }
  } catch (error) {
    console.error('Failed to fetch initial data:', error);
  }
});

function startTracking() {
  const inputValue = parseFloat(document.getElementById('entryPrice').value);
  const sizeValue = parseFloat(document.getElementById('size').value);
 const stopBox = document.getElementById('stop-price');
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

  isTrackingStarted = true; // Mark tracking as started
  stopCrossed = false;

stopBox.textContent = 'Waiting...';
stopBox.style.backgroundColor = '#fa5c47'; // your default red background
stopBox.style.borderColor= '#0ee4f7';

}

setInterval(getETHPrice, 1000);


async function getETHPrice() {
  //thsi function is runnign every 1 sec
  try {
    const response = await fetch('https://api.bybit.com/v5/market/tickers?category=linear&symbol=ETHUSDT');
    const json = await response.json();
    const ticker = json.result.list[0];

    const price = parseFloat(ticker.lastPrice);
    const high = parseFloat(ticker.highPrice24h); // ✅ Use highPrice24h
    const low = parseFloat(ticker.lowPrice24h);   // ✅ Use lowPrice24h
    const average_24 = parseFloat(ticker.indexPrice); // Or markPrice if preferred
    const prevPrice1h = parseFloat(ticker.prevPrice1h);
    const priceChange1hPct = ((price - prevPrice1h) / prevPrice1h) * 100;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    priceData.push(price);
    timeLabels.push(currentTime);
    entryLineData.push(entryValue);
    
    
    
   const stopValue = parseFloat(document.getElementById('stopPrice')?.value);
    if(firstvaluecount==1)
      {
         console.log('First Price', price);
        if(price>stopValue)
          {
            direction = 'down';
            firstvaluecount++;
          }
        else
          {
            direction = 'up';
            firstvaluecount++;
          }
      }
    
   if (isTrackingStarted && !isNaN(stopValue) && !stopCrossed) 
   {
     console.log('Current Price', price);
     if (direction == 'up')
      {
        if (price>= stopValue)
          {
            stopCrossed = true;
            document.getElementById('stop-price').style.backgroundColor = '#61ee6f';
            document.getElementById('stop-price').style.borderColor= '#f7941e';
            document.getElementById('stop-price').textContent = 'Target Hit';
          }
       }
     
    
      else if (direction == 'down')
      {
        if (price<= stopValue)
          {
            stopCrossed = true;
            document.getElementById('stop-price').style.backgroundColor = '#61ee6f';
            document.getElementById('stop-price').style.borderColor= '#f7941e';
            document.getElementById('stop-price').textContent = 'Target Hit';   

          }
      }
    }
     
   

    const isLoss = (positionType === 'long') ? price < entryValue : price > entryValue;
    if (ethChart.data.datasets[2]) {
      ethChart.data.datasets[2].backgroundColor = isLoss ? 'rgba(255, 99, 71, 0.2)' : 'rgba(0, 255, 0, 0.2)';
}

    document.getElementById('latest-price').textContent = `${price.toFixed(2)} $`;
    document.title = `${price.toFixed(2)} | ETH`;
    updatePriceColor(price);
    updateProfitDisplay(price);
    syncRightAxis();

    // ✅ Update 24H High/Low
    document.getElementById('high24h').textContent = `${high.toFixed(2)} $`;
    document.getElementById('low24h').textContent = `${low.toFixed(2)} $`;

    // ✅ Close to Max/Min
    const diff = high - low;
    const closeToMax = ((price - low) / diff) * 100;
    const closeToMin = 100 - closeToMax;
     // ✅ Liquidation calculation
    const inputValue = parseFloat(document.getElementById('entryPrice').value);
    const factor = inputValue * (1 / leverage);
    let liq_price = null;
    if(positionType === 'long')
      {
        liq_price = inputValue - factor+15;
      }
    else
      {
        liq_price = inputValue + factor-15;
      }

    document.querySelector('.info-line .value[data-type="max"]').textContent = `${closeToMax.toFixed(2)} %`;
    document.querySelector('.info-line .value[data-type="min"]').textContent = `${closeToMin.toFixed(2)} %`;

    // ✅ 24h Averages
    document.querySelector('.info-line .value[data-type="24average"]').textContent = `${average_24.toFixed(2)} $`;
    // ✅ Previous 1H price
    document.querySelector('.info-line .value[data-type="prev1h"]').textContent = `${prevPrice1h.toFixed(2)} $`;
    // ✅ 1h Change
    document.querySelector('.info-line .value[data-type="average"]').textContent = `${priceChange1hPct.toFixed(2)} %`;
    // ✅ Leverage
    document.querySelector('.value[data-type="levr"]').textContent = `x${parseInt(leverage)}`;
     // ✅ Liquidation Price
    document.querySelector('.info-line .value[data-type="liqPrice"]').textContent = `${liq_price.toFixed(2)} $`;
  } catch (error) {
    console.error('Error fetching ETH price:', error);
  }
}



function updateProfitDisplay(currentPrice) {
  let profitLoss = (positionType === 'long') ? 
  (currentPrice - entryValue) * size : 
  (entryValue - currentPrice) * size;


  const profitDisplay = document.getElementById('profitDisplay');


  if (!isTrackingStarted) {
    // Default state: Don't change the background color until tracking starts
    profitDisplay.style.backgroundColor = 'rgba(235, 202, 166, 0.56)';
  } else {
    // Update profit background color based on profit/loss
    if (profitLoss >= 0) {
      profitDisplay.innerHTML = `Profit: ${profitLoss.toFixed(2)} $`;
      profitDisplay.style.backgroundColor = 'rgba(137, 234, 138, 0.82)';  // Green for profit
    } else {
      profitDisplay.innerHTML = `Loss: ${Math.abs(profitLoss).toFixed(2)} $`;
      profitDisplay.style.backgroundColor = 'rgba(247, 52, 48, 0.56)';  // Red for loss
    }

  }
}

function updatePriceColor(currentPrice) {
  const priceElement = document.getElementById('latest-price');
  priceElement.style.color = 'black'; // Keep price text color black
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