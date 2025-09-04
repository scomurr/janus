# Janus Setup Guide

This guide walks through setting up the Janus n8n trading automation system.

## Prerequisites

- Node.js 18+ and npm
- n8n installed globally or via Docker
- OpenAI API key
- Git (for version control)

## Installation

### 1. Install n8n

**Option A: Global Installation**
```bash
npm install n8n -g
```

**Option B: Docker**
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### 2. Install Custom Nodes

Navigate to your n8n custom nodes directory and install the Janus nodes:

```bash
# Create custom nodes directory
mkdir -p ~/.n8n/custom/nodes

# Copy Janus nodes
cp -r janus/nodes/* ~/.n8n/custom/nodes/

# Install dependencies for each node
cd ~/.n8n/custom/nodes/yahoo-finance
npm install

cd ~/.n8n/custom/nodes/portfolio-manager  
npm install

cd ~/.n8n/custom/nodes/trade-executor
npm install
```

### 3. Configure Environment

Copy and configure environment variables:

```bash
cp janus/config/environment.example .env
```

Edit `.env` with your settings:
- Set `OPENAI_API_KEY` with your OpenAI API key
- Configure `TRADING_MODE` (start with `paper`)
- Set portfolio and data paths
- Configure notification endpoints

### 4. Import Workflows

1. Start n8n:
   ```bash
   n8n start
   ```

2. Open n8n interface at `http://localhost:5678`

3. Import workflows:
   - Go to Workflows > Import from File
   - Import each workflow from `janus/workflows/`
   - Save and activate workflows

## Configuration

### Portfolio Data Source

**CSV Mode (Default)**
1. Create initial portfolio CSV:
   ```bash
   mkdir -p data
   touch data/portfolio.csv
   ```

2. Add CSV headers:
   ```csv
   Date,Ticker,Shares,Buy Price,Cost Basis,Stop Loss,Current Price,Total Value,PnL,Action,Cash Balance,Total Equity
   ```

**Database Mode**
1. Set `PORTFOLIO_DATA_SOURCE=database` in `.env`
2. Configure `DATABASE_URL`
3. Create database schema (see `data/` schemas)

### Workflow Schedules

Default schedules (configurable in workflows):
- **Daily Trading**: 9:00 AM EST, Monday-Friday
- **Price Monitoring**: Every 15 minutes, 9 AM-4 PM EST
- **Weekly Research**: 8:00 AM EST, Mondays

## Testing

### 1. Paper Trading Mode

Start with paper trading to test the system:
1. Set `TRADING_MODE=paper` in environment
2. Set `MOCK_TRADES=true` for testing
3. Run workflows manually first

### 2. Validate Workflows

Test each workflow individually:

**Daily Trading Workflow**
1. Trigger manually from n8n interface
2. Check execution logs
3. Verify LLM responses and trade logic
4. Confirm portfolio updates

**Price Monitoring Workflow**
1. Enable and let run for a few cycles
2. Check price data accuracy
3. Test stop-loss alerts (if any positions)

**Weekly Research Workflow**
1. Trigger manually first
2. Review research output quality
3. Check trade recommendations

### 3. Monitor Logs

Check n8n execution logs:
- Workflow execution status
- Error messages and stack traces
- Custom node performance
- API response times

## Security

### API Keys
- Store all API keys in environment variables
- Use `.env` file (never commit to version control)
- Rotate keys regularly

### Access Control
- Secure n8n interface with authentication
- Use HTTPS in production
- Restrict network access to n8n port

### Data Protection
- Backup portfolio data regularly
- Encrypt sensitive configuration
- Use secure database connections

## Production Deployment

### Environment Setup
1. Use production-grade environment (not development)
2. Set `DEBUG_MODE=false`
3. Configure proper logging levels
4. Set up monitoring and alerting

### Reliability
1. Configure workflow error handling
2. Set up retry policies for external APIs
3. Implement fallback data sources
4. Monitor system health

### Scaling
1. Consider n8n clustering for high availability
2. Use database for portfolio data at scale  
3. Implement proper rate limiting
4. Monitor resource usage

## Troubleshooting

### Common Issues

**Workflow Won't Start**
- Check n8n service status
- Verify custom nodes are installed
- Check environment variables
- Review workflow configuration

**API Failures**
- Verify API keys are correct
- Check API rate limits
- Test network connectivity
- Review error logs

**Data Issues**
- Validate data source configuration
- Check file permissions
- Verify database connections
- Review data schemas

**LLM Issues**
- Check OpenAI API key and quotas
- Review prompt formatting
- Validate response parsing
- Check model parameters

### Getting Help

1. Check n8n logs first: `~/.n8n/logs/`
2. Review workflow execution history
3. Test individual nodes in isolation
4. Validate configuration against schemas

## Next Steps

Once setup is complete:
1. Run in paper trading mode for several weeks
2. Monitor performance and accuracy
3. Fine-tune prompts and parameters
4. Consider live trading (with appropriate risk management)
5. Set up proper monitoring and alerting

Remember: Always test thoroughly in paper trading mode before risking real capital.