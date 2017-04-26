const windshaft = require('windshaft')
const fs = require('fs-promise') // Note: not built-in Node
const args = process.argv.slice(2)

async function run(configFileName, port) {
  const dbConfig = await fs.readJson(configFileName)
  const db = pgp(dbConfig)

  app.get('*', (req, res) => {
    const queryStr = req.query.q

    db.any(queryStr)
      .then((result) => {
        res.json({ rows: result })
      })
      .catch((ex) => {
        res.status(500).send(ex.message)
      })
  })

  app.listen(port)
  console.log("midja-sql listening on "+port)
}

run(args[0], args[1] || 3000)
