"use client";

import { createElement } from "react";
import { WolframCellularAutomata } from "@/components/wolfram-cellular-automata";

// A "cellular pattern" sketch: a thin wrapper around the reusable engine in
// components/wolfram-cellular-automata.tsx. It's a component sketch
// (kind: "component" in the registry) because the automaton drives compute
// shaders + a generation loop — it can't be a plain colorNode Fn.
//
// Defaults to Rule 90 (Sierpiński triangle). For another pattern, clone this
// and pass params, e.g.:
//   createElement(WolframCellularAutomata, { params: { ruleset: RULE_30 } })
// (RULE_30 etc. are exported from the engine.)
export default function Cellular() {
  return createElement(WolframCellularAutomata);
}
