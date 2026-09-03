(function () {
  'use strict';

  var cfg = window.STABLES_CONFIG || {};
  var tv81 = cfg.TEST_VERSION_0081 || {};
  var expected = Object.freeze({ registry: 'TV81-REGISTRY-001', abi: 'TV81-ABI-001', node: 'TestV008', version: 'v0.0.8.1' });

  function publish(state) {
    window.__STABLES_TV81_APP_REGISTRY__ = Object.freeze(state);
    window.dispatchEvent(new CustomEvent('stables:tv81-registry', { detail: state }));
    return state;
  }

  function invalid(reason) {
    return publish({ ready: false, status: 'INVALID', reason: String(reason || 'Registry invalid'), expected: expected });
  }

  window.__STABLES_TV81_APP_REGISTRY__ = Object.freeze({ ready: false, status: 'LOADING', expected: expected });

  fetch(String(tv81.registry_url || ''), { cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) throw new Error('Registry HTTP ' + response.status);
      return response.json();
    })
    .then(function (registry) {
      if (registry.source_registry_id !== expected.registry) return invalid('Wrong registry identity');
      if (registry.source_abi_id !== expected.abi) return invalid('Wrong ABI identity');
      if (registry.node_name !== expected.node) return invalid('Wrong node generation');
      if (registry.protocol_version !== expected.version) return invalid('Wrong protocol version');
      if (registry.fallback_allowed !== false) return invalid('Fallback must be disabled');
      var assets = registry.assets || {};
      var faucet = registry.faucet || {};
      // V9 genesis reset adds the proven statuses ('V9_GENESIS_RESET_DEPLOYED_PROVEN' registry,
      // 'LIVE_PROVEN' faucet) alongside the original TV81 UNVERIFIED labels.
      var deployed = ['DEPLOYED_UNVERIFIED', 'ASSET_TOKENS_AND_FAUCET_DEPLOYED_UNVERIFIED', 'PHASE1_OBJECTS_DEPLOYED_UNVERIFIED', 'V9_GENESIS_RESET_DEPLOYED_PROVEN'].indexOf(registry.deployment_status) >= 0;
      var faucetOk = (faucet.status === 'DEPLOYED_UNVERIFIED' || faucet.status === 'LIVE_PROVEN');
      var ready = deployed && ['WINIWA', 'XWINIWA', 'USDW'].every(function (code) {
        return assets[code] && assets[code].status === 'FROZEN' && /^0x[0-9a-fA-F]+$/.test(String(assets[code].token_id || ''));
      }) && faucetOk && /^0x[0-9a-fA-F]+$/.test(String(faucet.address || ''));
      return publish({
        ready: ready,
        status: ready ? registry.deployment_status : 'NOT_DEPLOYED',
        reason: ready ? '' : 'TestV008 protocol identities are not deployed yet',
        registry: registry,
        expected: expected
      });
    })
    .catch(function (error) { invalid(error && error.message ? error.message : error); });
})();
