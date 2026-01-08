// YAML utilities for SpooqW

import type { Step } from '@/types';

/**
 * Convert an array of Steps to YAML configuration
 */
export function stepsToYaml(steps: Step[], pipelineId?: string, pipelineDesc?: string): string {
  const lines: string[] = [];
  
  // Add pipeline header
  lines.push(`id: ${pipelineId || 'my-pipeline'}`);
  if (pipelineDesc) {
    lines.push(`desc: ${pipelineDesc}`);
  }
  lines.push('');
  lines.push('steps:');
  
  for (const step of steps) {
    lines.push(`  - id: ${step.id}`);
    lines.push(`    kind: ${step.kind}`);
    
    if (step.shortDesc) {
      lines.push(`    shortDesc: ${step.shortDesc}`);
    }
    
    if (step.source) {
      lines.push(`    source: ${step.source}`);
    }
    
    if (step.format) {
      lines.push(`    format: ${step.format}`);
    }
    
    if (step.path) {
      lines.push(`    path: ${step.path}`);
    }
    
    if (step.sql) {
      // Handle multi-line SQL
      if (step.sql.includes('\n')) {
        lines.push('    sql: |');
        const sqlLines = step.sql.split('\n');
        for (const sqlLine of sqlLines) {
          lines.push(`      ${sqlLine}`);
        }
      } else {
        lines.push(`    sql: ${step.sql}`);
      }
    }
    
    if (step.cache !== undefined) {
      lines.push(`    cache: ${step.cache}`);
    }
    
    if (step.show !== undefined) {
      lines.push(`    show: ${step.show}`);
    }
    
    if (step.schema) {
      lines.push(`    schema: ${step.schema}`);
    }
    
    if (step.options && Object.keys(step.options).length > 0) {
      lines.push('    options:');
      for (const [key, value] of Object.entries(step.options)) {
        lines.push(`      ${key}: ${value}`);
      }
    }
    
    if (step.dependsOn && step.dependsOn.length > 0) {
      lines.push('    dependsOn:');
      for (const dep of step.dependsOn) {
        lines.push(`      - ${dep}`);
      }
    }
    
    // Add empty line between steps for readability
    lines.push('');
  }
  
  return lines.join('\n').trim();
}

/**
 * Parse YAML configuration to extract steps
 * Note: This is a simple parser. For production, use a proper YAML library.
 */
export function parseYamlSteps(yaml: string): Step[] {
  const steps: Step[] = [];
  const stepsMatch = yaml.match(/steps:\s*\n([\s\S]*?)(?=\n[a-zA-Z]|$)/);
  
  if (!stepsMatch) return steps;
  
  const stepsContent = stepsMatch[1];
  // Split by step markers, handling both "- id:" and "  - id:" formats
  const stepBlocks = stepsContent.split(/\n\s*-\s+(?=id:)/).filter(Boolean);
  
  for (const block of stepBlocks) {
    const step = parseStepBlock(block);
    if (step) {
      steps.push(step);
    }
  }
  
  return steps;
}

