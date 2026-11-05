# Azure BI & Data Engineering Playbook - Prompt Import Staging

Save your exported playbook files from [https://aisdlcplaybook.azurewebsites.net/prompt-library](https://aisdlcplaybook.azurewebsites.net/prompt-library) into this directory.

### Supported File Formats:
1. **Raw HTML (`.html`)**: In your browser on `https://aisdlcplaybook.azurewebsites.net/prompt-library`, press `Ctrl+S` (Save As) and save the complete page or web page HTML into this folder (e.g., `playbook-prompts/page.html` or `playbook-prompts/prompt-library.html`).
2. **JSON (`.json`)**: If you inspect the network tab (`F12 -> Network -> Fetch/XHR`) and copy the response JSON returning the prompt library list.
3. **Markdown / Text (`.md`, `.txt`)**: Any copy-pasted prompt templates or markdown files.

Once you have placed the file(s) here, let me know and I will automatically parse all the prompts, categorize them by domain (Power BI, DAX, Fabric, Synapse, Databricks, Data Factory, SQL), and integrate them into **Engineering Commons** with a dedicated **Prompt Playbook** category across the CLI, backend marketplace, and VS Code extension!
