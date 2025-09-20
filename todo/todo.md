 - Initial conviction scoring needs to be automated


 Long Term
  - Cron schedules via the scheduler node do not queue. If n8n cannot execute at the scheduled time, the job simply does not run
    - ToDo: external monitoring
  - Heartbeat monitoring: all of the necessary services need a heartbeat monitor (internal and external)
    - ToDo: Implement simple monitoring to ensure all of the containers are available
    - ToDo: Implement monitor to ensure n8n is available on custom domain
    - ToDo: Implement monotor to ensure external services are up
        - ScrapeOwl
        - Yahoo Finance
        - Finnhub