function parseStepBlock(block: string): Step | null {
  const idMatch = block.match(/id:\s*([^\s\n]+)/);
  const kindMatch = block.match(/kind:\s*([^\s\n]+)/);
  
  if (!idMatch || !kindMatch) return null;
  
  const step: Step = {
    id: idMatch[1],
    kind: kindMatch[1] as Step['kind'],
  };
  
  // Parse optional fields
  const shortDescMatch = block.match(/shortDesc:\s*([^\n]+)/);
  if (shortDescMatch) step.shortDesc = shortDescMatch[1].trim();
  
  const descMatch = block.match(/desc:\s*([^\n]+)/);
  if (descMatch) step.desc = descMatch[1].trim();
  
  const formatMatch = block.match(/format:\s*([^\s\n]+)/);
  if (formatMatch) step.format = formatMatch[1];
  
  const sourceMatch = block.match(/source:\s*([^\s\n]+)/);
  if (sourceMatch) step.source = sourceMatch[1];
  
  const pathMatch = block.match(/path:\s*([^\n]+)/);
  if (pathMatch) step.path = pathMatch[1].trim();
  
  const schemaMatch = block.match(/schema:\s*([^\n]+)/);
  if (schemaMatch) step.schema = schemaMatch[1].trim();
  
  const cacheMatch = block.match(/cache:\s*(true|false)/);
  if (cacheMatch) step.cache = cacheMatch[1] === 'true';
  
  const showMatch = block.match(/show:\s*(true|false)/);
  if (showMatch) step.show = showMatch[1] === 'true';
  
  // Parse SQL (handle multi-line)
  const sqlPipeMatch = block.match(/sql:\s*\|\s*\n([\s\S]*?)(?=\n\s*[a-zA-Z]|$)/);
  if (sqlPipeMatch) {
    // Multi-line SQL
    const sqlLines = sqlPipeMatch[1].split('\n').map(line => line.replace(/^\s{6}/, ''));
    step.sql = sqlLines.join('\n').trim();
  } else {
    const sqlMatch = block.match(/sql:\s*([^\n]+)/);
    if (sqlMatch) step.sql = sqlMatch[1].trim();
  }
  
  // Parse options (simplified)
  const optionsMatch = block.match(/options:\s*\n((?:\s+[a-zA-Z_]+:\s*[^\n]+\n?)+)/);
  if (optionsMatch) {
    step.options = {};
    const optionLines = optionsMatch[1].trim().split('\n');
    for (const line of optionLines) {
      const optMatch = line.match(/\s*([a-zA-Z_]+):\s*(.+)/);
      if (optMatch) {
        step.options[optMatch[1]] = optMatch[2].trim();
      }
    }
  }
  
  // Parse dependsOn
  const dependsOnMatch = block.match(/dependsOn:\s*\n((?:\s+-\s*[^\n]+\n?)+)/);
  if (dependsOnMatch) {
    step.dependsOn = [];
    const depLines = dependsOnMatch[1].trim().split('\n');
    for (const line of depLines) {
      const depMatch = line.match(/\s*-\s*(.+)/);
      if (depMatch) {
        step.dependsOn.push(depMatch[1].trim());
      }
    }
  }
  
  return step;
}

/**
 * Extract pipeline metadata from YAML
 */
export function extractPipelineMetadata(yaml: string): { id?: string; desc?: string } {
  const idMatch = yaml.match(/^id:\s*([^\n]+)/m);
  const descMatch = yaml.match(/^desc:\s*([^\n]+)/m);
  
  return {
    id: idMatch?.[1]?.trim(),
    desc: descMatch?.[1]?.trim(),
  };
}

/**
 * Merge steps into existing YAML while preserving other configuration
 */
export function mergeStepsIntoYaml(existingYaml: string, steps: Step[]): string {
  const metadata = extractPipelineMetadata(existingYaml);
  return stepsToYaml(steps, metadata.id, metadata.desc);
}

/**
 * Validate YAML configuration
 */
export function validateYaml(yaml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for required fields
  if (!yaml.match(/^id:\s*\S+/m)) {
    errors.push("Pipeline must have an 'id' field");
  }
  
  if (!yaml.includes('steps:')) {
    errors.push("Pipeline must have a 'steps' section");
  }
  
  // Parse and validate steps
  const steps = parseYamlSteps(yaml);
  
  if (steps.length === 0) {
    errors.push("Pipeline must have at least one step");
  }
  
  const validKinds = [
    'input', 'input-stream', 'sql', 'variable', 'script',
    'custom', 'customInput', 'avro-serde', 'udf', 'output', 'output-stream', 'parse-json'
  ];
  
  const stepIds = new Set<string>();
  for (const step of steps) {
    // Check for duplicate IDs
    if (stepIds.has(step.id)) {
      errors.push(`Duplicate step ID: '${step.id}'`);
    }
    stepIds.add(step.id);
    
    // Validate step kind
    if (!validKinds.includes(step.kind)) {
      errors.push(`Invalid step kind '${step.kind}' in step '${step.id}'`);
    }
    
    // Validate required fields based on kind
    if ((step.kind === 'input' || step.kind === 'output') && !step.format) {
      errors.push(`Step '${step.id}' of kind '${step.kind}' should specify a format`);
    }
    
    // Validate source references
    if (step.source && !stepIds.has(step.source) && step.source !== steps.find(s => s.id === step.source)?.id) {
      // Source might reference a step defined later, check all steps
      const sourceExists = steps.some(s => s.id === step.source);
      if (!sourceExists) {
        errors.push(`Step '${step.id}' references unknown source '${step.source}'`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
