import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/lib/api';

describe('API Client', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getPipelines', () => {
    it('should fetch pipelines', async () => {
      const mockPipelines = [
        { id: '1', name: 'Pipeline 1', steps: [] },
        { id: '2', name: 'Pipeline 2', steps: [] },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPipelines,
      });

      const result = await api.getPipelines();

      expect(result).toEqual(mockPipelines);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/pipelines'),
        expect.any(Object)
      );
    });

    it('should handle errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      });

      await expect(api.getPipelines()).rejects.toThrow('Server error');
    });
  });

  describe('getPipeline', () => {
    it('should fetch a single pipeline', async () => {
      const mockPipeline = { id: '1', name: 'Test Pipeline', steps: [] };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPipeline,
      });

      const result = await api.getPipeline('1');

      expect(result).toEqual(mockPipeline);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/pipelines/1'),
        expect.any(Object)
      );
    });
  });

  describe('createPipeline', () => {
    it('should create a pipeline', async () => {
      const newPipeline = { name: 'New Pipeline', config: 'yaml', steps: [] };
      const createdPipeline = { id: '123', ...newPipeline };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => createdPipeline,
      });

      const result = await api.createPipeline(newPipeline);

      expect(result).toEqual(createdPipeline);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/pipelines'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newPipeline),
        })
      );
    });
  });

  describe('updatePipeline', () => {
    it('should update a pipeline', async () => {
      const updates = { name: 'Updated Name' };
      const updatedPipeline = { id: '1', name: 'Updated Name', steps: [] };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedPipeline,
      });

      const result = await api.updatePipeline('1', updates);

      expect(result).toEqual(updatedPipeline);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/pipelines/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );
    });
  });

  describe('deletePipeline', () => {
    it('should delete a pipeline', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.deletePipeline('1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/pipelines/1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('runPipeline', () => {
    it('should trigger a pipeline run', async () => {
      const mockRun = { id: 'run-1', pipelineId: '1', status: 'running' };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRun,
      });

      const result = await api.runPipeline('1');

      expect(result).toEqual(mockRun);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/pipelines/1/run'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('getRuns', () => {
    it('should fetch runs with filters', async () => {
      const mockRuns = [{ id: 'run-1', status: 'success' }];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRuns,
      });

      const result = await api.getRuns({ pipelineId: '1', status: 'success' });

      expect(result).toEqual(mockRuns);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/runs\?.*pipelineId=1.*status=success/),
        expect.any(Object)
      );
    });
  });

  describe('getConnections', () => {
    it('should fetch connections', async () => {
      const mockConnections = [{ id: '1', name: 'DB', type: 'jdbc' }];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConnections,
      });

      const result = await api.getConnections();

      expect(result).toEqual(mockConnections);
    });
  });

  describe('testConnection', () => {
    it('should test a connection', async () => {
      const mockResult = { data: { success: true, message: 'Connected' } };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await api.testConnection('1');

      expect(result).toEqual(mockResult);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/connections/1/test'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('getSchedules', () => {
    it('should fetch schedules', async () => {
      const mockSchedules = [
        { id: '1', pipelineId: '1', cronExpression: '0 0 * * *', enabled: true },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSchedules,
      });

      const result = await api.getSchedules();

      expect(result).toEqual(mockSchedules);
    });
  });

  describe('createSchedule', () => {
    it('should create a schedule', async () => {
      const newSchedule = {
        pipelineId: '1',
        cronExpression: '0 0 * * *',
        timezone: 'UTC',
        enabled: true,
      };
      const createdSchedule = { id: 'sched-1', ...newSchedule };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => createdSchedule,
      });

      const result = await api.createSchedule(newSchedule);

      expect(result).toEqual(createdSchedule);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/schedules'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newSchedule),
        })
      );
    });
  });
});
