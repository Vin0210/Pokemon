const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

router.db._.id = 'id'; 
router.db._.mixin({
  createId: () => Math.floor(Math.random() * 1000000)
});

server.delete('/team/:id', (req, res) => {
  const id = Number(req.params.id);
  const exists = router.db.get('team').find({ id }).value();
  
  if (!exists) {
    console.log(`DELETE failed: Pokémon ${id} not found`);
    return res.status(404).json({ error: 'Not found' });
  }

  router.db.get('team').remove({ id }).write();
  console.log(`DELETE success: Removed Pokémon ${id}`);
  res.json({ success: true });
});

server.use(router);
server.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
  console.log('Test DELETE with: curl -X DELETE http://localhost:3001/team/22');
});