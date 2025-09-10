class WeeklyStrategy {
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
        fetch('/api/weekly/status'),
        fetch('/api/weekly/performance'),
        fetch('/api/weekly/assets')
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
      console.error('Error loading weekly strategy data:', error);
      this.showError(`Failed to load weekly strategy data: ${error.message}`);
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
        label: 'Weekly Strategy Total',
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
        chartContainer.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 500px; color: #666;">No weekly strategy performance data available</div>';
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
              text: 'Cumulative P&L ($)'
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
    
    if (!data || (!data.cashPosition && data.equityPositions.length === 0)) {
      totalValueEl.textContent = 'No data';
      currentDataEl.innerHTML = '<div class="error">No weekly strategy data available</div>';
      return;
    }
    
    // Calculate total portfolio value (cash + equity positions)
    const cashValue = data.cashPosition ? data.cashPosition.netPosition : 0;
    // For weekly strategy, equity positions might be held, so we need current market values
    const equityValue = data.equityPositions.reduce((sum, pos) => {
      return sum + (pos.netPosition * this.getLatestPrice(pos.symbol));
    }, 0);
    const totalValue = cashValue + equityValue;
    
    totalValueEl.textContent = '$' + totalValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // Create status display
    let statusHtml = `
      <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">Weekly Strategy Status</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <strong>Current Week:</strong> ${data.weekStart}<br>
            <strong>Holdings:</strong> ${data.totalPositions} positions
          </div>
          <div>
            <strong>Cash (USDW):</strong> $${cashValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}<br>
            <strong>Equity Value:</strong> $${equityValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    `;
    
    // Get asset performance data for the table
    const assetPerformance = this.getAssetPerformanceForTable(data);
    
    if (assetPerformance.length > 0) {
      statusHtml += `
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333;">Asset Performance</h3>
        <table style="margin-bottom: 20px;">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Trading Days</th>
              <th>Cumulative P&L</th>
              <th>Last Trade Date</th>
            </tr>
          </thead>
          <tbody>
            ${assetPerformance.map(asset => {
              const pnlClass = asset.cumulativePnL >= 0 ? 'pnl-positive' : 'pnl-negative';
              const sign = asset.cumulativePnL >= 0 ? '+' : '';
              return `
                <tr>
                  <td style="font-weight: 500;">${asset.symbol}</td>
                  <td class="value-cell" style="font-size: 12px; color: #666;">${asset.tradingDays}</td>
                  <td class="value-cell ${pnlClass}">${sign}$${asset.cumulativePnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style="font-size: 12px; color: #666;">${asset.lastTradeDate}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } else {
      statusHtml += '<div style="color: #666; font-style: italic; margin: 20px 0;">No asset performance data available</div>';
    }
    
    currentDataEl.innerHTML = statusHtml;
  }

  getAssetPerformanceForTable(statusData) {
    // Get cumulative P&L from the assets data if available
    if (!this.allData.assets || !this.allData.assets.assets) {
      return [];
    }
    
    return this.allData.assets.assets.map(asset => ({
      symbol: asset.symbol,
      cumulativePnL: asset.netPnL,
      tradingDays: asset.tradingDays,
      lastTradeDate: new Date(asset.lastTradeDate).toLocaleDateString()
    })).sort((a, b) => b.cumulativePnL - a.cumulativePnL); // Sort by P&L descending
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
        <h4 style="margin: 0; font-size: 14px; color: #555;">Weekly Asset Performance</h4>
        <div style="font-size: 12px; color: #666;">
          Total P&L: <span style="color: ${data.summary.totalNetPnL >= 0 ? '#2e7d32' : '#d32f2f'}; font-weight: 600;">
            $${data.summary.totalNetPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
      <select id="assetSelector" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px;">
        <option value="">Select an asset to view details...</option>
        ${sortedAssets.map(asset => `
          <option value="${asset.symbol}">
            ${asset.symbol} - ${asset.netPnL >= 0 ? '+' : ''}$${asset.netPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            ${asset.isCurrentlyHeld ? ' (Held)' : ' (Closed)'}
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
            <span style="color: #666;">Status: ${asset.isCurrentlyHeld ? 'Currently Held' : 'Position Closed'}</span>
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
            Shares Bought: ${asset.totalSharesBought.toLocaleString()}<br>
            Shares Sold: ${asset.totalSharesSold.toLocaleString()}<br>
            Current Position: ${asset.currentPosition.toLocaleString()}
          </div>
          <div>
            <strong>Value Activity:</strong><br>
            Total Bought: $${asset.totalBuyValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}<br>
            Total Sold: $${asset.totalSellValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}<br>
            Trading Days: ${asset.tradingDays}
          </div>
        </div>
        
        <div style="margin-top: 15px; font-size: 13px; color: #666;">
          <strong>Trading Period:</strong> 
          ${new Date(asset.firstTradeDate).toLocaleDateString()} - ${new Date(asset.lastTradeDate).toLocaleDateString()}
        </div>
      </div>
    `;
  }

  getLatestPrice(symbol) {
    // Placeholder - in real implementation, get from daily_prices or live feed
    // For now, return 1.0 as fallback
    return 1.0;
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
      const resp = await fetch(`/api/weekly/execution/${date}`);
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
window.WeeklyStrategy = WeeklyStrategy;