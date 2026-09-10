Stables BCP daily mirror

Purpose:
Keep a local copy of the Stables resilience bundle on your own machine.

Windows PowerShell:
powershell -ExecutionPolicy Bypass -File pull-stables-bcp.ps1

Linux or macOS:
sh pull-stables-bcp.sh

Default source:
http://ipgrd3e7jwwkk7yzay4k2ft3vwbsgig62v6mdaqws3mato64hfwwr7yd.onion

Important:
.onion URLs require Tor routing. If your shell cannot resolve onion addresses directly, run Tor locally and pass a proxy.

PowerShell with Tor Browser SOCKS proxy:
powershell -ExecutionPolicy Bypass -File pull-stables-bcp.ps1 -Proxy "socks5h://127.0.0.1:9150"

Linux/macOS with Tor Browser SOCKS proxy:
sh pull-stables-bcp.sh "http://ipgrd3e7jwwkk7yzay4k2ft3vwbsgig62v6mdaqws3mato64hfwwr7yd.onion" "$HOME/Stables_BCP_Copy" "socks5h://127.0.0.1:9150"

To pull from another mirror, pass the URL as the first argument:

PowerShell:
powershell -ExecutionPolicy Bypass -File pull-stables-bcp.ps1 -BaseUrl "http://YOUR-MIRROR"

Linux or macOS:
sh pull-stables-bcp.sh "http://YOUR-MIRROR"

Daily scheduling examples:

Windows Task Scheduler:
Create a daily task that runs powershell.exe with:
-ExecutionPolicy Bypass -File C:\path\to\pull-stables-bcp.ps1

Linux/macOS cron:
0 9 * * * /bin/sh /path/to/pull-stables-bcp.sh

Default output folder:
Stables_BCP_Copy in your home directory.

The scripts verify every downloaded file against MANIFEST.json after pulling.
