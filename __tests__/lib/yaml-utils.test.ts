import { describe, it, expect } from 'vitest';
import {
  stepsToYaml,
  parseYamlSteps,
  extractPipelineMetadata,
  validateYaml,
  mergeStepsIntoYaml,
} from '@/lib/yaml-utils';
import type { Step } from '@/types';

describe('yaml-utils', () => {
  describe('stepsToYaml', () => {
    it('should generate valid YAML from steps', () => {
      const steps: Step[] = [
        { id: 'input_step', kind: 'input', format: 'csv', path: '/data/file.csv' },
        { id: 'transform', kind: 'sql', sql: 'SELECT * FROM input_step' },
        { id: 'output', kind: 'output', source: 'transform', format: 'parquet', path: '/output/result.parquet' },
      ];

      const yaml = stepsToYaml(steps, 'test-pipeline', 'Test description');

      expect(yaml).toContain('id: test-pipeline');
      expect(yaml).toContain('desc: Test description');
      expect(yaml).toContain('steps:');
      expect(yaml).toContain('- id: input_step');
      expect(yaml).toContain('kind: input');
      expect(yaml).toContain('format: csv');
      expect(yaml).toContain('- id: transform');
      expect(yaml).toContain('kind: sql');
      expect(yaml).toContain('sql: SELECT * FROM input_step');
      expect(yaml).toContain('- id: output');
      expect(yaml).toContain('source: transform');
    });

    it('should handle multi-line SQL', () => {
      const steps: Step[] = [
        { id: 'query', kind: 'sql', sql: 'SELECT *\nFROM table\nWHERE x = 1' },
      ];

      const yaml = stepsToYaml(steps);

      expect(yaml).toContain('sql: |');
      expect(yaml).toContain('SELECT *');
      expect(yaml).toContain('FROM table');
    });

    it('should handle steps with options', () => {
      const steps: Step[] = [
        { id: 'input', kind: 'input', format: 'csv', options: { header: 'true', delimiter: ';' } },
      ];

      const yaml = stepsToYaml(steps);

      expect(yaml).toContain('options:');
      expect(yaml).toContain('header: true');
      expect(yaml).toContain('delimiter: ;');
    });

    it('should handle empty steps array', () => {
      const yaml = stepsToYaml([]);

      expect(yaml).toContain('id: my-pipeline');
      expect(yaml).toContain('steps:');
    });
  });

  describe('parseYamlSteps', () => {
    it('should parse steps from YAML', () => {
      const yaml = `
id: test-pipeline
steps:
  - id: input_step
    kind: input
    format: csv
    path: /data/file.csv

  - id: transform
    kind: sql
    sql: SELECT * FROM input_step
`;

      const steps = parseYamlSteps(yaml);

      expect(steps).toHaveLength(2);
      expect(steps[0].id).toBe('input_step');
      expect(steps[0].kind).toBe('input');
      expect(steps[0].format).toBe('csv');
      expect(steps[1].id).toBe('transform');
      expect(steps[1].kind).toBe('sql');
    });

    it('should handle empty YAML', () => {
      const steps = parseYamlSteps('');
      expect(steps).toHaveLength(0);
    });

    it('should handle YAML without steps', () => {
      const steps = parseYamlSteps('id: test\ndesc: description');
      expect(steps).toHaveLength(0);
    });

    it('should parse source references', () => {
      const yaml = `
steps:
  - id: output
    kind: output
    source: transform
    format: parquet
`;

      const steps = parseYamlSteps(yaml);
      expect(steps[0].source).toBe('transform');
    });
  });

  describe('extractPipelineMetadata', () => {
    it('should extract id and desc', () => {
      const yaml = `
id: my-pipeline
desc: My description
steps:
  - id: step1
    kind: input
`;

      const metadata = extractPipelineMetadata(yaml);

      expect(metadata.id).toBe('my-pipeline');
      expect(metadata.desc).toBe('My description');
    });

    it('should handle missing fields', () => {
      const yaml = 'steps:\n  - id: step1\n    kind: input';

      const metadata = extractPipelineMetadata(yaml);

      expect(metadata.id).toBeUndefined();
      expect(metadata.desc).toBeUndefined();
    });
  });

  describe('validateYaml', () => {
    it('should validate valid YAML', () => {
      const yaml = `
id: test-pipeline
steps:
  - id: input
    kind: input
    format: csv
`;

      const result = validateYaml(yaml);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing id', () => {
      const yaml = `
steps:
  - id: input
    kind: input
`;

      const result = validateYaml(yaml);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Pipeline must have an 'id' field");
    });

    it('should detect missing steps', () => {
      const yaml = 'id: test-pipeline';

      const result = validateYaml(yaml);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Pipeline must have a 'steps' section");
    });

    it('should detect invalid step kind', () => {
      const yaml = `
id: test
steps:
  - id: step1
    kind: invalid-kind
`;

      const result = validateYaml(yaml);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid step kind'))).toBe(true);
    });

    it('should detect duplicate step IDs', () => {
      const yaml = `
id: test
steps:
  - id: duplicate
    kind: input
  - id: duplicate
    kind: output
`;

      const result = validateYaml(yaml);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate step ID'))).toBe(true);
    });
  });

  describe('mergeStepsIntoYaml', () => {
    it('should preserve pipeline metadata when merging', () => {
      const existingYaml = `
id: original-id
desc: Original description
steps:
  - id: old_step
    kind: input
`;

      const newSteps: Step[] = [
        { id: 'new_step', kind: 'output', format: 'parquet' },
      ];

      const result = mergeStepsIntoYaml(existingYaml, newSteps);

      expect(result).toContain('id: original-id');
      expect(result).toContain('desc: Original description');
      expect(result).toContain('- id: new_step');
      expect(result).not.toContain('old_step');
    });
  });
});
