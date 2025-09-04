import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

export class YahooFinance implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Yahoo Finance',
    name: 'yahooFinance',
    icon: 'file:yahoo.svg',
    group: ['finance'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Fetch financial data from Yahoo Finance',
    defaults: {
      name: 'Yahoo Finance',
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
            name: 'Get Quote',
            value: 'getQuote',
            description: 'Get current quote for a ticker',
            action: 'Get current quote for a ticker',
          },
          {
            name: 'Get Historical Data',
            value: 'getHistorical',
            description: 'Get historical price data',
            action: 'Get historical price data for a ticker',
          },
          {
            name: 'Get Multiple Quotes',
            value: 'getMultipleQuotes',
            description: 'Get quotes for multiple tickers',
            action: 'Get quotes for multiple tickers',
          },
        ],
        default: 'getQuote',
      },
      {
        displayName: 'Ticker Symbol',
        name: 'ticker',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['getQuote', 'getHistorical'],
          },
        },
        default: '',
        placeholder: 'AAPL',
        required: true,
        description: 'The ticker symbol to fetch data for',
      },
      {
        displayName: 'Ticker Symbols',
        name: 'tickers',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['getMultipleQuotes'],
          },
        },
        default: '',
        placeholder: 'AAPL,MSFT,GOOGL',
        required: true,
        description: 'Comma-separated list of ticker symbols',
      },
      {
        displayName: 'Period',
        name: 'period',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['getHistorical'],
          },
        },
        options: [
          {
            name: '1 Day',
            value: '1d',
          },
          {
            name: '5 Days',
            value: '5d',
          },
          {
            name: '1 Month',
            value: '1mo',
          },
          {
            name: '3 Months',
            value: '3mo',
          },
          {
            name: '6 Months',
            value: '6mo',
          },
          {
            name: '1 Year',
            value: '1y',
          },
          {
            name: '2 Years',
            value: '2y',
          },
          {
            name: '5 Years',
            value: '5y',
          },
        ],
        default: '1mo',
        description: 'Time period for historical data',
      },
      {
        displayName: 'Interval',
        name: 'interval',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['getHistorical'],
          },
        },
        options: [
          {
            name: '1 Minute',
            value: '1m',
          },
          {
            name: '5 Minutes',
            value: '5m',
          },
          {
            name: '15 Minutes',
            value: '15m',
          },
          {
            name: '1 Hour',
            value: '1h',
          },
          {
            name: '1 Day',
            value: '1d',
          },
          {
            name: '1 Week',
            value: '1wk',
          },
          {
            name: '1 Month',
            value: '1mo',
          },
        ],
        default: '1d',
        description: 'Data interval for historical data',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        let responseData;

        if (operation === 'getQuote') {
          const ticker = this.getNodeParameter('ticker', i) as string;
          responseData = await this.fetchQuote(ticker);
        } else if (operation === 'getHistorical') {
          const ticker = this.getNodeParameter('ticker', i) as string;
          const period = this.getNodeParameter('period', i) as string;
          const interval = this.getNodeParameter('interval', i) as string;
          responseData = await this.fetchHistorical(ticker, period, interval);
        } else if (operation === 'getMultipleQuotes') {
          const tickersParam = this.getNodeParameter('tickers', i) as string;
          const tickers = tickersParam.split(',').map(t => t.trim());
          responseData = await this.fetchMultipleQuotes(tickers);
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

  private async fetchQuote(ticker: string): Promise<object> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
    const response = await this.helpers.request({
      method: 'GET',
      url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const data = JSON.parse(response);
    const chart = data.chart?.result?.[0];
    
    if (!chart) {
      throw new NodeOperationError(this.getNode(), 'No data available for ticker');
    }

    const meta = chart.meta;
    const quotes = chart.indicators?.quote?.[0];
    const timestamps = chart.timestamp || [];
    const latest = timestamps.length - 1;

    if (latest < 0) {
      throw new NodeOperationError(this.getNode(), 'No price data available');
    }

    const currentPrice = quotes?.close?.[latest];
    const previousPrice = latest > 0 ? quotes?.close?.[latest - 1] : currentPrice;
    const percentChange = previousPrice ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0;

    return {
      ticker: ticker.toUpperCase(),
      currentPrice,
      open: quotes?.open?.[latest],
      high: quotes?.high?.[latest],
      low: quotes?.low?.[latest],
      volume: quotes?.volume?.[latest],
      percentChange,
      previousClose: previousPrice,
      timestamp: new Date(timestamps[latest] * 1000).toISOString(),
      currency: meta.currency,
      marketState: meta.marketState,
      regularMarketTime: new Date(meta.regularMarketTime * 1000).toISOString(),
    };
  }

  private async fetchHistorical(ticker: string, period: string, interval: string): Promise<object> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=0&period2=9999999999&interval=${interval}&range=${period}`;
    const response = await this.helpers.request({
      method: 'GET',
      url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const data = JSON.parse(response);
    const chart = data.chart?.result?.[0];
    
    if (!chart) {
      throw new NodeOperationError(this.getNode(), 'No historical data available');
    }

    const quotes = chart.indicators?.quote?.[0];
    const timestamps = chart.timestamp || [];
    const historicalData = timestamps.map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      open: quotes?.open?.[index],
      high: quotes?.high?.[index],
      low: quotes?.low?.[index],
      close: quotes?.close?.[index],
      volume: quotes?.volume?.[index],
    }));

    return {
      ticker: ticker.toUpperCase(),
      period,
      interval,
      data: historicalData,
      meta: chart.meta,
    };
  }

  private async fetchMultipleQuotes(tickers: string[]): Promise<object> {
    const quotes = await Promise.all(
      tickers.map(async (ticker) => {
        try {
          return await this.fetchQuote(ticker);
        } catch (error) {
          return {
            ticker: ticker.toUpperCase(),
            error: error.message,
          };
        }
      })
    );

    return {
      quotes,
      count: quotes.length,
      timestamp: new Date().toISOString(),
    };
  }
}