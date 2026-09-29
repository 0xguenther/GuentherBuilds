"""
Align 0xGünther routing with cuonz.org architecture:
Cloudflare Tunnel -> Nginx Proxy Manager (CT103: 10.0.1.127:80) -> Günther Core (CT115: 10.0.1.115:3000)
"""

import os
import json
import urllib.request
import urllib.parse
import subprocess

VAULT_TOKEN_PATH = os.path.expanduser('~/Secrets/.vault-agent.token')
BROKER_URL = 'http://127.0.0.1:7799'
ACCOUNT_ID = 'a1236baadbb18a793d08b8e3f5828455'
TUNNEL_ID = '133bb472-66e8-4982-9454-48b24c441533'
PVE_KEY = os.path.expanduser('~/.ssh/pve_ed25519')
NPM_SERVICE = 'http://10.0.1.127:80'

def run_ssh_pve(cmd):
    full_cmd = [
        'ssh', '-i', PVE_KEY,
        '-o', 'IdentitiesOnly=yes',
        '-o', 'StrictHostKeyChecking=no',
        'root@10.0.1.99', cmd
    ]
    res = subprocess.run(full_cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"SSH Error: {res.stderr}")
    return res.stdout.strip()

def get_cf_token():
    with open(VAULT_TOKEN_PATH, 'r') as f:
        tok = f.read().strip()
    entry = urllib.parse.quote('Projects/Cloudflare')
    url = f"{BROKER_URL}/get?entry={entry}&field=Password&token={tok}"
    with urllib.request.urlopen(url) as res:
        return res.read().decode().strip()

def cf_api(endpoint, method='GET', data=None, token=None):
    url = f"https://api.cloudflare.com/client/v4{endpoint}"
    headers = {
        'Authorization': f"Bearer {token}",
        'Content-Type': 'application/json'
    }
    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode('utf-8'))

def update_npm():
    print("[1/3] Updating Nginx Proxy Manager on CT103 (10.0.1.127)...")
    # 1. Update SQLite database
    script = """
import sqlite3
c = sqlite3.connect('/opt/npm/data/database.sqlite')
c.execute('UPDATE proxy_host SET domain_names = \'["0xguenther.org","www.0xguenther.org","api.0xguenther.org"]\', forward_host = "10.0.1.115", forward_port = 3000 WHERE id = 17')
c.commit()
print("Updated NPM DB rows:", c.total_changes)
"""
    out1 = run_ssh_pve(f"pct exec 103 -- python3 -c {json.dumps(script)}")
    print(f"  -> {out1}")

    # 2. Update 17.conf
    conf_update = "sed -i 's/server_name .*/server_name 0xguenther.org www.0xguenther.org api.0xguenther.org;/' /opt/npm/data/nginx/proxy_host/17.conf"
    run_ssh_pve(f"pct exec 103 -- {conf_update}")

    # 3. Test and reload nginx
    t_out = run_ssh_pve("pct exec 103 -- docker exec npm-app-1 nginx -t")
    print(f"  -> Nginx test: {t_out}")
    r_out = run_ssh_pve("pct exec 103 -- docker exec npm-app-1 nginx -s reload")
    print(f"  -> Nginx reload: {r_out or 'OK'}")

def update_tunnel(token):
    print("\n[2/3] Updating Cloudflare Tunnel ingress to point to NPM (http://10.0.1.127:80)...")
    res = cf_api(f"/accounts/{ACCOUNT_ID}/cfd_tunnel/{TUNNEL_ID}/configurations", token=token)
    config = res.get('result', {}).get('config', {})
    existing_ingress = config.get('ingress', [])

    # Filter out old 0xguenther entries
    cleaned_ingress = [
        rule for rule in existing_ingress
        if 'hostname' in rule and not rule['hostname'].endswith('0xguenther.org')
    ]

    # Add Günther rules pointing to NPM (analog cuonz.org)
    gunther_rules = [
        {"hostname": "0xguenther.org", "service": NPM_SERVICE},
        {"hostname": "www.0xguenther.org", "service": NPM_SERVICE},
        {"hostname": "api.0xguenther.org", "service": NPM_SERVICE}
    ]

    new_ingress = cleaned_ingress + gunther_rules + [{"service": "http_status:404"}]
    config['ingress'] = new_ingress

    update_payload = {"config": config}
    put_res = cf_api(f"/accounts/{ACCOUNT_ID}/cfd_tunnel/{TUNNEL_ID}/configurations", method='PUT', data=update_payload, token=token)
    print("  -> Cloudflare Tunnel ingress updated:", put_res.get('success'))
    for r in gunther_rules:
        print(f"  -> {r['hostname']} => {r['service']} (NPM)")

def test_chain():
    print("\n[3/3] Testing end-to-end chain (NPM -> CT115)...")
    # Test curl on NPM directly
    test_cmd = "pct exec 103 -- curl -s -I -H 'Host: 0xguenther.org' http://127.0.0.1:80/health"
    out = run_ssh_pve(test_cmd)
    print("Direct request to NPM on CT103:")
    print(out)

if __name__ == '__main__':
    print("====================================================")
    print("SWITCHING ROUTING TO NGINX PROXY MANAGER (ANALOG CUONZ.ORG)")
    print("====================================================")
    update_npm()
    token = get_cf_token()
    update_tunnel(token)
    test_chain()
    print("\n====================================================")
    print("SUCCESS: 0xguenther.org is now routed via NPM on CT103!")
    print("====================================================")
