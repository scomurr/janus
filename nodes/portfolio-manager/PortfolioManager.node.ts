import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

export class PortfolioManager implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Portfolio Manager',
    name: 'portfolioManager',
    icon: 'file:portfolio.svg',
    group: ['finance'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Manage trading portfolio operations',
    defaults: {
      name: 'Portfolio Manager',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Get Portfolio',
            value: 'getPortfolio',
            description: 'Get current portfolio state',
            action: 'Get current portfolio state',
          },
          {
            name: 'Add Position',
            value: 'addPosition',
            description: 'Add a new position to portfolio',
            action: 'Add a new position to portfolio',
          },
          {
            name: 'Update Position',
            value: 'updatePosition',
            description: 'Update an existing position',
            action: 'Update an existing position',
          },
          {
            name: 'Remove Position',
            value: 'removePosition',
            description: 'Remove a position from portfolio',
            action: 'Remove a position from portfolio',
          },
          {
            name: 'Calculate Risk',
            value: 'calculateRisk',
            description: 'Calculate portfolio risk metrics',
            action: 'Calculate portfolio risk metrics',
          },
          {
            name: 'Check Stop Losses',
            value: 'checkStopLosses',
            description: 'Check for stop loss triggers',
            action: 'Check for stop loss triggers',
          },
        ],
        default: 'getPortfolio',
      },
      {
        displayName: 'Data Source',
        name: 'dataSource',
        type: 'options',
        options: [
          {
            name: 'CSV File',
            value: 'csv',
          },
          {
            name: 'Database',
            value: 'database',
          },
          {
            name: 'API',
            value: 'api',
          },
        ],
        default: 'csv',
        description: 'Source of portfolio data',
      },
      {
        displayName: 'File Path',
        name: 'filePath',
        type: 'string',
        displayOptions: {
          show: {
            dataSource: ['csv'],
          },
        },
        default: '',
        placeholder: '/path/to/portfolio.csv',
        description: 'Path to portfolio CSV file',
      },
      {
        displayName: 'Ticker Symbol',
        name: 'ticker',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['addPosition', 'updatePosition', 'removePosition'],
          },
        },
        default: '',
        placeholder: 'AAPL',
        required: true,
        description: 'Ticker symbol for the position',
      },
      {
        displayName: 'Shares',
        name: 'shares',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['addPosition', 'updatePosition'],
          },
        },
        default: 0,
        required: true,
        description: 'Number of shares',
      },
      {
        displayName: 'Buy Price',
        name: 'buyPrice',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['addPosition'],
          },
        },
        default: 0,
        required: true,
        description: 'Price per share at purchase',
      },
      {
        displayName: 'Stop Loss',
        name: 'stopLoss',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['addPosition', 'updatePosition'],
          },
        },
        default: 0,
        description: 'Stop loss price per share',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;
    const dataSource = this.getNodeParameter('dataSource', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        let responseData;

        switch (operation) {
          case 'getPortfolio':
            responseData = await this.getPortfolio(dataSource, i);
            break;
          case 'addPosition':
            responseData = await this.addPosition(dataSource, i);
            break;
          case 'updatePosition':
            responseData = await this.updatePosition(dataSource, i);
            break;
          case 'removePosition':
            responseData = await this.removePosition(dataSource, i);
            break;
          case 'calculateRisk':
            responseData = await this.calculateRisk(dataSource, i);
            break;
          case 'checkStopLosses':
            responseData = await this.checkStopLosses(items[i].json);
            break;
          default:
            throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
        }

        returnData.push({
          json: responseData,
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error.message,
            },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }

  private async getPortfolio(dataSource: string, itemIndex: number): Promise<object> {
    if (dataSource === 'csv') {
      const filePath = this.getNodeParameter('filePath', itemIndex) as string;
      // In real implementation, read CSV file
      // For now, return mock data
      return {
        holdings: [
          {
            ticker: 'EXAMPLE',
            shares: 100,
            buy_price: 25.50,
            current_price: 27.25,
            stop_loss: 21.68,
            cost_basis: 2550,
            current_value: 2725,
            pnl: 175,
            percentage_change: 6.86
          }
        ],
        cash: 5000,
        total_equity: 7725,
        last_updated: new Date().toISOString()
      };
    } else {
      throw new NodeOperationError(this.getNode(), `Data source ${dataSource} not implemented`);
    }
  }

  private async addPosition(dataSource: string, itemIndex: number): Promise<object> {
    const ticker = this.getNodeParameter('ticker', itemIndex) as string;
    const shares = this.getNodeParameter('shares', itemIndex) as number;
    const buyPrice = this.getNodeParameter('buyPrice', itemIndex) as number;
    const stopLoss = this.getNodeParameter('stopLoss', itemIndex) as number;

    const costBasis = shares * buyPrice;

    return {
      action: 'ADD_POSITION',
      ticker: ticker.toUpperCase(),
      shares,
      buy_price: buyPrice,
      stop_loss: stopLoss,
      cost_basis: costBasis,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS'
    };
  }

  private async updatePosition(dataSource: string, itemIndex: number): Promise<object> {
    const ticker = this.getNodeParameter('ticker', itemIndex) as string;
    const shares = this.getNodeParameter('shares', itemIndex) as number;
    const stopLoss = this.getNodeParameter('stopLoss', itemIndex) as number;

    return {
      action: 'UPDATE_POSITION',
      ticker: ticker.toUpperCase(),
      shares,
      stop_loss: stopLoss,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS'
    };
  }

  private async removePosition(dataSource: string, itemIndex: number): Promise<object> {
    const ticker = this.getNodeParameter('ticker', itemIndex) as string;

    return {
      action: 'REMOVE_POSITION',
      ticker: ticker.toUpperCase(),
      timestamp: new Date().toISOString(),
      status: 'SUCCESS'
    };
  }

  private async calculateRisk(dataSource: string, itemIndex: number): Promise<object> {
    // Get portfolio data
    const portfolio = await this.getPortfolio(dataSource, itemIndex);
    const holdings = (portfolio as any).holdings || [];
    const totalEquity = (portfolio as any).total_equity || 0;

    // Calculate risk metrics
    let totalRisk = 0;
    let maxPositionSize = 0;
    let stopLossExposure = 0;
    
    const positionRisks = holdings.map((holding: any) => {
      const positionValue = holding.current_value || 0;
      const positionWeight = totalEquity > 0 ? positionValue / totalEquity : 0;
      const stopLossRisk = holding.stop_loss > 0 ? 
        ((holding.current_price - holding.stop_loss) / holding.current_price) * positionValue : 0;
      
      totalRisk += stopLossRisk;
      maxPositionSize = Math.max(maxPositionSize, positionWeight);
      stopLossExposure += stopLossRisk;

      return {
        ticker: holding.ticker,
        position_weight: positionWeight,
        stop_loss_risk: stopLossRisk,
        risk_level: positionWeight > 0.20 ? 'HIGH' : positionWeight > 0.10 ? 'MEDIUM' : 'LOW'
      };
    });

    return {
      total_portfolio_risk: totalRisk,
      max_position_weight: maxPositionSize,
      stop_loss_exposure: stopLossExposure,
      position_risks: positionRisks,
      risk_level: maxPositionSize > 0.25 ? 'HIGH' : maxPositionSize > 0.15 ? 'MEDIUM' : 'LOW',
      diversification_score: holdings.length >= 10 ? 'GOOD' : holdings.length >= 5 ? 'FAIR' : 'POOR',
      timestamp: new Date().toISOString()
    };
  }

  private async checkStopLosses(inputData: any): Promise<object> {
    const priceData = inputData.price_data || [];
    const holdings = inputData.holdings || [];

    const stopLossAlerts = [];
    const priceMap = {};

    // Create price lookup
    priceData.forEach((item: any) => {
      if (item.ticker && item.currentPrice) {
        priceMap[item.ticker] = item.currentPrice;
      }
    });

    // Check stop losses
    holdings.forEach((holding: any) => {
      const ticker = holding.ticker;
      const stopLoss = parseFloat(holding.stop_loss) || 0;
      const currentPrice = priceMap[ticker];

      if (stopLoss > 0 && currentPrice && currentPrice <= stopLoss) {
        const shares = parseFloat(holding.shares) || 0;
        const buyPrice = parseFloat(holding.buy_price) || 0;
        const pnl = (currentPrice - buyPrice) * shares;

        stopLossAlerts.push({
          ticker,
          trigger_price: currentPrice,
          stop_loss: stopLoss,
          shares,
          estimated_pnl: pnl,
          recommendation: 'SELL_AT_MARKET',
          timestamp: new Date().toISOString()
        });
      }
    });

    return {
      stop_loss_alerts: stopLossAlerts,
      alert_count: stopLossAlerts.length,
      timestamp: new Date().toISOString()
    };
  }
}