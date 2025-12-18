import express, { Request, Response } from 'express';
import { add, greet } from './utils';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
  res.send(greet('World'));
});

app.get('/add', (req: Request, res: Response) => {
  const a = parseInt(req.query.a as string) || 0;
  const b = parseInt(req.query.b as string) || 0;
  res.send({ result: add(a, b) });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
