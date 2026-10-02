import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Conversation } from "@/hooks/useConversations";

import { RecentSessionsSwitcher } from "./RecentSessionsSwitcher";

const navigate = vi.fn();
vi.mock("@/lib/routing", () => ({ useNavigate: () => navigate }));

afterEach(() => {
  cleanup();
  navigate.mockReset();
});

function conversation(
  id: string,
  updatedAt: number,
  options: { archived?: boolean; provisional?: boolean } = {},
): Conversation {
  return {
    id,
    object: "conversation",
    title: `Session ${id}`,
    created_at: updatedAt,
    updated_at: updatedAt,
    labels: {},
    archived: options.archived ?? false,
    provisional: options.provisional,
    agent_name: "Claude",
  } as Conversation;
}

function pressTab(options: { shift?: boolean } = {}) {
  fireEvent.keyDown(window, {
    key: "Tab",
    code: "Tab",
    ctrlKey: true,
    shiftKey: options.shift ?? false,
  });
}

describe("RecentSessionsSwitcher", () => {
  it("shows only the five most recently active real sessions", () => {
    render(
      <RecentSessionsSwitcher
        conversations={[
          conversation("one", 1),
          conversation("seven", 7, { archived: true }),
          conversation("three", 3),
          conversation("six", 6, { provisional: true }),
          conversation("five", 5),
          conversation("two", 2),
          conversation("four", 4),
        ]}
        activeSessionId={null}
        enabled
      />,
    );

    pressTab();

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Session fiveClaude",
      "Session fourClaude",
      "Session threeClaude",
      "Session twoClaude",
      "Session oneClaude",
    ]);
  });

  it("cycles from the active session, reverses with Shift, and switches on Control release", () => {
    render(
      <RecentSessionsSwitcher
        conversations={[
          conversation("three", 3),
          conversation("one", 1),
          conversation("four", 4),
          conversation("two", 2),
        ]}
        activeSessionId="four"
        enabled
      />,
    );

    pressTab();
    expect(screen.getByText("Session three").closest('[role="option"]')).toHaveAttribute(
      "data-selected",
      "true",
    );

    pressTab();
    expect(screen.getByText("Session two").closest('[role="option"]')).toHaveAttribute(
      "data-selected",
      "true",
    );

    pressTab({ shift: true });
    expect(screen.getByText("Session three").closest('[role="option"]')).toHaveAttribute(
      "data-selected",
      "true",
    );

    fireEvent.keyUp(window, { key: "Control", code: "ControlLeft" });
    expect(navigate).toHaveBeenCalledWith("/c/three");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("cancels with Escape without switching on the later Control release", () => {
    render(
      <RecentSessionsSwitcher
        conversations={[conversation("two", 2), conversation("one", 1)]}
        activeSessionId="two"
        enabled
      />,
    );

    pressTab();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape", code: "Escape", ctrlKey: true });
    fireEvent.keyUp(window, { key: "Control", code: "ControlLeft" });

    expect(navigate).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("cancels without switching when the window loses focus", () => {
    render(
      <RecentSessionsSwitcher
        conversations={[conversation("two", 2), conversation("one", 1)]}
        activeSessionId="two"
        enabled
      />,
    );

    pressTab();
    fireEvent.blur(window);
    fireEvent.keyUp(window, { key: "Control", code: "ControlLeft" });

    expect(navigate).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("leaves Ctrl+Tab untouched outside Electron", () => {
    render(
      <RecentSessionsSwitcher
        conversations={[conversation("one", 1)]}
        activeSessionId={null}
        enabled={false}
      />,
    );
    const keyboardEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      code: "Tab",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(keyboardEvent);

    expect(keyboardEvent.defaultPrevented).toBe(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
