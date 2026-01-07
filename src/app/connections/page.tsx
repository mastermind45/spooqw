"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Database,
  Server,
  Cloud,
  MoreVertical,
  Trash2,
  Edit,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Connection, ConnectionType } from "@/types";

const connectionTypeConfig: Record<
  ConnectionType,
  { icon: typeof Database; label: string; color: string }
> = {
  jdbc: { icon: Database, label: "JDBC Database", color: "text-blue-500" },
  kafka: { icon: Server, label: "Apache Kafka", color: "text-orange-500" },
  s3: { icon: Cloud, label: "Amazon S3", color: "text-yellow-500" },
  gcs: { icon: Cloud, label: "Google Cloud Storage", color: "text-green-500" },
  "azure-blob": { icon: Cloud, label: "Azure Blob Storage", color: "text-blue-400" },
  hdfs: { icon: Server, label: "HDFS", color: "text-purple-500" },
  mongodb: { icon: Database, label: "MongoDB", color: "text-green-600" },
  hbase: { icon: Database, label: "HBase", color: "text-red-500" },
};

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [newConnectionOpen, setNewConnectionOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<Connection | null>(null);
  const [deleting, setDeleting] = useState(false);

  // New connection form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<ConnectionType>("jdbc");
  const [newConfig, setNewConfig] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, []);

  async function fetchConnections() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getConnections();
      setConnections(data);
    } catch (err) {
      console.error("Failed to fetch connections:", err);
      setError(err instanceof Error ? err.message : "Failed to load connections");
    } finally {
      setLoading(false);
    }
  }

  const filteredConnections = connections.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.type.toLowerCase().includes(search.toLowerCase())
  );

  const handleTest = async (id: string) => {
    setTestingId(id);
    
    try {
      const result = await api.testConnection(id);
      
      setConnections((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                lastTestedAt: new Date().toISOString(),
                lastTestSuccess: result.data?.success ?? false,
              }
            : c
        )
      );
      
      if (result.data?.success) {
        toast.success("Connection test successful!");
      } else {
        toast.error(result.data?.message || "Connection test failed");
      }
    } catch (err) {
      console.error("Failed to test connection:", err);
      toast.error("Failed to test connection");
    } finally {
      setTestingId(null);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Connection name is required");
      return;
    }

    setCreating(true);
    
    try {
      // Parse config JSON
      let configObj: Record<string, string> = {};
      if (newConfig.trim()) {
        try {
          configObj = JSON.parse(newConfig);
        } catch {
          toast.error("Invalid JSON configuration");
          setCreating(false);
          return;
        }
      }

      const newConnection = await api.createConnection({
        name: newName,
        type: newType,
        config: configObj,
      });

      setConnections((prev) => [...prev, newConnection]);
      setNewConnectionOpen(false);
      setNewName("");
      setNewType("jdbc");
      setNewConfig("");
      toast.success("Connection created!");
    } catch (err) {
      console.error("Failed to create connection:", err);
      toast.error("Failed to create connection");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;

    setDeleting(true);
    
    try {
      await api.deleteConnection(deleteDialog.id);
      setConnections((prev) => prev.filter((c) => c.id !== deleteDialog.id));
      setDeleteDialog(null);
      toast.success("Connection deleted");
    } catch (err) {
      console.error("Failed to delete connection:", err);
      toast.error("Failed to delete connection");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Connections</h1>
          <p className="text-muted-foreground">
            Manage data source connections for your pipelines.
          </p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Failed to connect to API: {error}
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={fetchConnections}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Connections</h1>
          <p className="text-muted-foreground">
            Manage data source connections for your pipelines.
          </p>
        </div>
        <Dialog open={newConnectionOpen} onOpenChange={setNewConnectionOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Connection
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Connection</DialogTitle>
              <DialogDescription>
                Add a new data source connection to use in your pipelines.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="conn-name">Connection Name</Label>
                <Input 
                  id="conn-name" 
                  placeholder="My Database"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Connection Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(connectionTypeConfig).map(([type, config]) => {
                    const Icon = config.icon;
                    return (
                      <Button
                        key={type}
                        variant={newType === type ? "default" : "outline"}
                        className="justify-start h-auto py-3"
                        onClick={() => setNewType(type as ConnectionType)}
                      >
                        <Icon className={`mr-2 h-4 w-4 ${newType === type ? "" : config.color}`} />
                        <span className="text-sm">{config.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="conn-config">Configuration (JSON)</Label>
                <Textarea
                  id="conn-config"
                  placeholder='{"url": "jdbc:postgresql://localhost:5432/db", "user": "admin"}'
                  value={newConfig}
                  onChange={(e) => setNewConfig(e.target.value)}
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewConnectionOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Connection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search connections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary">{filteredConnections.length} connections</Badge>
      </div>

      {filteredConnections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No connections yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add data source connections to use in your pipelines.
            </p>
            <Button onClick={() => setNewConnectionOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredConnections.map((connection) => {
            const typeConfig = connectionTypeConfig[connection.type] || connectionTypeConfig.jdbc;
            const Icon = typeConfig.icon;
            const isTesting = testingId === connection.id;

            return (
              <Card key={connection.id} className="group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className={`h-5 w-5 ${typeConfig.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{connection.name}</CardTitle>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {typeConfig.label}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTest(connection.id)}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Test Connection
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteDialog(connection)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      {Object.entries(connection.config)
                        .slice(0, 2)
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span>{key}:</span>
                            <span className="font-mono text-xs truncate max-w-[150px]">
                              {key.toLowerCase().includes("password") || key.toLowerCase().includes("secret") 
                                ? "••••••" 
                                : value}
                            </span>
                          </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        {isTesting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            <span className="text-sm text-muted-foreground">Testing...</span>
                          </>
                        ) : connection.lastTestedAt ? (
                          <>
                            {connection.lastTestSuccess ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm text-muted-foreground">
                              {connection.lastTestSuccess ? "Connected" : "Failed"}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not tested</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTest(connection.id)}
                        disabled={isTesting}
                      >
                        {isTesting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Connection</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteDialog?.name}&quot;? 
              Pipelines using this connection may stop working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
