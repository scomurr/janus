let chart;
let chartData = {};
let visibleDatasets = new Set();

// Color palette for different assets
const colors = [
  '#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2',
  '#c2185b', '#00796b', '#5d4037', '#455a64', '#e65100',
  '#ad1457', '#0277bd', '#558b2f', '#ff8f00', '#6a1b9a'
];

async function loadPortfolioData() {
  try {
    const [valuationsResp, currentResp] = await Promise.all([
      fetch('/api/portfolio/valuations'),
      fetch('/api/portfolio/current')
    ]);
    
    if (!valuationsResp.ok) {
      const errorData = await valuationsResp.json().catch(() => ({}));
      throw new Error(`Valuations API error: ${errorData.message || valuationsResp.statusText}`);
    }
    
    if (!currentResp.ok) {
      const errorData = await currentResp.json().catch(() => ({}));
      throw new Error(`Current data API error: ${errorData.message || currentResp.statusText}`);
    }
    
    const valuationsData = await valuationsResp.json();
    const currentData = await currentResp.json();
    
    // Check for empty data responses
    if (valuationsData.message || (valuationsData.symbols && valuationsData.symbols.length === 0)) {
      showError(`No portfolio data found. ${valuationsData.message || 'The daily_valuation table may be empty.'}`);
      return;
    }
    
    if (currentData.message || (currentData.assets && currentData.assets.length === 0)) {
      console.warn('No current portfolio data:', currentData.message);
    }
    
    renderChart(valuationsData);
    renderCurrentData(currentData);
    updateLastUpdated();
    
  } catch (error) {
    console.error('Error loading portfolio data:', error);
    showError(`Failed to load portfolio data: ${error.message}`);
  }
}

function renderChart(data) {
  const ctx = document.getElementById('portfolioChart').getContext('2d');
  
  // Prepare datasets
  const datasets = [];
  
  // Add portfolio total dataset
  datasets.push({
    label: 'Portfolio Total',
    data: data.portfolioTotals.map(item => ({
      x: item.date,
      y: item.total
    })),
    borderColor: colors[0],
    backgroundColor: colors[0] + '20',
    borderWidth: 3,
    fill: false,
    tension: 0.1
  });
  
  // Add individual asset datasets
  data.symbols.forEach((symbol, index) => {
    datasets.push({
      label: symbol,
      data: data.assetData[symbol].map(item => ({
        x: item.date,
        y: item.value
      })),
      borderColor: colors[(index + 1) % colors.length],
      backgroundColor: colors[(index + 1) % colors.length] + '20',
      borderWidth: 2,
      fill: false,
      tension: 0.1,
      hidden: true // Start with individual assets hidden
    });
  });
  
  chartData = { datasets };
  
  // Initialize visible datasets (only Portfolio Total visible by default)
  visibleDatasets.clear();
  visibleDatasets.add('Portfolio Total');
  
  // Create chart
  if (chart) {
    chart.destroy();
  }
  
  chart = new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // We'll create our own legend
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: $${context.parsed.y.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: data.portfolioTotals.length > 1 ? 'time' : 'category',
          time: data.portfolioTotals.length > 1 ? {
            parser: 'YYYY-MM-DD',
            displayFormats: {
              day: 'MMM DD',
              week: 'MMM DD',
              month: 'MMM YYYY'
            }
          } : undefined,
          title: {
            display: true,
            text: 'Date'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Value ($)'
          },
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString('en-US');
            }
          }
        }
      },
      interaction: {
        mode: 'nearest',
        intersect: false
      }
    }
  });
  
  // Create custom legend
  createLegend();
  
  // Show notice if only one date of data
  if (data.portfolioTotals.length === 1) {
    const chartContainer = document.querySelector('.chart-container');
    const notice = document.createElement('div');
    notice.style.cssText = 'position: absolute; top: 10px; right: 10px; background: #fff3cd; color: #856404; padding: 8px 12px; border-radius: 4px; font-size: 14px; border: 1px solid #ffeaa7;';
    notice.textContent = 'Only one date of data available - chart shows current snapshot';
    chartContainer.appendChild(notice);
  }
}

function createLegend() {
  const legendContainer = document.getElementById('legendControls');
  legendContainer.innerHTML = '';
  
  chartData.datasets.forEach((dataset, index) => {
    const legendItem = document.createElement('div');
    legendItem.className = `legend-item ${visibleDatasets.has(dataset.label) ? 'active' : ''}`;
    legendItem.onclick = () => toggleDataset(dataset.label, index);
    
    const colorBox = document.createElement('div');
    colorBox.className = 'legend-color';
    colorBox.style.backgroundColor = dataset.borderColor;
    
    const label = document.createElement('span');
    label.className = 'legend-label';
    label.textContent = dataset.label;
    
    legendItem.appendChild(colorBox);
    legendItem.appendChild(label);
    legendContainer.appendChild(legendItem);
  });
}

function toggleDataset(label, index) {
  const legendItem = document.querySelectorAll('.legend-item')[index];
  
  if (visibleDatasets.has(label)) {
    // Hide dataset
    visibleDatasets.delete(label);
    chart.data.datasets[index].hidden = true;
    legendItem.classList.remove('active');
  } else {
    // Show dataset
    visibleDatasets.add(label);
    chart.data.datasets[index].hidden = false;
    legendItem.classList.add('active');
  }
  
  chart.update();
}

function renderCurrentData(data) {
  const totalValueEl = document.getElementById('totalValue');
  const currentDataEl = document.getElementById('currentData');
  
  if (data.assets.length === 0) {
    totalValueEl.textContent = 'No data';
    currentDataEl.innerHTML = '<div class="error">No current portfolio data available</div>';
    return;
  }
  
  // Display total value
  totalValueEl.textContent = '$' + data.total.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  // Create table of current assets
  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Asset</th>
        <th>Value</th>
        <th>%</th>
      </tr>
    </thead>
    <tbody>
      ${data.assets.map(asset => {
        const percentage = ((asset.value / data.total) * 100).toFixed(1);
        return `
          <tr>
            <td>${asset.symbol}</td>
            <td class="value-cell">$${asset.value.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}</td>
            <td class="value-cell">${percentage}%</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  `;
  
  currentDataEl.innerHTML = '';
  currentDataEl.appendChild(table);
}

function updateLastUpdated() {
  const lastUpdatedEl = document.getElementById('lastUpdated');
  lastUpdatedEl.textContent = new Date().toLocaleString();
}

function showError(message) {
  const main = document.querySelector('.main');
  main.innerHTML = `<div class="error">${message}</div>`;
}

// Auto-refresh every 5 minutes
setInterval(loadPortfolioData, 5 * 60 * 1000);

// Initial load
loadPortfolioData();