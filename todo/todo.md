 - Initial conviction scoring needs to be automated
 - MCP server wired in front of playwright should be fixed - can be an additional mechnism for news

 Long Term (productionize)
  - Cron schedules via the scheduler node do not queue. If n8n cannot execute at the scheduled time, the job simply does not run
    - ToDo: external monitoring
  - Heartbeat monitoring: all of the necessary services need a heartbeat monitor (internal and external)
    - ToDo: Implement simple monitoring to ensure all of the containers are available
    - ToDo: Implement monitor to ensure n8n is available on custom domain
    - ToDo: Implement monotor to ensure external services are up
        - ScrapeOwl
        - Yahoo Finance
        - Finnhub
  - Implement live trading
    - Only after high availability is implmented