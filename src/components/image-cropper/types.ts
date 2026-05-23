export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Area {
  width: number;
  height: number;
  x: number;
  y: number;
}

export type AspectRatio = number | undefined; // undefined allows for "Freeform"

export interface AspectOption {
  label: string;
  value: AspectRatio;
  iconClass?: string;
}