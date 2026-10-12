"""GitHub Actions deployment. Secrets never enter a URL or a committed config."""
import json, os, re, subprocess, sys, time, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORKER = ROOT / 'mail-worker'

def settings(env):
    def required(key):
        value = env.get(key, '').strip()
        if not value: raise ValueError(f'Missing {key}')
        return value
    config = {key: required(key) for key in ('CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'JWT_SECRET', 'BOOTSTRAP_SECRET', 'ADMIN_PASSWORD', 'ADMIN', 'CUSTOM_DOMAIN', 'DOMAIN')}
    config['NAME'] = env.get('NAME', 'haoxi-cloud-mail').strip() or 'haoxi-cloud-mail'
    config['R2_BUCKET_NAME'] = env.get('R2_BUCKET_NAME', '').strip()
    config['RESEND_WEBHOOK_SECRET'] = env.get('RESEND_WEBHOOK_SECRET', '').strip()
    config['domains'] = json.loads(config['DOMAIN'])
    if not isinstance(config['domains'], list) or not config['domains']: raise ValueError('DOMAIN must be a non-empty JSON array')
    if any(not isinstance(d,str) or not re.fullmatch(r'[a-z0-9]+(?:[.-][a-z0-9-]+)+',d) for d in config['domains']): raise ValueError('Invalid DOMAIN')
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,62}',config['NAME']): raise ValueError('Invalid NAME')
    if config['ADMIN'] != config['ADMIN'].lower() or config['ADMIN'].rsplit('@',1)[-1] not in config['domains']: raise ValueError('ADMIN must be lowercase and use a configured domain')
    if not any(config['CUSTOM_DOMAIN'].endswith('.'+d) for d in config['domains']): raise ValueError('CUSTOM_DOMAIN must be a subdomain, such as mail.haoxi1688.com')
    if not re.fullmatch(r'[a-z0-9]+(?:[.-][a-z0-9-]+)+',config['CUSTOM_DOMAIN']): raise ValueError('Invalid CUSTOM_DOMAIN')
    if len(config['JWT_SECRET']) < 32 or len(config['BOOTSTRAP_SECRET']) < 32: raise ValueError('Signing and bootstrap secrets need at least 32 characters')
    if config['JWT_SECRET'] == config['BOOTSTRAP_SECRET']: raise ValueError('JWT_SECRET and BOOTSTRAP_SECRET must be different')
    if not 20 <= len(config['ADMIN_PASSWORD']) <= 30: raise ValueError('ADMIN_PASSWORD needs 20 to 30 characters')
    return config

def render(config, d1_id, kv_id):
    q = lambda x: json.dumps(x, ensure_ascii=False)
    text = f'''name = {q(config['NAME'])}
main = "src/index.js"
compatibility_date = "2025-06-04"
keep_vars = true

[[routes]]
pattern = {q(config['CUSTOM_DOMAIN'])}
custom_domain = true

[[d1_databases]]
binding = "db"
database_name = {q(config['NAME'])}
database_id = {q(d1_id)}

[[kv_namespaces]]
binding = "kv"
id = {q(kv_id)}

[assets]
binding = "assets"
directory = "./dist"
not_found_handling = "single-page-application"
run_worker_first = true

[observability]
enabled = true

[triggers]
crons = ["0 * * * *"]

[vars]
domain = {q(config['domains'])}
admin = {q(config['ADMIN'])}
analysis_cache = false
'''
    if config['R2_BUCKET_NAME']:
        text += '\n[[r2_buckets]]\nbinding = "r2"\nbucket_name = '+q(config['R2_BUCKET_NAME'])+'\n'
    return text

def run(args, input=None):
    subprocess.run(args, cwd=WORKER, input=input, text=True, check=True)

def main():
    config = settings(os.environ)
    account = config['CLOUDFLARE_ACCOUNT_ID']
    token = config['CLOUDFLARE_API_TOKEN']
    def api(route, method='GET', body=None):
        request=urllib.request.Request('https://api.cloudflare.com/client/v4/accounts/'+account+'/'+route,method=method,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},data=json.dumps(body).encode() if body is not None else None)
        with urllib.request.urlopen(request,timeout=60) as response: data=json.load(response)
        if not data.get('success'): raise RuntimeError('Cloudflare resource operation failed')
        return data['result']
    def find_or_create(route,label,field,id_field):
        # The targeted personal account has few resources. Fail on ambiguity instead of reusing arbitrarily.
        matches=[r for r in api(route) if r.get(field)==label]
        if len(matches)>1: raise RuntimeError('Multiple resources match '+label)
        return matches[0][id_field] if matches else api(route,'POST',{field:label})[id_field]
    d1_id = os.environ.get('D1_DATABASE_ID') or find_or_create('d1/database',config['NAME'],'name','uuid')
    kv_id = os.environ.get('KV_NAMESPACE_ID') or find_or_create('storage/kv/namespaces',config['NAME'],'title','id')
    (WORKER/'wrangler.generated.toml').write_text(render(config,d1_id,kv_id),encoding='utf-8')
    # deploy returns a nonzero status on failure; never discard it through a logging pipeline.
    run(['pnpm','wrangler','deploy','-c','wrangler.generated.toml'])
    secrets={'jwt_secret':config['JWT_SECRET'],'bootstrap_secret':config['BOOTSTRAP_SECRET']}
    if config['RESEND_WEBHOOK_SECRET']: secrets['resend_webhook_secret']=config['RESEND_WEBHOOK_SECRET']
    run(['pnpm','wrangler','secret','bulk','-c','wrangler.generated.toml'],json.dumps(secrets))
    url='https://'+config['CUSTOM_DOMAIN']+'/api/init'
    body=json.dumps({'adminPassword':config['ADMIN_PASSWORD']}).encode()
    for attempt in range(12):
        try:
            request=urllib.request.Request(url,data=body,method='POST',headers={'Content-Type':'application/json','Authorization':'Bearer '+config['BOOTSTRAP_SECRET']})
            with urllib.request.urlopen(request,timeout=30) as response:
                if response.read().decode()!='success': raise RuntimeError('Bootstrap failed')
            print('Deployment and database bootstrap completed: https://'+config['CUSTOM_DOMAIN'])
            return
        except (urllib.error.URLError,RuntimeError):
            if attempt==11: raise RuntimeError('Worker deployment finished but bootstrap failed; inspect logs, do not delete databases') from None
            time.sleep(5)

if __name__=='__main__':
    main()
