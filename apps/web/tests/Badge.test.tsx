import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, CustomerStatusBadge, ChallanStatusBadge } from "../src/components/ui/Badge";

describe("Badge component", () => {
  it("renders children text", () => {
    render(<Badge variant="success">Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("CustomerStatusBadge applies correct variant for each status", () => {
    const { rerender } = render(<CustomerStatusBadge status="ACTIVE" />);
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();

    rerender(<CustomerStatusBadge status="LEAD" />);
    expect(screen.getByText("LEAD")).toBeInTheDocument();

    rerender(<CustomerStatusBadge status="INACTIVE" />);
    expect(screen.getByText("INACTIVE")).toBeInTheDocument();
  });

  it("ChallanStatusBadge renders all status variants", () => {
    for (const status of ["DRAFT", "CONFIRMED", "CANCELLED"]) {
      const { container } = render(<ChallanStatusBadge status={status} />);
      expect(container.textContent).toBe(status);
    }
  });
});
