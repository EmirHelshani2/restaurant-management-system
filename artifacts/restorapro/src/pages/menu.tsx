import { useState } from "react";
import { useListMenuItems, useListMenuCategories } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";

export default function Menu() {
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: categories, isLoading: catLoading } = useListMenuCategories();
  const { data: items, isLoading: itemsLoading } = useListMenuItems(
    {
      categoryId: activeCategory || undefined,
      search: search || undefined,
    },
    {
      query: {
        queryKey: ["/api/menu/items", { categoryId: activeCategory || undefined, search: search || undefined }],
      },
    },
  );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 h-full flex flex-col max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Menu Management</h1>
          <p className="text-muted-foreground">Edit items, categories and pricing</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search items..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button><Plus className="w-4 h-4 mr-2" /> Add Item</Button>
        </div>
      </div>

      <div className="flex flex-1 gap-8 overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-64 flex flex-col bg-card rounded-xl border overflow-hidden shrink-0">
          <div className="p-4 border-b bg-muted/20 font-medium flex justify-between items-center">
            Categories
            <Button size="icon" variant="ghost" className="h-6 w-6"><Plus className="w-4 h-4" /></Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              <button
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeCategory === null ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}
                onClick={() => setActiveCategory(null)}
              >
                All Items
              </button>
              {categories?.map(cat => (
                <button
                  key={cat.id}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeCategory === cat.id ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-auto">
          {itemsLoading ? (
            <div>Loading items...</div>
          ) : items?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No items found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
              {items?.map(item => (
                <Card key={item.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                  <div className="h-32 bg-muted relative">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                        No Image
                      </div>
                    )}
                    {!item.available && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <Badge variant="destructive">Unavailable</Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold line-clamp-1 flex-1 pr-2">{item.name}</h3>
                      <span className="font-bold text-primary">${item.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <Badge variant="outline" className="text-xs">{item.department}</Badge>
                      <Button variant="ghost" size="sm" className="h-8">Edit</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
