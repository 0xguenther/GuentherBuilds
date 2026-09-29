"""
Cloudflare Tunnel & DNS Auto-Configuration for 0xGünther
Connects 0xguenther.org, www.0xguenther.org, and api.0xguenther.org
directly to Günther Core running on Proxmox CT115 (10.0.1.115:3000).
"""

import os
import json
import urllib.request
import urllib.parse

VAULT_TOKEN_PATH = os.path.expanduser('~/Secrets/.vault-agent.token')
BROKER_URL = 'http://127.0.0.1:7799'
ACCOUNT_ID = 'a1236baadbb18a793d08b8e3f5828455'
TUNNEL_ID = '133bb472-66e8-4982-9454-48b24c441533'
ZONE_ID = '786a3a8c68c33ac398526592d514b54b'
TARGET_SERVICE = 'http://10.0.1.115:3000'
TUNNEL_CNAME = f"{TUNNEL_ID}.cfargotunnel.com"

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

def configure_tunnel(token):
    print("\n[1/3] Updating Cloudflare Tunnel Ingress configuration...")
    res = cf_api(f"/accounts/{ACCOUNT_ID}/cfd_tunnel/{TUNNEL_ID}/configurations", token=token)
    config = res.get('result', {}).get('config', {})
    existing_ingress = config.get('ingress', [])

    # Filter out any old entries for 0xguenther
    cleaned_ingress = [
        rule for rule in existing_ingress
        if 'hostname' in rule and not rule['hostname'].endswith('0xguenther.org')
    ]

    # Add new rules for Günther
    gunther_rules = [
        {"hostname": "0xguenther.org", "service": TARGET_SERVICE},
        {"hostname": "www.0xguenther.org", "service": TARGET_SERVICE},
        {"hostname": "api.0xguenther.org", "service": TARGET_SERVICE}
    ]

    # Combine: other hosts + gunther hosts + catch-all 404
    new_ingress = cleaned_ingress + gunther_rules + [{"service": "http_status:404"}]
    config['ingress'] = new_ingress

    update_payload = {"config": config}
    put_res = cf_api(f"/accounts/{ACCOUNT_ID}/cfd_tunnel/{TUNNEL_ID}/configurations", method='PUT', data=update_payload, token=token)
    print("  -> Ingress update success:", put_res.get('success'))
    for rule in gunther_rules:
        print(f"  -> Routed: https://{rule['hostname']} => {rule['service']}")

def configure_dns(token):
    print("\n[2/3] Updating DNS Records in Zone 0xguenther.org...")
    records_res = cf_api(f"/zones/{ZONE_ID}/dns_records", token=token)
    current_records = records_res.get('result', [])

    # Delete old A records pointing to Metanet (80.74.136.2)
    for rec in current_records:
        if rec['type'] == 'A' and rec['content'] == '80.74.136.2':
            print(f"  -> Deleting stale A record: {rec['name']} ({rec['id']})")
            del_res = cf_api(f"/zones/{ZONE_ID}/dns_records/{rec['id']}", method='DELETE', token=token)
            print(f"     Deleted: {del_res.get('success')}")

    # Re-fetch records
    records_res = cf_api(f"/zones/{ZONE_ID}/dns_records", token=token)
    active_names = {r['name']: r for r in records_res.get('result', [])}

    # Desired CNAMEs
    desired_cnames = [
        ("0xguenther.org", TUNNEL_CNAME),
        ("www.0xguenther.org", TUNNEL_CNAME),
        ("api.0xguenther.org", TUNNEL_CNAME)
    ]

    for name, target in desired_cnames:
        if name in active_names:
            rec = active_names[name]
            if rec['type'] == 'CNAME' and rec['content'] == target and rec['proxied']:
                print(f"  -> Record {name} already correctly set to {target} (Proxied).")
                continue
            else:
                print(f"  -> Updating existing record {name} ({rec['id']})...")
                upd = cf_api(f"/zones/{ZONE_ID}/dns_records/{rec['id']}", method='PATCH', data={
                    'type': 'CNAME',
                    'name': name,
                    'content': target,
                    'proxied': True,
                    'ttl': 1
                }, token=token)
                print(f"     Updated: {upd.get('success')}")
        else:
            print(f"  -> Creating new CNAME record {name} -> {target} (Proxied)...")
            create_res = cf_api(f"/zones/{ZONE_ID}/dns_records", method='POST', data={
                'type': 'CNAME',
                'name': name,
                'content': target,
                'proxied': True,
                'ttl': 1
            }, token=token)
            print(f"     Created: {create_res.get('success')}")

def verify_live(token):
    print("\n[3/3] Final DNS State:")
    records_res = cf_api(f"/zones/{ZONE_ID}/dns_records", token=token)
    for r in records_res.get('result', []):
        proxy_str = "[Proxied / Orange Cloud]" if r.get('proxied') else "[DNS Only]"
        print(f"  * {r['type']} {r['name']} -> {r['content']} {proxy_str}")

if __name__ == '__main__':
    print("====================================================")
    print("0xGÜNTHER — AUTOMATED CLOUDFLARE CONFIGURATION")
    print("====================================================")
    token = get_cf_token()
    configure_tunnel(token)
    configure_dns(token)
    verify_live(token)
    print("\n====================================================")
    print("SUCCESS: 0xguenther.org is now routed to CT 115!")
    print("====================================================")
