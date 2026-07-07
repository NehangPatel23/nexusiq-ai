import { describe, expect, it } from "vitest";

import { render } from "@testing-library/react";

import { Logo } from "./logo";
import { NexusMark } from "./nexus-mark";
import { Wordmark } from "./wordmark";

describe("brand components", () => {
  it("renders NexusMark SVG", () => {
    const { container } = render(<NexusMark />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders Wordmark with Nexus and IQ", () => {
    const { getByText } = render(<Wordmark />);
    expect(getByText("Nexus")).toBeTruthy();
    expect(getByText("IQ")).toBeTruthy();
  });

  it("renders Logo with wordmark by default", () => {
    const { getByText } = render(<Logo />);
    expect(getByText("Nexus")).toBeTruthy();
    expect(getByText("IQ")).toBeTruthy();
  });

  it("can hide wordmark", () => {
    const { queryByText } = render(<Logo showWordmark={false} />);
    expect(queryByText("Nexus")).toBeNull();
  });
});
