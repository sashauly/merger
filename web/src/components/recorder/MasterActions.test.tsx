import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MasterActions } from "./MasterActions";

describe("MasterActions", () => {
  it("disables export when tape is empty", () => {
    render(
      <MasterActions
        exporting={false}
        hasTapeContent={false}
        lastExportUrl={null}
        onClearAll={vi.fn()}
        onExportWav={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /export wav/i })).toBeDisabled();
  });

  it("enables export when tape has content", () => {
    render(
      <MasterActions
        exporting={false}
        hasTapeContent
        lastExportUrl={null}
        onClearAll={vi.fn()}
        onExportWav={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /export wav/i })).toBeEnabled();
  });
});
