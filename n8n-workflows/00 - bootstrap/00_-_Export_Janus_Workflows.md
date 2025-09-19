# 00 - Export Janus Workflows

## Summary
Exports all n8n workflows tagged with "janus" to JSON files for backup/version control.

## Trigger
Manual trigger - executed when user clicks "Execute workflow"

## Use Case
This workflow automates the export of all Janus-related workflows by:
1. Calling the n8n API to list all workflows
2. Filtering for workflows tagged with "janus" that are not archived
3. Using the n8n CLI command to export each workflow to `/files/` directory
4. Sanitizing workflow names for safe file naming

## External Dependencies
- n8n API access with header authentication (X-N8N-API-KEY)
- n8n CLI tools available in the execution environment
- Write access to `/files/` directory