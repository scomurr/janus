// Simple portfolio strategy manager
let currentStrategy = 'daily';
let dailyStrategy = null;
let weeklyStrategy = null;
let holdStrategy = null;

function initializePortfolio() {
  setupStrategyButtons();
  
  // Set daily as active by default
  const dailyBtn = document.getElementById('dailyBtn');
  if (dailyBtn) {
    dailyBtn.classList.add('active');
  }
  
  // Load daily strategy immediately
  loadStrategy('daily');
}

function loadStrategy(strategy) {
  currentStrategy = strategy;
  
  // Clear any existing content
  clearDisplay();
  
  switch(strategy) {
    case 'daily':
      if (!dailyStrategy) {
        dailyStrategy = new DailyStrategy();
      }
      dailyStrategy.loadData();
      break;
      
    case 'hold':
      if (!holdStrategy) {
        holdStrategy = new HoldStrategy();
      }
      holdStrategy.loadData();
      break;
      
    case 'weekly':
      if (!weeklyStrategy) {
        weeklyStrategy = new WeeklyStrategy();
      }
      // Ensure DOM elements are ready before loading data
      setTimeout(() => {
        weeklyStrategy.loadData();
      }, 100);
      break;
      
    default:
      showError('Unknown strategy: ' + strategy);
  }
}

function clearDisplay() {
  // Clear chart area
  const chartContainer = document.querySelector('.chart-container');
  if (chartContainer) {
    chartContainer.innerHTML = '<canvas id="portfolioChart"></canvas>';
  }
  
  // Clear legend
  const legendContainer = document.getElementById('legendControls');
  if (legendContainer) {
    legendContainer.innerHTML = '';
  }
  
  // Clear total value
  const totalValueEl = document.getElementById('totalValue');
  if (totalValueEl) {
    totalValueEl.textContent = 'Loading...';
  }
  
  // Clear current data
  const currentDataEl = document.getElementById('currentData');
  if (currentDataEl) {
    currentDataEl.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Loading...</div>';
  }
}

function showPlaceholder(title, message) {
  const totalValueEl = document.getElementById('totalValue');
  const currentDataEl = document.getElementById('currentData');
  
  if (totalValueEl) {
    totalValueEl.textContent = 'Coming Soon';
  }
  
  if (currentDataEl) {
    currentDataEl.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <h3 style="color: #1976d2; margin-bottom: 15px;">${title}</h3>
        <p style="color: #666; line-height: 1.5;">${message}</p>
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #1976d2;">
          <strong>Architecture:</strong> Each strategy will be completely self-contained with its own:
          <ul style="text-align: left; margin: 10px 0; padding-left: 20px;">
            <li>Database table (e.g., hold_positions, weekly_positions)</li>
            <li>API endpoints (e.g., /api/hold/, /api/weekly/)</li>
            <li>Frontend module (e.g., hold-strategy.js, weekly-strategy.js)</li>
          </ul>
        </div>
      </div>
    `;
  }
  
  // Clear chart
  const chartContainer = document.querySelector('.chart-container');
  if (chartContainer) {
    chartContainer.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 500px; color: #999; font-size: 18px;">
        ${title} Chart Coming Soon
      </div>
    `;
  }
}

function showError(message) {
  const main = document.querySelector('.main');
  if (main) {
    main.innerHTML = `<div class="error">${message}</div>`;
  }
}

function setupStrategyButtons() {
  const buttons = document.querySelectorAll('.strategy-btn');
  
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      buttons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      button.classList.add('active');
      
      // Load the selected strategy
      const strategy = button.dataset.strategy;
      loadStrategy(strategy);
    });
  });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializePortfolio);