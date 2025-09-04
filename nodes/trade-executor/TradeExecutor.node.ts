import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

export class TradeExecutor implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Trade Executor',
    name: 'tradeExecutor',
    icon: 'file:trade.svg',
    group: ['finance'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Execute and simulate trading operations',
    defaults: {
      name: 'Trade Executor',
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
            name: 'Execute Trades',
            value: 'executeTrades',
            description: 'Execute a list of trades',
            action: 'Execute a list of trades',
          },
          {
            name: 'Simulate Trades',
            value: 'simulateTrades',
            description: 'Simulate trades without execution',
            action: 'Simulate trades without execution',
          },
          {
            name: 'Validate Trade',
            value: 'validateTrade',
            description: 'Validate a single trade',
            action: 'Validate a single trade',
          },
          {
            name: 'Calculate Position Size',
            value: 'calculatePositionSize',
            description: 'Calculate optimal position size',
            action: 'Calculate optimal position size',
          },
        ],
        default: 'simulateTrades',
      },
      {
        displayName: 'Execution Mode',
        name: 'executionMode',
        type: 'options',
        options: [
          {
            name: 'Paper Trading',
            value: 'paper',
            description: 'Simulate trades only',
          },
          {
            name: 'Live Trading',
            value: 'live',
            description: 'Execute real trades',
          },
        ],
        default: 'paper',
        description: 'Choose execution mode',
      },
      {
        displayName: 'Risk Management',
        name: 'riskManagement',
        type: 'boolean',
        default: true,
        description: 'Whether to apply risk management rules',
      },
      {
        displayName: 'Max Position Size (%)',
        name: 'maxPositionSize',
        type: 'number',
        default: 20,
        description: 'Maximum position size as percentage of portfolio',
        displayOptions: {
          show: {
            riskManagement: [true],
          },
        },
      },
      {
        displayName: 'Stop Loss Required',
        name: 'stopLossRequired',
        type: 'boolean',
        default: true,
        description: 'Whether stop losses are required for new positions',
        displayOptions: {
          show: {
            riskManagement: [true],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;
    const executionMode = this.getNodeParameter('executionMode', 0) as string;
    const riskManagement = this.getNodeParameter('riskManagement', 0) as boolean;

    for (let i = 0; i < items.length; i++) {
      try {
        let responseData;

        switch (operation) {
          case 'executeTrades':
            responseData = await this.executeTrades(items[i].json, executionMode, riskManagement, i);
            break;
          case 'simulateTrades':
            responseData = await this.simulateTrades(items[i].json, riskManagement, i);
            break;
          case 'validateTrade':
            responseData = await this.validateTrade(items[i].json, riskManagement, i);
            break;
          case 'calculatePositionSize':
            responseData = await this.calculatePositionSize(items[i].json, i);
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

  private async executeTrades(inputData: any, executionMode: string, riskManagement: boolean, itemIndex: number): Promise<object> {
    const trades = inputData.trades || [];
    const portfolio = inputData.portfolio || { cash: 0, total_equity: 0 };
    
    let cash = parseFloat(portfolio.cash) || 0;
    const totalEquity = parseFloat(portfolio.total_equity) || 0;
    const maxPositionSize = this.getNodeParameter('maxPositionSize', itemIndex) as number;
    const stopLossRequired = this.getNodeParameter('stopLossRequired', itemIndex) as boolean;

    const executedTrades = [];
    const rejectedTrades = [];

    for (const trade of trades) {
      const validation = await this.validateSingleTrade(trade, cash, totalEquity, riskManagement, maxPositionSize, stopLossRequired);
      
      if (validation.valid) {
        if (executionMode === 'live') {
          // In real implementation, execute actual trade via broker API
          const execution = await this.executeLiveTrade(trade);
          executedTrades.push({
            ...trade,
            ...execution,
            status: 'EXECUTED',
            execution_mode: 'live',
            timestamp: new Date().toISOString()
          });
        } else {
          // Paper trading simulation
          const execution = this.simulateTrade(trade, cash);
          executedTrades.push({
            ...trade,
            ...execution,
            status: 'SIMULATED',
            execution_mode: 'paper',
            timestamp: new Date().toISOString()
          });
          
          // Update cash for simulation
          if (trade.action.toLowerCase() === 'buy') {
            cash -= execution.cost || 0;
          } else if (trade.action.toLowerCase() === 'sell') {
            cash += execution.proceeds || 0;
          }
        }
      } else {
        rejectedTrades.push({
          ...trade,
          status: 'REJECTED',
          rejection_reason: validation.reason,
          timestamp: new Date().toISOString()
        });
      }
    }

    return {
      executed_trades: executedTrades,
      rejected_trades: rejectedTrades,
      execution_summary: {
        total_trades: trades.length,
        executed_count: executedTrades.length,
        rejected_count: rejectedTrades.length,
        remaining_cash: cash,
        execution_mode: executionMode
      },
      timestamp: new Date().toISOString()
    };
  }

  private async simulateTrades(inputData: any, riskManagement: boolean, itemIndex: number): Promise<object> {
    // Force paper trading mode for simulation
    return this.executeTrades(inputData, 'paper', riskManagement, itemIndex);
  }

  private async validateTrade(inputData: any, riskManagement: boolean, itemIndex: number): Promise<object> {
    const trade = inputData.trade || inputData;
    const portfolio = inputData.portfolio || { cash: 0, total_equity: 0 };
    
    const cash = parseFloat(portfolio.cash) || 0;
    const totalEquity = parseFloat(portfolio.total_equity) || 0;
    const maxPositionSize = this.getNodeParameter('maxPositionSize', itemIndex) as number;
    const stopLossRequired = this.getNodeParameter('stopLossRequired', itemIndex) as boolean;

    const validation = await this.validateSingleTrade(trade, cash, totalEquity, riskManagement, maxPositionSize, stopLossRequired);

    return {
      trade,
      validation,
      timestamp: new Date().toISOString()
    };
  }

  private async calculatePositionSize(inputData: any, itemIndex: number): Promise<object> {
    const trade = inputData.trade || inputData;
    const portfolio = inputData.portfolio || { cash: 0, total_equity: 0 };
    
    const cash = parseFloat(portfolio.cash) || 0;
    const totalEquity = parseFloat(portfolio.total_equity) || 0;
    const price = parseFloat(trade.price) || 0;
    const maxPositionSize = this.getNodeParameter('maxPositionSize', itemIndex) as number;

    if (price <= 0) {
      throw new NodeOperationError(this.getNode(), 'Invalid price for position size calculation');
    }

    // Calculate maximum shares based on available cash
    const maxSharesByCash = Math.floor(cash / price);
    
    // Calculate maximum shares based on position size limit
    const maxPositionValue = totalEquity * (maxPositionSize / 100);
    const maxSharesByPosition = Math.floor(maxPositionValue / price);
    
    // Take the smaller of the two
    const recommendedShares = Math.min(maxSharesByCash, maxSharesByPosition);
    const recommendedValue = recommendedShares * price;
    const positionWeight = totalEquity > 0 ? (recommendedValue / totalEquity) * 100 : 0;

    return {
      ticker: trade.ticker,
      price,
      recommended_shares: recommendedShares,
      recommended_value: recommendedValue,
      position_weight_percent: positionWeight,
      max_shares_by_cash: maxSharesByCash,
      max_shares_by_position_limit: maxSharesByPosition,
      available_cash: cash,
      total_equity: totalEquity,
      timestamp: new Date().toISOString()
    };
  }

  private async validateSingleTrade(trade: any, cash: number, totalEquity: number, riskManagement: boolean, maxPositionSize: number, stopLossRequired: boolean): Promise<{ valid: boolean; reason?: string }> {
    const action = trade.action?.toLowerCase();
    const ticker = trade.ticker;
    const shares = parseFloat(trade.shares) || 0;
    const price = parseFloat(trade.price) || parseFloat(trade.price_target) || 0;
    const stopLoss = parseFloat(trade.stop_loss) || 0;

    // Basic validation
    if (!action || !ticker || shares <= 0 || price <= 0) {
      return { valid: false, reason: 'Invalid trade parameters' };
    }

    if (action === 'buy') {
      const cost = shares * price;
      
      // Check available cash
      if (cost > cash) {
        return { valid: false, reason: `Insufficient cash: need $${cost.toFixed(2)}, have $${cash.toFixed(2)}` };
      }

      if (riskManagement) {
        // Check position size limit
        const positionWeight = totalEquity > 0 ? (cost / totalEquity) * 100 : 0;
        if (positionWeight > maxPositionSize) {
          return { valid: false, reason: `Position size ${positionWeight.toFixed(1)}% exceeds limit of ${maxPositionSize}%` };
        }

        // Check stop loss requirement
        if (stopLossRequired && stopLoss <= 0) {
          return { valid: false, reason: 'Stop loss is required for new positions' };
        }

        // Check stop loss is reasonable (not above current price)
        if (stopLoss > 0 && stopLoss >= price) {
          return { valid: false, reason: 'Stop loss must be below current price' };
        }
      }
    }

    return { valid: true };
  }

  private simulateTrade(trade: any, currentCash: number): object {
    const action = trade.action?.toLowerCase();
    const shares = parseFloat(trade.shares) || 0;
    const price = parseFloat(trade.price) || parseFloat(trade.price_target) || 0;

    if (action === 'buy') {
      const cost = shares * price;
      return {
        cost,
        shares_bought: shares,
        avg_price: price,
        total_cost: cost,
        remaining_cash: currentCash - cost
      };
    } else if (action === 'sell') {
      const proceeds = shares * price;
      return {
        proceeds,
        shares_sold: shares,
        avg_price: price,
        total_proceeds: proceeds,
        remaining_cash: currentCash + proceeds
      };
    }

    return {};
  }

  private async executeLiveTrade(trade: any): Promise<object> {
    // In a real implementation, this would connect to a broker API
    // For now, return simulation data with live execution markers
    const simulation = this.simulateTrade(trade, 0);
    
    return {
      ...simulation,
      execution_id: `LIVE_${Date.now()}`,
      broker: 'SIMULATION_BROKER',
      execution_time: new Date().toISOString(),
      note: 'This is a simulated live execution - replace with actual broker integration'
    };
  }
}