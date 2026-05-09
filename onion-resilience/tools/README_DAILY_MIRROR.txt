Stables BCP daily mirror

Purpose:
Keep a local copy of the Stables resilience bundle on your own machine.

Windows PowerShell:
powershell -ExecutionPolicy Bypass -File pull-stables-bcp.ps1

Linux or macOS:
sh pull-stables-bcp.sh

To pull from the onion address later, pass the onion URL as the first argument:

PowerShell:
powershell -ExecutionPolicy Bypass -File pull-stables-bcp.ps1 -BaseUrl "http://YOUR-ONION-ADDRESS.onion"

Linux or macOS:
sh pull-stables-bcp.sh "http://YOUR-ONION-ADDRESS.onion"

Daily scheduling examples:

Windows Task Scheduler:
Create a daily task that runs powershell.exe with:
-ExecutionPolicy Bypass -File C:\path\to\pull-stables-bcp.ps1

Linux/macOS cron:
0 9 * * * /bin/sh /path/to/pull-stables-bcp.sh

Default output folder:
Stables_BCP_Copy in your home directory.
