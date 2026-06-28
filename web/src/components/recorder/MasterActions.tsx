import { Download, RefreshCw, Trash2 } from "lucide-react";

interface MasterActionsProps {
  exporting: boolean;
  hasTapeContent: boolean;
  lastExportUrl: string | null;
  onClearAll: () => void;
  onExportWav: () => void;
}

export const MasterActions = ({ exporting, hasTapeContent, lastExportUrl, onClearAll, onExportWav }: MasterActionsProps) => (
  <section className="panel master-actions">
    <button
      type="button"
      onClick={onExportWav}
      disabled={exporting || !hasTapeContent}
      title={hasTapeContent ? "Export WAV" : "Record or import audio before exporting"}
    >
      <Download size={16} />
      {exporting ? "Exporting..." : "Export WAV"}
    </button>
    <button type="button" onClick={onClearAll}>
      <Trash2 size={16} />
      Clear Tape
    </button>
    {lastExportUrl && (
      <a href={lastExportUrl} download="portastudio-mix.wav">
        <RefreshCw size={16} />
        Download again
      </a>
    )}
  </section>
);
