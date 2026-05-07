import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type FileProp = string | { url: string; httpHeaders?: Record<string, string> };

type Props = {
  file: FileProp;
  singlePage?: number | null;
  width?: number;
  onLoadSuccess?: (pdf: { numPages: number }) => void;
  renderAllPages?: number;
};

export default function PdfViewer({ file, singlePage, width, onLoadSuccess, renderAllPages }: Props) {
  return (
    <Document file={file} onLoadSuccess={onLoadSuccess}>
      {singlePage != null ? (
        <Page pageNumber={singlePage} width={width ?? 720} />
      ) : (
        Array.from({ length: renderAllPages ?? 0 }, (_, i) => (
          <div key={i} className="mb-4 shadow-sm">
            <Page pageNumber={i + 1} width={width ?? 820} />
          </div>
        ))
      )}
    </Document>
  );
}
