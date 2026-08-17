import { Router } from 'express';
import settingsRouter from './settings';
import transactionsRouter from './transactions';
import identitiesRouter from './identities';
import auditRouter from './audit';
import sellersRouter from './sellers';
import batchRouter from './batch';
import systemRouter from './system';
import { ensureIdentityRiskSchema } from './bootstrap';

const router = Router();

// Each sub-router owns a focused slice of the admin surface. Paths are kept
// identical to the previous monolithic admin.ts so no client or test breaks.
router.use(settingsRouter);
router.use(transactionsRouter);
router.use(identitiesRouter);
router.use(auditRouter);
router.use(sellersRouter);
router.use(batchRouter);
router.use(systemRouter);

export default router;
export { ensureIdentityRiskSchema };
