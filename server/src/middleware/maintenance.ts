import { Request, Response, NextFunction } from 'express';
import { getFlag } from '../feature-flags';

let maintenanceMode = false;
let maintenanceMessage = 'System maintenance in progress. Please try again later.';

export async function maintenanceCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (maintenanceMode) {
    res.status(503).json({
      error: 'Service Unavailable',
      message: maintenanceMessage,
      retryAfter: 300,
    });
    return;
  }
  next();
}

export async function refreshMaintenanceMode(): Promise<void> {
  const flag = await getFlag('maintenance_mode');
  if (flag) {
    maintenanceMode = flag.enabled;
    maintenanceMessage = (flag.value as any)?.message || 'System maintenance in progress. Please try again later.';
  }
}

export function setMaintenanceMode(enabled: boolean, message?: string): void {
  maintenanceMode = enabled;
  if (message) maintenanceMessage = message;
}

export function isMaintenanceMode(): boolean {
  return maintenanceMode;
}
