class HoldStrategy {
  constructor() {
    this.chart = null;
    this.chartData = {};
    this.allData = {};
    this.colors = [
      '#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2',
      '#c2185b', '#00796b', '#5d4037', '#455a64', '#e65100'
    ];
  }

  async loadData() {
    try {
      const [statusResp, performanceResp, assetsResp] = await Promise.all([
        fetch('/api/hold/status'),
        fetch('/api/hold/performance'),
        fetch('/api/hold/assets')
      ]);
      
      if (!statusResp.ok) {
        throw new Error(`Status API error: ${statusResp.statusText}`);
      }
      
      if (!performanceResp.ok) {
        throw new Error(`Performance API error: ${performanceResp.statusText}`);
      }
      
      if (!assetsResp.ok) {
        throw new Error(`Assets API error: ${assetsResp.statusText}`);
      }
      
      const statusData = await statusResp.json();
      const performanceData = await performanceResp.json();
      const assetsData = await assetsResp.json();
      
      this.allData = {
        status: statusData,
        performance: performanceData,
        assets: assetsData
      };
      
      this.render();
      
    } catch (error) {
      console.error('Error loading hold strategy data:', error);
      this.showError(`Failed to load hold strategy data: ${error.message}`);
    }
  }

  render() {
    this.renderChart(this.allData.performance);
    this.renderStatus(this.allData.status);
    this.renderAssetDropdown(this.allData.assets);
    this.updateLastUpdated();
  }

