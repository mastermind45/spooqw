"use client";

import { useState, useEffect } from "react";
import { Loader2, Table as TableIcon, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";

interface DataPreviewProps {
  runId: string;
  stepId: string;
}

interface SchemaColumn {
  name: string;
  type: string;
}

interface PreviewData {
  schema: SchemaColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

export function DataPreview({ runId, stepId }: DataPreviewProps) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4242/api/v2'}/runs/${runId}/preview/${stepId}`
      );
      if (!response.ok) throw new Error('Failed to fetch preview');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [runId, stepId]);

  const handleExport = () => {
    if (!data) return;
    
    // Export as CSV
    const headers = data.schema.map(c => c.name).join(',');
    const rows = data.rows.map(row => 
      data.schema.map(c => {
        const val = row[c.name];
        if (typeof val === 'string' && val.includes(',')) {
          return `"${val}"`;
        }
        return val;
      }).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stepId}-preview.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={fetchPreview}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <TableIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TableIcon className="h-4 w-4" />
              Data Preview: {stepId}
            </CardTitle>
            <CardDescription>
              Showing {data.rows.length} of {data.rowCount.toLocaleString()} rows
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchPreview}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Schema */}
        <div className="px-6 pb-3 flex flex-wrap gap-2">
          {data.schema.map((col) => (
            <Badge key={col.name} variant="outline" className="font-mono text-xs">
              {col.name}: <span className="text-muted-foreground ml-1">{col.type}</span>
            </Badge>
          ))}
        </div>

        {/* Data Table */}
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                {data.schema.map((col) => (
                  <TableHead key={col.name} className="min-w-[120px]">
                    <div className="flex flex-col">
                      <span>{col.name}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {col.type}
                      </span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="text-center text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  {data.schema.map((col) => (
                    <TableCell key={col.name} className="font-mono text-sm">
                      {formatValue(row[col.name], col.type)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function formatValue(value: unknown, type: string): string {
  if (value === null || value === undefined) {
    return '(null)';
  }
  
  if (type === 'timestamp' || type === 'date') {
    try {
      return new Date(value as string).toLocaleString();
    } catch {
      return String(value);
    }
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value);
}

// Inline preview for run details
export function StepDataPreview({ runId, stepId }: DataPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setExpanded(!expanded)}
        className="w-full justify-start"
      >
        <TableIcon className="mr-2 h-4 w-4" />
        {expanded ? 'Hide' : 'Show'} Data Preview
      </Button>
      
      {expanded && <DataPreview runId={runId} stepId={stepId} />}
    </div>
  );
}
