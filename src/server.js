const debug = require('debug')('windshaft:server')
const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const RedisPool = require('redis-mpool')
const _ = require('underscore')
const mapnik = require('mapnik')
const windshaft = require('windshaft')

const MapConfig = windshaft.model.MapConfig
const DummyMapConfigProvider = require('../node_modules/windshaft/lib/windshaft/models/providers/dummy_mapconfig_provider')
const MapStoreMapConfigProvider = windshaft.model.provider.MapStoreMapConfig

module.exports = function(opts) {
  const grainstore = {
    "datasource": opts.postgres,
    "mapnik_version": "3.0.12" //mapnik.versions.mapnik
  }
  bootstrapFonts(grainstore)

  // Create Express app
  const app = express()
  // - with JSON body parsing
  app.use(bodyParser.json())
  // - with logging
  app.use(morgan('tiny'))

  // Init WindShaft components
  const mapStore = new windshaft.storage.MapStore({
    pool: makeRedisPool(opts.redis),
    expire_time: 3600 // Cache map definition for an hour
  })
  const rendererFactory = new windshaft.renderer.Factory({
    mapnik: {
      grainstore: grainstore
    }
  })
  const rendererCache = new windshaft.cache.RendererCache(rendererFactory)
  const tileBackend = new windshaft.backend.Tile(rendererCache)
  const attributesBackend = new windshaft.backend.Attributes()
  const mapValidatorBackend = new windshaft.backend.MapValidator(tileBackend, attributesBackend)
  const mapBackend = new windshaft.backend.Map(rendererCache, mapStore, mapValidatorBackend)

  // Handlers
  function getParams(req) {
    return _.extend(req.params, { "dbname": opts.postgres.database })
  }

  function cors(req, res, next) {
    doCORS(res, "Content-Type")
    return next()
  }

  function create(req, res) {
    const params = getParams(req)
    const requestMapConfig = req.body
    doCORS(res)

    var mapConfig = MapConfig.create(requestMapConfig)
    mapBackend.createLayergroup(
      mapConfig,
      params,
      new DummyMapConfigProvider(mapConfig, params),
      function(err, response) {
        if (err) {
          const errMsg = (err.message || err) + ''
          res.status(500).send(errMsg)
          logError("create", err);
        } else {
          res.status(200).send(response)
        }
      });
  }

  function tileOrLayer(req, res) {
    const params = getParams(req)
    doCORS(res)

    tileBackend.getTile(
      new MapStoreMapConfigProvider(mapStore, params),
      params,
      function (err, tile, headers) {
        if (err) {
          var errMsg = (err.message || err) + '';
          res.status(500).send(errMsg)
          logError("tileOrLayer", err);
        } else {
          res.send(tile, headers, 200)
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

function logError(tag, err) {
  console.error(tag+": "+JSON.stringify(err)+(err.stack||""));
}

function makeRedisPool(redisOpts) {
  redisOpts = redisOpts || {};
  return new RedisPool(_.extend(redisOpts, {name: 'windshaft:server'}));
}

function bootstrapFonts(grainstore) {
  // Set carto renderer configuration for MMLStore
  grainstore.carto_env = {};
  var cenv = grainstore.carto_env;
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
