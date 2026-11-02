"""Deploy only F1 + Cosmos lifetime Free Tier. No paid fallback, no DNS changes."""
import argparse
import os
import json
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile

SUBSCRIPTION = os.environ.get('AZURE_SUBSCRIPTION_ID') or subprocess.check_output(['az','account','show','--query','id','-o','tsv'],text=True).strip()
GROUP = os.environ.get('AZURE_RESOURCE_GROUP','rg-barraquinha-free')
secret_values = []

def az(*args):
    result = subprocess.run(['az', *args, '--subscription', SUBSCRIPTION, '--only-show-errors', '-o', 'json'], capture_output=True, text=True)
    if result.returncode:
        error = result.stderr
        for value in secret_values:
            error = error.replace(value, '[REDACTED]')
        raise RuntimeError(error)
    return json.loads(result.stdout) if result.stdout.strip() else None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--app-location', default='southcentralus')
    parser.add_argument('--app-name', default='barraquinha-digital')
    args = parser.parse_args()
    if not Path('build/discovery-azure.zip').is_file():
        raise RuntimeError('Gere o pacote antes de publicar.')
    free_accounts = [item for item in az('cosmosdb', 'list') if item.get('enableFreeTier')]
    if any(item['resourceGroup'].lower() != GROUP.lower() for item in free_accounts):
        raise RuntimeError('Free Tier já utilizado em outra conta. Nenhum fallback pago será criado.')
    credentials = Path('build/discovery-free-secrets.json')
    if credentials.exists():
        values = json.loads(credentials.read_text())
    else:
        values = {'adminKey': secrets.token_hex(24), 'sessionSecret': secrets.token_hex(32)}
        credentials.write_text(json.dumps(values))
        credentials.chmod(0o600)
    secret_values.extend(values.values())
    handoff = Path('build/discovery-free-admin-access.txt')
    handoff.write_text(values['adminKey'] + '\n'); handoff.chmod(0o600)
    print('Preparando grupo exclusivo para F1 + Cosmos Free Tier.', flush=True)
    az('group', 'create', '--name', GROUP, '--location', 'brazilsouth')
    with tempfile.TemporaryDirectory(prefix='wise-free-deploy-') as temporary:
        parameters = Path(temporary) / 'parameters.json'
        parameters.write_text(json.dumps({'parameters': {key: {'value': value} for key, value in values.items()}}))
        parameters.chmod(0o600)
        print('Validando recursos gratuitos, região e permissões.', flush=True)
        az('deployment', 'group', 'validate', '--resource-group', GROUP, '--template-file', 'infra/discovery/free.bicep', '--parameters', '@' + str(parameters), 'appLocation=' + args.app_location, 'appName=' + args.app_name)
        print('Criando F1 e Cosmos com enableFreeTier=true, 400 RU/s e uma região.', flush=True)
        deployment = az('deployment', 'group', 'create', '--resource-group', GROUP, '--name', 'discovery-free-v1', '--template-file', 'infra/discovery/free.bicep', '--parameters', '@' + str(parameters), 'appLocation=' + args.app_location, 'appName=' + args.app_name)
    outputs = deployment['properties']['outputs']
    app = outputs['appName']['value']; hostname = outputs['defaultHostname']['value']
    metadata = {'resourceGroup': GROUP, 'appName': app, 'hostname': hostname, 'origin': 'https://' + hostname, 'databaseAccount': outputs['databaseAccount']['value'], 'sku': outputs['planSku']['value'], 'appRegion': args.app_location, 'databaseRegion': 'brazilsouth', 'databaseFreeTier': True}
    Path('build/discovery-free-deployment.json').write_text(json.dumps(metadata, indent=2))
    az('webapp', 'config', 'appsettings', 'set', '--resource-group', GROUP, '--name', app, '--settings', 'DISCOVERY_ORIGIN=https://' + hostname)
    print('Publicando pacote no App Service gratuito.', flush=True)
    az('webapp', 'deploy', '--resource-group', GROUP, '--name', app, '--src-path', 'build/discovery-azure.zip', '--type', 'zip')
    print(json.dumps({'url': 'https://' + hostname + '/discovery', 'admin': 'https://' + hostname + '/discovery/admin', 'accessFile': str(handoff)}), flush=True)

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
