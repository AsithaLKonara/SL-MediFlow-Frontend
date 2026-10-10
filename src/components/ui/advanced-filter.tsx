import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
}

interface AdvancedFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  onFilterChange?: (key: string, value: string) => void;
  onClearFilters?: () => void;
}

export function AdvancedFilter({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  onFilterChange,
  onClearFilters
}: AdvancedFilterProps) {
  const hasActiveFilters = filters.some(f => f.value && f.value !== "ALL") || searchQuery.length > 0;

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-xl border border-border shadow-sm mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Search Input */}
      <div className="relative flex-1 w-full">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
          <Search className="h-4 w-4" />
        </div>
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-10 w-full bg-muted/50 focus-visible:bg-background transition-colors"
        />
      </div>

      {/* Dropdown Filters */}
      {filters.length > 0 && (
        <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full sm:w-auto">
          {filters.map((filter) => (
            <Select
              key={filter.key}
              value={filter.value}
              onValueChange={(val) => onFilterChange?.(filter.key, val as string)}
            >
              <SelectTrigger className="w-full sm:w-[160px] bg-muted/50">
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All {filter.label}</SelectItem>
                {filter.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

          {/* Clear Filters Button */}
          {hasActiveFilters && onClearFilters && (
            <Button 
              variant="ghost" 
              onClick={onClearFilters}
              className="text-muted-foreground hover:text-foreground px-3"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
