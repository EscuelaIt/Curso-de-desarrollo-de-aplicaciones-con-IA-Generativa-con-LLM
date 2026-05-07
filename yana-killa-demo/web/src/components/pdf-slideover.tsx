import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { listDocuments, pdfFileDescriptor } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";

const PdfViewer = lazy(() => import("./pdf-viewer"));

export function PdfSlideover({
  docId,
  page,
  open,
  onClose,
}: {
  docId: string | null;
  page: number | null;
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState<number | undefined>(undefined);
  const { data: docs } = useQuery({
    queryKey: ["documents"],
    queryFn: listDocuments,
  });
  const doc = docId ? docs?.find((d) => d.id === docId) : undefined;
  const label = doc?.filename ?? doc?.title ?? docId;

  useEffect(() => {
    if (open && ref.current) ref.current.scrollTop = 0;
  }, [open, docId, page]);

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    if (!node) return;
    const update = () => {
      const w = node.clientWidth;
      setPageWidth(Math.max(320, w - 32));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [open]);

  const file = useMemo(() => (docId ? pdfFileDescriptor(docId) : null), [docId]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[min(800px,55vw)] p-0">
        <SheetHeader className="p-3 border-b">
          <SheetTitle className="text-sm font-mono">
            {label} · p.{page}
          </SheetTitle>
        </SheetHeader>
        <div
          ref={ref}
          className="h-[calc(100vh-56px)] overflow-auto p-4 bg-[var(--color-surface)]"
        >
          {file && (
            <Suspense
              fallback={
                <div className="text-sm text-[var(--color-text-muted)]">
                  Cargando visor PDF…
                </div>
              }
            >
              <PdfViewer file={file} singlePage={page} width={pageWidth} />
            </Suspense>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
