import { render, screen } from "@testing-library/react";
import { Sparkles } from "lucide-react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/empty-state";

describe("EmptyState", () => {
  it("renders the title, description, and optional action", () => {
    render(
      <EmptyState
        icon={Sparkles}
        title="Nothing here yet"
        description="Come back later."
        action={<button type="button">Do something</button>}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Nothing here yet" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Come back later.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Do something" }),
    ).toBeInTheDocument();
  });

  it("omits the action when none is provided", () => {
    render(
      <EmptyState
        icon={Sparkles}
        title="Nothing here yet"
        description="Come back later."
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
