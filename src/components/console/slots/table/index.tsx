import { Separator } from "@/components/ui/separator";
import TableBlock from "@/components/blocks/table";
import { Table as TableSlotType } from "@/types/slots/table";
import Toolbar from "@/components/blocks/toolbar";

export default function ({ ...table }: TableSlotType) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-[hsl(36,40%,92%)]">{table.title}</h3>
        {table.description && (
          <p className="text-sm text-[hsl(36,30%,60%)] mt-1">{table.description}</p>
        )}
      </div>
      {table.tip && (
        <p className="text-sm text-[hsl(36,30%,60%)] px-4 py-2 rounded-lg bg-[hsl(38,62%,56%,0.1)] border border-[hsl(38,62%,56%,0.2)]">
          {table.tip.description || table.tip.title}
        </p>
      )}
      {table.toolbar && <Toolbar items={table.toolbar.items} />}
      <Separator className="bg-[hsl(28,18%,24%,0.6)]" />
      <TableBlock {...table} />
    </div>
  );
}

