"use client";

import { useRef, useCallback } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type { editor, IPosition, IRange } from "monaco-editor";

interface ConfigEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: "yaml" | "json" | "hocon";
  readOnly?: boolean;
  height?: string;
}

// Autocomplete suggestions for SpooqW
const stepKinds = [
  { label: "input", detail: "Batch data input", insertText: "kind: input\n    format: csv\n    path: /data/file.csv" },
  { label: "input-stream", detail: "Streaming input", insertText: "kind: input-stream\n    format: kafka\n    options:\n      kafka.bootstrap.servers: localhost:9092\n      subscribe: topic-name" },
  { label: "sql", detail: "SQL transformation", insertText: "kind: sql\n    sql: |\n      SELECT * FROM source_step" },
  { label: "output", detail: "Batch output", insertText: "kind: output\n    source: previous_step\n    format: parquet\n    mode: overwrite\n    path: /output/file.parquet" },
  { label: "output-stream", detail: "Streaming output", insertText: "kind: output-stream\n    source: previous_step\n    format: console\n    outputMode: append" },
  { label: "variable", detail: "Create variable", insertText: "kind: variable\n    sql: SELECT MAX(date) FROM source" },
  { label: "udf", detail: "Register UDF", insertText: "kind: udf\n    claz: com.example.MyUDF" },
  { label: "custom", detail: "Custom step", insertText: "kind: custom\n    claz: com.example.MyStep" },
];

const formats = [
  { label: "csv", detail: "CSV format" },
  { label: "json", detail: "JSON format" },
  { label: "parquet", detail: "Parquet format" },
  { label: "avro", detail: "Avro format" },
  { label: "orc", detail: "ORC format" },
  { label: "jdbc", detail: "JDBC connection" },
  { label: "kafka", detail: "Kafka topic" },
  { label: "delta", detail: "Delta Lake" },
  { label: "iceberg", detail: "Apache Iceberg" },
];

export function ConfigEditor({
  value,
  onChange,
  language = "yaml",
  readOnly = false,
  height = "500px",
}: ConfigEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = useCallback((editorInstance, monaco) => {
    editorRef.current = editorInstance;

    // Configure YAML language support
    monaco.languages.registerCompletionItemProvider("yaml", {
      provideCompletionItems: (model: editor.ITextModel, position: IPosition) => {
        const word = model.getWordUntilPosition(position);
        const range: IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const lineContent = model.getLineContent(position.lineNumber);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const suggestions: any[] = [];

        // Suggest step kinds after "kind:"
        if (lineContent.includes("kind:") && !lineContent.includes("kind: ")) {
          stepKinds.forEach((kind) => {
            suggestions.push({
              label: kind.label,
              kind: monaco.languages.CompletionItemKind.Enum,
              detail: kind.detail,
              insertText: kind.label,
              range,
            });
          });
        }

        // Suggest formats after "format:"
        if (lineContent.includes("format:") && !lineContent.includes("format: ")) {
          formats.forEach((format) => {
            suggestions.push({
              label: format.label,
              kind: monaco.languages.CompletionItemKind.Enum,
              detail: format.detail,
              insertText: format.label,
              range,
            });
          });
        }

        // General suggestions
        if (suggestions.length === 0) {
          const keywords = [
            "id",
            "desc",
            "steps",
            "kind",
            "format",
            "path",
            "sql",
            "source",
            "options",
            "schema",
            "cache",
            "show",
            "mode",
            "partitionBy",
            "repartition",
            "dependsOn",
            "outputMode",
            "trigger",
          ];

          keywords.forEach((kw) => {
            suggestions.push({
              label: kw,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: `${kw}: `,
              range,
            });
          });
        }

        return { suggestions };
      },
    });

    // Add snippet for new step
    monaco.languages.registerCompletionItemProvider("yaml", {
      triggerCharacters: ["-"],
      provideCompletionItems: (model: editor.ITextModel, position: IPosition) => {
        const word = model.getWordUntilPosition(position);
        const range: IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        return {
          suggestions: [
            {
              label: "step (input)",
              kind: monaco.languages.CompletionItemKind.Snippet,
              detail: "Add input step",
              insertText: ` id: \${1:step_name}
    kind: input
    format: \${2:csv}
    path: \${3:/data/file.csv}
    cache: true`,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            },
            {
              label: "step (sql)",
              kind: monaco.languages.CompletionItemKind.Snippet,
              detail: "Add SQL step",
              insertText: ` id: \${1:step_name}
    kind: sql
    sql: |
      SELECT * FROM \${2:source_step}`,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            },
            {
              label: "step (output)",
              kind: monaco.languages.CompletionItemKind.Snippet,
              detail: "Add output step",
              insertText: ` id: \${1:step_name}
    kind: output
    source: \${2:source_step}
    format: \${3:parquet}
    mode: overwrite
    path: \${4:/output/file.parquet}`,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            },
          ],
        };
      },
    });

    // Custom theme
    monaco.editor.defineTheme("spooqw-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "c678dd" },
        { token: "string", foreground: "98c379" },
        { token: "number", foreground: "d19a66" },
        { token: "comment", foreground: "5c6370", fontStyle: "italic" },
      ],
      colors: {
        "editor.background": "#0a0a0a",
        "editor.foreground": "#abb2bf",
        "editor.lineHighlightBackground": "#1a1a1a",
        "editorLineNumber.foreground": "#4b5263",
        "editorIndentGuide.background1": "#3b4048",
        "editor.selectionBackground": "#3e4451",
      },
    });

    monaco.editor.setTheme("spooqw-dark");
  }, []);

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      onChange={(value) => onChange(value || "")}
      onMount={handleEditorMount}
      options={{
        readOnly,
        minimap: { enabled: true, scale: 0.75 },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "on",
        folding: true,
        renderLineHighlight: "all",
        bracketPairColorization: { enabled: true },
        formatOnPaste: true,
        formatOnType: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        padding: { top: 16, bottom: 16 },
      }}
      theme="vs-dark"
    />
  );
}
