"use client";

import { Component, type ReactNode } from "react";

/** An optional external image must never take down navigation or unrelated bodies. */
export class SceneAssetBoundary extends Component<{
  name: string;
  children: ReactNode;
  fallback: ReactNode;
  onFailure: (name: string) => void;
}, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(this.props.name); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
