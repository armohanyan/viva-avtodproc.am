import type { ComponentType } from "react";

export interface AppRoute {
  readonly path: string;
  readonly component: ComponentType;
}
