// search-model reads ELASTICSEARCH_URL when its SearchService loads. Schema
// construction never opens a connection, but the module expects the variable.
if (!process.env.ELASTICSEARCH_URL) {
  process.env.ELASTICSEARCH_URL = 'http://localhost:9200'
}
