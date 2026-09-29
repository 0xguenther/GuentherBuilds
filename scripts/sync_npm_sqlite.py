import os
import subprocess

PVE_KEY = os.path.expanduser('~/.ssh/pve_ed25519')

def run_ssh(cmd):
    full_cmd = [
        'ssh', '-i', PVE_KEY,
        '-o', 'IdentitiesOnly=yes',
        '-o', 'StrictHostKeyChecking=no',
        'root@10.0.1.99', cmd
    ]
    res = subprocess.run(full_cmd, capture_output=True, text=True)
    return res.stdout, res.stderr

py_code = """import sqlite3
con = sqlite3.connect('/opt/npm/data/database.sqlite')
cur = con.cursor()
cur.execute('SELECT id, domain_names, forward_host, forward_port, enabled FROM proxy_host WHERE id=17')
print('BEFORE:', cur.fetchone())

domains = '["0xguenther.org","www.0xguenther.org","api.0xguenther.org"]'
cur.execute('UPDATE proxy_host SET domain_names = ?, forward_host = ?, forward_port = ? WHERE id = 17', (domains, '10.0.1.115', 3000))
con.commit()

cur.execute('SELECT id, domain_names, forward_host, forward_port, enabled FROM proxy_host WHERE id=17')
print('AFTER:', cur.fetchone())
"""

# Push py_code to CT103 via pct exec or bash heredoc
out, err = run_ssh(f"cat << 'EOF' > /tmp/update_db.py\n{py_code}\nEOF\npct push 103 /tmp/update_db.py /tmp/update_db.py\npct exec 103 -- python3 /tmp/update_db.py")
print("Output:")
print(out)
if err:
    print("Stderr:", err)
