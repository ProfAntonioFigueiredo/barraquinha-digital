targetScope = 'resourceGroup'
param location string = 'brazilsouth'
param appLocation string = location
@secure()
@minLength(32)
param adminKey string
@secure()
@minLength(32)
param sessionSecret string
var suffix = uniqueString(subscription().id, resourceGroup().id)
@minLength(2)
@maxLength(60)
param appName string = 'barraquinha-digital'
resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'plan-barraquinha-free'
  location: appLocation
  kind: 'linux'
  sku: { name: 'F1', tier: 'Free', capacity: 1 }
  properties: { reserved: true }
}
resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: 'barraquinha-db-${suffix}'
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    enableFreeTier: true
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    disableLocalAuth: true
    minimalTlsVersion: 'Tls12'
    capacity: { totalThroughputLimit: 400 }
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
    locations: [{ locationName: location, failoverPriority: 0, isZoneRedundant: false }]
    backupPolicy: { type: 'Periodic', periodicModeProperties: { backupIntervalInMinutes: 240, backupRetentionIntervalInHours: 8, backupStorageRedundancy: 'Local' } }
  }
}
resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmos
  name: 'discovery'
  properties: { resource: { id: 'discovery' } }
}
resource interviews 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'interviews'
  properties: {
    resource: {
      id: 'interviews'
      partitionKey: { paths: ['/id'], kind: 'Hash', version: 2 }
      defaultTtl: 7776000
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [{ path: '/createdAt/?' }, { path: '/kind/?' }]
        excludedPaths: [{ path: '/*' }]
      }
    }
    options: { throughput: 400 }
  }
}
resource app 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: appLocation
  kind: 'app,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      appCommandLine: 'node server.js'
      alwaysOn: false
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      http20Enabled: true
      appSettings: [
        { name: 'NODE_ENV', value: 'production' }
        { name: 'HOSTNAME', value: '0.0.0.0' }
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'false' }
        { name: 'DISCOVERY_PORTAL', value: 'true' }
        { name: 'DISCOVERY_ORIGIN', value: 'https://${appName}.azurewebsites.net' }
        { name: 'DISCOVERY_SECURE_COOKIE', value: 'true' }
        { name: 'DISCOVERY_ADMIN_KEY', value: adminKey }
        { name: 'DISCOVERY_SESSION_SECRET', value: sessionSecret }
        { name: 'DISCOVERY_COSMOS_ENDPOINT', value: cosmos.properties.documentEndpoint }
      ]
    }
  }
}
resource access 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-05-15' = {
  parent: cosmos
  name: guid(cosmos.id, app.id, 'data-contributor')
  properties: {
    principalId: app.identity.principalId
    roleDefinitionId: '${cosmos.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002'
    scope: cosmos.id
  }
}
output appName string = app.name
output defaultHostname string = app.properties.defaultHostName
output databaseAccount string = cosmos.name
output databaseEndpoint string = cosmos.properties.documentEndpoint
output planSku string = plan.sku.name
