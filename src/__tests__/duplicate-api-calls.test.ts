import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('P0-04 Duplicate API Call Regression Tests', () => {

  describe('Agent creation — AddAgentView delegates to hook', () => {
    const src = readFileSync(join(__dirname, '../components/AddAgentView.tsx'), 'utf8');

    it('AddAgentView does NOT import or call api.createAgent', () => {
      const lines = src.split('\n');
      const createAgentRefs = lines.filter(l => l.includes('createAgent'));
      expect(createAgentRefs.length).toBe(0);
    });

    it('AddAgentView calls onAddAgent instead of api directly', () => {
      expect(src).toContain('onAddAgent');
    });
  });

  describe('Seller creation — AddSellerForm does not duplicate API calls with hook', () => {
    const formSrc = readFileSync(join(__dirname, '../components/AddSellerForm.tsx'), 'utf8');
    const hookSrc = readFileSync(join(__dirname, '../hooks/useAgentSellerState.ts'), 'utf8');

    it('AddSellerForm only calls api.createSeller once', () => {
      const createSellerRefs = formSrc.match(/createSeller/g);
      expect(createSellerRefs?.length).toBeLessThanOrEqual(1);
    });

    it('useAgentSellerState.handleAddSellerForAgent does NOT call api.createSeller', () => {
      const handlerBody = hookSrc.split('const handleAddSellerForAgent')[1]?.split('\n');
      const createSellerCalls = handlerBody?.filter(l => l.includes('createSeller'));
      expect(createSellerCalls?.length ?? 0).toBe(0);
    });
  });

  describe('SIM activation — ActivateSimForm does not duplicate API calls with hook', () => {
    const formSrc = readFileSync(join(__dirname, '../components/ActivateSimForm.tsx'), 'utf8');
    const hookSrc = readFileSync(join(__dirname, '../hooks/useAgentSellerState.ts'), 'utf8');

    it('ActivateSimForm does NOT call api.createOperation', () => {
      const lines = formSrc.split('\n');
      const opCalls = lines.filter(l => l.includes('createOperation'));
      expect(opCalls.length).toBe(0);
    });

    it('ActivateSimForm calls handleSimActivationForSeller via onSimActivated prop', () => {
      expect(formSrc).toContain('onSimActivated');
      // The handler should delegate to the hook
      expect(formSrc).not.toContain('handleSimActivationForSeller(');
    });

    it('useAgentSellerState handleSimActivationForSeller calls api.createOperation exactly once', () => {
      const handlerBody = hookSrc.split('const handleSimActivationForSeller')[1]?.split('\n').slice(0, 30).join('\n');
      const createOpCalls = handlerBody?.match(/createOperation/g);
      expect(createOpCalls?.length).toBe(1);
    });
  });
});