  renderChart(data) {
    const canvas = document.getElementById('portfolioChart');
    if (!canvas) {
      console.error('Portfolio chart canvas not found');
      return;
    }
    const ctx = canvas.getContext('2d');
    
    const datasets = [];
    
    // Add portfolio total dataset
    if (data.portfolioTotals && data.portfolioTotals.length > 0) {
      datasets.push({
        label: 'Hold Strategy Total',
        data: data.portfolioTotals.map(item => ({
          x: item.date,
          y: item.total
        })),
        borderColor: this.colors[0],
        backgroundColor: this.colors[0] + '20',
        borderWidth: 3,
        fill: false,
        tension: 0.1
      });
    }
    
    // Add individual asset datasets
    if (data.symbols && data.symbols.length > 0) {
      data.symbols.forEach((symbol, index) => {
        datasets.push({
          label: `${symbol} P&L`,
          data: data.assetData[symbol].map(item => ({
            x: item.date,
            y: item.cumulativePnL || 0
          })),
          borderColor: this.colors[(index + 1) % this.colors.length],
          backgroundColor: this.colors[(index + 1) % this.colors.length] + '20',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          hidden: true // Hide individual assets by default
        });
      });
    }
    
    this.chartData = { datasets };
    
    // Create chart
    if (this.chart) {
      this.chart.destroy();
    }
    
    if (datasets.length === 0) {
      const chartContainer = document.querySelector('.chart-container');
      if (chartContainer) {
        chartContainer.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 500px; color: #666;">No hold strategy performance data available</div>';
      }
      return;
    }
    
    this.chart = new Chart(ctx, {
      type: 'line',
      data: this.chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                const sign = context.parsed.y >= 0 ? '+' : '';
                return `${context.dataset.label}: ${sign}$${context.parsed.y.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}`;
              }
            }
          }
        },
        scales: {
          x: {
            type: data.portfolioTotals && data.portfolioTotals.length > 1 ? 'time' : 'category',
            time: data.portfolioTotals && data.portfolioTotals.length > 1 ? {
              parser: 'yyyy-MM-dd',
              displayFormats: {
                day: 'MMM dd',
                week: 'MMM dd',
                month: 'MMM yyyy'
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
              text: 'Portfolio Value ($)'
            },
            ticks: {
              callback: function(value) {
                const sign = value >= 0 ? '+' : '';
                return sign + '$' + value.toLocaleString('en-US');
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
    
    this.createLegend();
  }

  createLegend() {
    const legendContainer = document.getElementById('legendControls');
    legendContainer.innerHTML = '';
    
    if (!this.chartData.datasets || this.chartData.datasets.length === 0) {
      return;
    }
    
    this.chartData.datasets.forEach((dataset, index) => {
      const legendItem = document.createElement('div');
      legendItem.className = `legend-item ${!dataset.hidden ? 'active' : ''}`;
      legendItem.onclick = () => this.toggleDataset(index);
      
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

  toggleDataset(index) {
    const dataset = this.chart.data.datasets[index];
    const legendItem = document.querySelectorAll('.legend-item')[index];
    
    dataset.hidden = !dataset.hidden;
    
    if (dataset.hidden) {
      legendItem.classList.remove('active');
    } else {
      legendItem.classList.add('active');
    }
    
    this.chart.update();
  }

  renderStatus(data) {
    const totalValueEl = document.getElementById('totalValue');
    const currentDataEl = document.getElementById('currentData');
    
    if (!totalValueEl || !currentDataEl) {
      console.error('Portfolio status elements not found');
      return;
    }
    
    if (!data || (!data.cashPosition && (!data.equityPositions || data.equityPositions.length === 0))) {
      totalValueEl.textContent = 'No data';
      currentDataEl.innerHTML = '<div class="error">No hold strategy data available</div>';
      return;
    }
    
    // Calculate total portfolio value (cash + equity positions with current prices)
    const cashValue = data.cashPosition ? (data.cashPosition.netPosition || 0) : 0;
    const equityValue = (data.equityPositions || []).reduce((sum, pos) => {
      return sum + (pos.currentValue || 0);
    }, 0);
    const totalValue = cashValue + equityValue;
    
    totalValueEl.textContent = '$' + totalValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // Create status display
    let statusHtml = `
      <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">Hold Strategy Status</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <strong>Last Rebalance:</strong> ${data.lastRebalanceDate || 'Never'}<br>
            <strong>Holdings:</strong> ${data.totalPositions || 0} positions
          </div>
          <div>
            <strong>Cash (USDH):</strong> $${cashValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}<br>
            <strong>Equity Value:</strong> $${equityValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    `;
    
    // Add current holdings table
    if (data.equityPositions && data.equityPositions.length > 0) {
      statusHtml += `
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333;">Current Holdings</h3>
        <table style="margin-bottom: 20px;">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Shares</th>
              <th>Avg Cost</th>
              <th>Current Value</th>
              <th>Unrealized P&L</th>
              <th>Allocation</th>
            </tr>
          </thead>
          <tbody>
            ${data.equityPositions.map(position => {
              const pnlClass = (position.unrealizedPnL || 0) >= 0 ? 'pnl-positive' : 'pnl-negative';
              const sign = (position.unrealizedPnL || 0) >= 0 ? '+' : '';
              const allocation = totalValue > 0 ? ((position.currentValue || 0) / totalValue * 100).toFixed(1) : 0;
              return `
                <tr>
                  <td style="font-weight: 500;">${position.symbol}</td>
                  <td class="value-cell">${(position.netShares || 0).toLocaleString('en-US', { minimumFractionDigits: 4 })}</td>
                  <td class="value-cell">$${(position.avgCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td class="value-cell">$${(position.currentValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td class="value-cell ${pnlClass}">${sign}$${(position.unrealizedPnL || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td class="value-cell" style="font-size: 12px; color: #666;">${allocation}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } else {
      statusHtml += '<div style="color: #666; font-style: italic; margin: 20px 0;">No current equity holdings</div>';
    }
    
    currentDataEl.innerHTML = statusHtml;
  }

  renderAssetDropdown(data) {
    if (!data || !data.assets) return;
    
    // Find a place to put the asset dropdown - add it to the summary panel
    const summaryPanel = document.querySelector('.summary-panel');
    if (!summaryPanel) return;
    
    // Check if dropdown already exists
    let assetDropdownContainer = document.getElementById('assetDropdownContainer');
    if (!assetDropdownContainer) {
      assetDropdownContainer = document.createElement('div');
      assetDropdownContainer.id = 'assetDropdownContainer';
      assetDropdownContainer.style.cssText = 'margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px;';
      
      // Insert after the total value but before current data
      const totalValueEl = document.getElementById('totalValue');
      if (totalValueEl) {
        totalValueEl.parentNode.insertBefore(assetDropdownContainer, totalValueEl.nextSibling);
      } else {
        summaryPanel.insertBefore(assetDropdownContainer, summaryPanel.firstChild);
      }
    }
    
    // Create dropdown HTML
    const sortedAssets = [...data.assets].sort((a, b) => b.netPnL - a.netPnL);
    
    assetDropdownContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h4 style="margin: 0; font-size: 14px; color: #555;">Hold Asset Performance</h4>
        <div style="font-size: 12px; color: #666;">
          Total P&L: <span style="color: ${data.summary.totalNetPnL >= 0 ? '#2e7d32' : '#d32f2f'}; font-weight: 600;">
            ${data.summary.totalNetPnL >= 0 ? '+' : ''}$${data.summary.totalNetPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
      <select id="assetSelector" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px;">
        <option value="">Select an asset to view details...</option>
        ${sortedAssets.map(asset => `
          <option value="${asset.symbol}">
            ${asset.symbol} - ${asset.netPnL >= 0 ? '+' : ''}$${asset.netPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            ${asset.isCurrentlyHeld ? ' (Held)' : ' (Sold)'}
          </option>
        `).join('')}
      </select>
      <div id="assetDetails" style="min-height: 40px;"></div>
    `;
    
    // Add event listener for dropdown
    const assetSelector = document.getElementById('assetSelector');
    if (assetSelector) {
      assetSelector.addEventListener('change', (e) => {
        this.showAssetDetails(e.target.value, data.assets);
      });
    }
  }

  showAssetDetails(symbol, assets) {
    const assetDetailsEl = document.getElementById('assetDetails');
    if (!assetDetailsEl) return;
    
    if (!symbol) {
      assetDetailsEl.innerHTML = '';
      return;
    }
    
    const asset = assets.find(a => a.symbol === symbol);
    if (!asset) return;
    
    const pnlClass = asset.netPnL >= 0 ? 'pnl-positive' : 'pnl-negative';
    
    assetDetailsEl.innerHTML = `
      <div style="background: white; padding: 15px; border-radius: 4px; border: 1px solid #ddd;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
          <div>
            <strong>${symbol}</strong><br>
            <span style="color: #666;">Status: ${asset.isCurrentlyHeld ? 'Currently Held' : 'Position Sold'}</span>
          </div>
          <div style="text-align: right;">
            <div class="${pnlClass}" style="font-size: 16px; font-weight: 600;">
              ${asset.netPnL >= 0 ? '+' : ''}$${asset.netPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
        
        <div style="margin-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 13px;">
          <div>
            <strong>Trading Activity:</strong><br>
            Total Buys: $${asset.totalBuyValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}<br>
            Total Sells: $${asset.totalSellValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}<br>
            Net Shares: ${asset.netShares.toLocaleString('en-US', { minimumFractionDigits: 4 })}
          </div>
          <div>
            <strong>Rebalancing History:</strong><br>
            Buy Transactions: ${asset.buyCount}<br>
            Sell Transactions: ${asset.sellCount}<br>
            Rebalancing Days: ${asset.rebalancingDays}
          </div>
        </div>
        
        <div style="margin-top: 15px; font-size: 13px; color: #666;">
          <strong>Trading Period:</strong> 
          ${new Date(asset.firstTradeDate).toLocaleDateString()} - ${new Date(asset.lastTradeDate).toLocaleDateString()}
        </div>
      </div>
    `;
  }

  updateLastUpdated() {
    const lastUpdatedEl = document.getElementById('lastUpdated');
    if (lastUpdatedEl) {
      lastUpdatedEl.textContent = new Date().toLocaleString();
    }
  }

  showError(message) {
    const main = document.querySelector('.main');
    if (main) {
      main.innerHTML = `<div class="error">${message}</div>`;
    }
  }

  async loadExecutionHistory(date) {
    try {
      const resp = await fetch(`/api/hold/execution/${date}`);
      if (!resp.ok) {
        throw new Error(`Execution API error: ${resp.statusText}`);
      }
      
      const data = await resp.json();
      return data;
    } catch (error) {
      console.error('Error loading execution history:', error);
      throw error;
    }
  }
}

// Export for use in portfolio.html
window.HoldStrategy = HoldStrategy;