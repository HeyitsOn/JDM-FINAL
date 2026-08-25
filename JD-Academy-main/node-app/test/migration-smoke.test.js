const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');

function flattenRouteStack(router) {
  const results = [];
  const stack = router && router.stack ? router.stack : [];

  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).filter((method) => layer.route.methods[method]).map((method) => method.toUpperCase());
      results.push({ methods, path: layer.route.path });
      continue;
    }

    if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      results.push(...flattenRouteStack(layer.handle));
    }
  }

  return results;
}

test('Express exposes the configured migration routes', () => {
  const routes = flattenRouteStack(app._router);
  const routeMap = new Map();

  for (const route of routes) {
    for (const method of route.methods) {
      const key = `${method.toUpperCase()} ${route.path}`;
      routeMap.set(key, true);
    }
  }

  const expected = [
    'GET /health',
    'POST /register',
    'POST /login',
    'POST /logout',
    'GET /session',
    'POST /save',
    'GET /me',
    'GET /generate-certificate',
    'GET /verify-certificate',
    'GET /verify',
    'GET /:level',
    'GET /:level/render',
    'GET /session-check',
    'POST /save-progress',
    'GET /get-progress',
    'GET /generate-certificate',
    'GET /verify-certificate',
    'POST /register.php',
    'POST /login.php',
    'POST /page-visits',
  ];

  for (const item of expected) {
    assert.ok(routeMap.has(item), `Missing route: ${item}`);
  }
});

test('Config defines the required environment keys', () => {
  const config = require('../config');
  assert.ok(config.SESSION_SECRET, 'SESSION_SECRET should be defined');
  assert.ok(config.DB_HOST, 'DB_HOST should be defined');
  assert.ok(config.DB_NAME, 'DB_NAME should be defined');
  assert.ok(config.DB_USER, 'DB_USER should be defined');
  assert.ok(config.DB_PASS, 'DB_PASS should be defined');
});
