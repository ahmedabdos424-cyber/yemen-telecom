import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { getFlag, setFlag, listFlags, isEnabled, clearFlagCache } from '../feature-flags';

const router = Router();

router.get('/', authenticateToken, requireRole('manager'), async (_req: Request, res: Response) => {
  try {
    const flags = await listFlags();
    res.json({ flags });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list feature flags' });
  }
});

router.get('/:key', authenticateToken, requireRole('manager'), async (req: Request, res: Response) => {
  try {
    const flag = await getFlag(req.params.key);
    if (!flag) {
      return res.status(404).json({ error: 'Flag not found' });
    }
    res.json({ flag });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get feature flag' });
  }
});

router.post('/', authenticateToken, requireRole('manager'), async (req: Request, res: Response) => {
  try {
    const { key, enabled, value } = req.body;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'key is required' });
    }
    await setFlag(key, !!enabled, value || {});
    const flag = await getFlag(key);
    res.status(201).json({ flag });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set feature flag' });
  }
});

router.put('/:key', authenticateToken, requireRole('manager'), async (req: Request, res: Response) => {
  try {
    const { enabled, value } = req.body;
    await setFlag(req.params.key, !!enabled, value || {});
    const flag = await getFlag(req.params.key);
    res.json({ flag });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update feature flag' });
  }
});

router.post('/:key/toggle', authenticateToken, requireRole('manager'), async (req: Request, res: Response) => {
  try {
    const flag = await getFlag(req.params.key);
    const newEnabled = !(flag?.enabled ?? false);
    await setFlag(req.params.key, newEnabled, flag?.value || {});
    const updated = await getFlag(req.params.key);
    res.json({ flag: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle feature flag' });
  }
});

router.post('/clear-cache', authenticateToken, requireRole('manager'), async (_req: Request, res: Response) => {
  clearFlagCache();
  res.json({ message: 'Feature flag cache cleared' });
});

router.get('/public/check/:key', async (req: Request, res: Response) => {
  try {
    const enabled = await isEnabled(req.params.key);
    res.json({ key: req.params.key, enabled });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check feature flag' });
  }
});

export default router;
