"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Plus, Trash2, GripVertical, FolderPlus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

interface BiomarkerRow {
  id: string;
  name: string;
  unit: string;
  referenceRange: string;
}

interface CategoryGroup {
  id: string;
  categoryName: string;
  rows: BiomarkerRow[];
}

export default function LabTestBiomarkersPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const pathname = usePathname();
  const { testId } = use(params);
  const { token } = useAuth();
  const [testDetails, setTestDetails] = useState<any>(null);
  
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 1. Fetch test details
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/catalog`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then((data: any[]) => {
        const test = data.find(t => t.id === testId);
        if (test) setTestDetails(test);
      });

    // 2. Fetch biomarkers and group them
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/tests/${testId}/biomarkers`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then((data: any[]) => {
        // Group by category
        const groupedMap = new Map<string, CategoryGroup>();
        
        data.forEach(b => {
          const catName = b.category || "";
          if (!groupedMap.has(catName)) {
            groupedMap.set(catName, {
              id: crypto.randomUUID(),
              categoryName: catName,
              rows: []
            });
          }
          groupedMap.get(catName)!.rows.push({
            id: b.id || crypto.randomUUID(),
            name: b.name,
            unit: b.unit || "",
            referenceRange: b.referenceRange || ""
          });
        });

        // If no data, start with an empty unnamed category
        if (groupedMap.size === 0) {
          groupedMap.set("", { id: crypto.randomUUID(), categoryName: "", rows: [] });
        }

        setGroups(Array.from(groupedMap.values()));
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load template rows");
        setLoading(false);
      });
  }, [testId]);

  // --- Handlers ---

  const handleAddCategory = () => {
    setGroups([
      ...groups,
      { id: crypto.randomUUID(), categoryName: "NEW CATEGORY", rows: [] }
    ]);
  };

  const handleRemoveCategory = (groupId: string) => {
    setGroups(groups.filter(g => g.id !== groupId));
  };

  const updateCategoryName = (groupId: string, newName: string) => {
    setGroups(groups.map(g => g.id === groupId ? { ...g, categoryName: newName } : g));
  };

  const handleAddRow = (groupId: string) => {
    setGroups(groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          rows: [...g.rows, { id: crypto.randomUUID(), name: "", unit: "", referenceRange: "" }]
        };
      }
      return g;
    }));
  };

  const handleRemoveRow = (groupId: string, rowId: string) => {
    setGroups(groups.map(g => {
      if (g.id === groupId) {
        return { ...g, rows: g.rows.filter(r => r.id !== rowId) };
      }
      return g;
    }));
  };

  const updateRow = (groupId: string, rowId: string, field: keyof BiomarkerRow, value: string) => {
    setGroups(groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          rows: g.rows.map(r => r.id === rowId ? { ...r, [field]: value } : r)
        };
      }
      return g;
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Flatten groups into biomarkers array with orderIndex
      let globalIndex = 1;
      const flatBiomarkers: any[] = [];
      
      groups.forEach(group => {
        group.rows.forEach(row => {
          flatBiomarkers.push({
            name: row.name,
            category: group.categoryName.trim() === "" ? null : group.categoryName.trim(),
            unit: row.unit || null,
            referenceRange: row.referenceRange || null,
            orderIndex: globalIndex++
          });
        });
      });

      const payload = { biomarkers: flatBiomarkers };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/tests/${testId}/biomarkers`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      
      toast.success("Template rows saved successfully!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href={pathname.split('/').slice(0, -1).join('/')}>
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Template Manager</h2>
          <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
            Managing rows for <Badge variant="secondary" className="font-mono">{testDetails?.code}</Badge> {testDetails?.name}
          </p>
        </div>
        <div className="ml-auto">
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Biomarkers & Categories</CardTitle>
          <CardDescription>
            Group related tests under category headers (e.g. "DIFFERENTIAL COUNT"). 
            Leave the category name empty for tests that don't need a group header.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {groups.map((group, groupIndex) => (
            <div key={group.id} className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
              {/* Category Header */}
              <div className="bg-muted/30 p-3 border-b flex items-center gap-3">
                <div className="flex-1">
                  <Input 
                    value={group.categoryName} 
                    onChange={e => updateCategoryName(group.id, e.target.value)} 
                    placeholder="Enter Category Name (or leave blank if no category)" 
                    className="h-9 font-bold uppercase bg-background max-w-sm"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => handleAddRow(group.id)} className="shrink-0 bg-background hover:bg-muted text-primary border-primary/20">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Row
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveCategory(group.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" title="Delete Category">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Rows inside Category */}
              <div className="p-4 space-y-3 bg-muted/5">
                {/* Column Headers */}
                {group.rows.length > 0 && (
                  <div className="grid grid-cols-12 gap-2 font-bold text-[11px] text-muted-foreground uppercase px-2">
                    <div className="col-span-1"></div>
                    <div className="col-span-4">Row Name (Biomarker)</div>
                    <div className="col-span-3">Unit</div>
                    <div className="col-span-3">Reference Range</div>
                    <div className="col-span-1 text-right">Delete</div>
                  </div>
                )}

                {/* Actual Rows */}
                {group.rows.map((row) => (
                  <div key={row.id} className="grid grid-cols-12 gap-2 items-center bg-background p-2 rounded-md border shadow-sm group hover:border-primary/30 transition-colors">
                    <div className="col-span-1 flex justify-center text-muted-foreground/30 cursor-grab">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="col-span-4">
                      <Input 
                        value={row.name} 
                        onChange={e => updateRow(group.id, row.id, "name", e.target.value)} 
                        placeholder="e.g. LYMPHOCYTES" 
                        className="h-8 text-sm uppercase"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input 
                        value={row.unit} 
                        onChange={e => updateRow(group.id, row.id, "unit", e.target.value)} 
                        placeholder="e.g. % or mg/dL" 
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input 
                        value={row.referenceRange} 
                        onChange={e => updateRow(group.id, row.id, "referenceRange", e.target.value)} 
                        placeholder="e.g. 20% - 40%" 
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(group.id, row.id)} className="text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 h-8 w-8">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {group.rows.length === 0 && (
                  <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-md bg-background">
                    No rows in this category yet. Click "Add Row" above.
                  </div>
                )}
              </div>
            </div>
          ))}

          {groups.length === 0 && (
            <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-md border-2 border-dashed">
              No categories defined.
            </div>
          )}

          <div className="pt-2 border-t border-dashed">
            <Button variant="outline" onClick={handleAddCategory} className="w-full border-dashed border-2 hover:bg-primary/5 hover:text-primary">
              <FolderPlus className="w-4 h-4 mr-2" />
              Add New Category Section
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
