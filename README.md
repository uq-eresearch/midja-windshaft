# midja-sql

Really simple replacement for CartoDB API, given very little is actually needed.

## Running

```
npm start <config_file> <port>
```

* `config_file`: [pg-promise][pg-promise] [configuration object][confobj].
* `port`: HTTP port to listen on (default: 3000)

## Using

```
$ curl -s "http://localhost:3000/?q=SELECT%20lga_name,state_name%20FROM%20lga_2011_aust%20LIMIT%203" | jq .
{
  "rows": [
    {
      "lga_name": "Manningham (C)",
      "state_name": "Victoria"
    },
    {
      "lga_name": "Hindmarsh (S)",
      "state_name": "Victoria"
    },
    {
      "lga_name": "Hobsons Bay (C)",
      "state_name": "Victoria"
    }
  ]
}
```

## Reverse-proxying

There's only one route, and it matches all paths, so very little effort is required to reverse-proxy the service.


[pg-promise]: https://www.npmjs.com/package/pg-promise
[confobj]: https://github.com/vitaly-t/pg-promise/wiki/Connection-Syntax#configuration-object
