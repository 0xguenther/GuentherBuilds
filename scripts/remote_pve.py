import sys
import subprocess
import os

PVE_KEY = os.path.expanduser('~/.ssh/pve_ed25519')
cmd = sys.argv[1] if len(sys.argv) > 1 else 'uptime'

full_cmd = [
    'ssh', '-i', PVE_KEY,
    '-o', 'IdentitiesOnly=yes',
    '-o', 'StrictHostKeyChecking=no',
    'root@10.0.1.99', cmd
]
res = subprocess.run(full_cmd, capture_output=True, text=True, encoding='utf-8')
print(res.stdout)
if res.stderr:
    sys.stderr.write(res.stderr)
sys.exit(res.returncode)

