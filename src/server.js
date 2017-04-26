const debug = require('debug')('windshaft:server')
const express = require('express')
const RedisPool = require('redis-mpool')
const _ = require('underscore')
const mapnik = require('mapnik')
const windshaft = require('windshaft')

const MapConfig = windshaft.model.MapConfig
const DummyMapConfigProvider = require('../node_modules/windshaft/models/providers/dummy_mapconfig_provider')
const MapStoreMapConfigProvider = windshaft.model.provider.MapStoreMapConfig

module.exports = function(opts) {
  const grainstore = {
    "datasource": opts.postgres,
    "mapnik_version": mapnik.versions.mapnik
  }
  bootstrapFonts(grainstore)

  // Create Express app
  const app = express.createServer()
  app.use(express.bodyParser())
  app.use(express.logger())

  // Init WindShaft components
  const mapStore = new windshaft.storage.MapStore({
    pool: makeRedisPool(opts.redis)
  })
  const rendererFactory = new windshaft.renderer.Factory({
    mapnik: {
      grainstore: grainstore
    }
  })
  const rendererCacheOpts = {
    ttl: 60000, // 60 seconds TTL by default
    statsInterval: 60000 // reports stats every milliseconds defined here
  })
  const rendererCache = new windshaft.cache.RendererCache(rendererFactory, rendererCacheOpts)
  const tileBackend = new windshaft.backend.Tile(rendererCache)
  const attributesBackend = new windshaft.backend.Attributes()
  const mapValidatorBackend = new windshaft.backend.MapValidator(tileBackend, attributesBackend)
  const mapBackend = new windshaft.backend.Map(rendererCache, mapStore, mapValidatorBackend)

  // Handlers
  function cors(req, res, next) {
    doCORS(res, "Content-Type")
    return next()
  }

  function create(req, res) {
    const requestMapConfig = req.body
    doCORS(res)

    var mapConfig = MapConfig.create(requestMapConfig)
    mapBackend.createLayergroup(
      mapConfig,
      req.params,
      new DummyMapConfigProvider(mapConfig, req.params),
      function(err, response) {
        if (err) {
          const errMsg = (err.message || err) + ''
          res.send(errMsg, 500)
          console.error("create: " + JSON.stringify(err))
        } else {
          res.send(response, 200);
        }
      });
  }

  function tileOrLayer(req, res) {
    const params = _.extend(req.params, { "dbname": opts.postgres.database })
    doCORS(res)

    tileBackend.getTile(
      new MapStoreMapConfigProvider(map_store, params),
      params,
      function (err, tile, headers) {
        if (err) {
          var errMsg = (err.message || err) + '';
          res.send(errMsg, 500)
          console.error("tilesOrLayer: " + JSON.stringify(err));
        } else {
          res.send(tile, headers, 200);
        }
      })
  }

  // Routes
  app.post("/", bodyParser.json(), create);
  app.options("/", cors);
  app.get('/:token/:z/:x/:y@:scale_factor?x.:format', tileOrLayer);
  app.get('/:token/:z/:x/:y.:format', tileOrLayer);
  app.get('/:token/:layer/:z/:x/:y.(:format)', tileOrLayer);

  return app;
}

function makeRedisPool(redisOpts) {
  redisOpts = redisOpts || {};
  return new RedisPool(_.extend(redisOpts, {name: 'windshaft:server'}));
}

function bootstrapFonts(grainstore) {
  // Set carto renderer configuration for MMLStore
  grainstore.carto_env = {};
  var cenv = opts.grainstore.carto_env;
  cenv.validation_data = {};
  mapnik.register_system_fonts();
  mapnik.register_default_fonts();
  cenv.validation_data.fonts = _.keys(mapnik.fontFiles());
}

function doCORS(res, extraHeaders) {
  var headers = "X-Requested-With, X-Prototype-Version, X-CSRF-Token";
  if (extraHeaders) {
      headers += ", " + extraHeaders;
  }
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", headers);
}
