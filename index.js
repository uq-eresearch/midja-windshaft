const server = require('./src/server')
const fs = require('fs-promise') // Note: not built-in Node
const args = process.argv.slice(2)

// Hack to handle Windshaft's reliance on global variable "environment"
global.environment = {}

async function run(configFileName, port) {
  const config = await fs.readJson(configFileName)
  server(config).listen(port)
  console.log("midja-windshaft listening on "+port)
}

run(args[0], args[1] || 3000)
  .catch((error) => {
    console.log(error)
    process.exit(1)
  })
