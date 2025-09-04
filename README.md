# Janus - n8n Trading Automation

Janus converts the ChatGPT Micro-Cap trading system into n8n visual workflows for better automation and management.

## Architecture

```
janus/
├── workflows/          # n8n workflow JSON files
│   ├── daily-trading.json
│   ├── price-monitoring.json
│   ├── weekly-research.json
│   └── portfolio-management.json
├── nodes/              # Custom n8n nodes
│   ├── yahoo-finance/
│   ├── portfolio-manager/
│   └── trade-executor/
├── config/             # Configuration files
│   ├── settings.json
│   ├── tickers.json
│   └── environment.example
├── docs/               # Documentation
│   ├── setup.md
│   ├── workflows.md
│   └── customization.md
└── data/               # Data schemas and templates
    ├── portfolio-schema.json
    ├── trade-schema.json
    └── response-templates.json
```

## Key Features

- **Visual Workflow Management**: Replace Python scripts with n8n workflows
- **Real-time Monitoring**: Live price updates and stop-loss triggers
- **Error Handling**: Built-in retry logic and failure notifications
- **Scalable Architecture**: Easy to add new trading strategies
- **Paper Trading**: Safe simulation mode for testing

## Quick Start

1. Install n8n: `npm install n8n -g`
2. Import workflows from `workflows/` directory
3. Install custom nodes from `nodes/` directory
4. Configure environment variables from `config/`
5. Run workflows in paper trading mode first

## Workflow Overview

- **Daily Trading**: Automated LLM analysis and trade execution
- **Price Monitoring**: Real-time price updates and stop-loss triggers
- **Weekly Research**: Deep research sessions for new opportunities
- **Portfolio Management**: Position sizing and risk management

See `docs/` for detailed setup and customization instructions.