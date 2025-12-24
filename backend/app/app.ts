import express from 'express';
import { postRequestSchema } from '@ephemera/shared/dist/api/api_schema.js';
import SignalCrypto from '@ephemera/shared/dist/lib/signal_crypto.js';

const app = express();
app.use(express.json());

const apiV1 = express.Router();

apiV1.post('/post', async (req, res) => {
  const parsed = postRequestSchema.parse(req.body);

  if (!parsed) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const verified = await SignalCrypto.verify(parsed.post);

  if (!verified) {
    return res.status(400).json({ error: 'Invalid post signature' });
  }

  // TODO: Handle the post

  res.status(200).json({});
});

app.use('/api/v1', apiV1);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});