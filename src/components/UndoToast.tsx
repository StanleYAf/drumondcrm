import { useAppData } from "@/lib/dataContext";
import { Undo2 } from "lucide-react";

export function UndoToast() {
  const { pendingUndo } = useAppData();
  if (!pendingUndo) return null;

  return (
    <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-3 rounded-2xl animate-in slide-in-from-bottom-4"
      style={{ background: 'rgba(30,30,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
      <span className="text-sm text-white">{pendingUndo.label}</span>
      <button onClick={pendingUndo.restore}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold"
        style={{ background: 'rgba(10,132,255,0.2)', color: '#0A84FF' }}>
        <Undo2 className="h-3.5 w-3.5" />Desfazer
      </button>
    </div>
  );
}
