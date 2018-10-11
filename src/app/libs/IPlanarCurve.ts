export interface IPoint
{
  x: number;

  y: number;
}

export interface IControlPoints
{
  x0: number;

  y0: number;

  cx: number;

  cy: number;

  cx1: number;

  cy1: number;

  x1: number;

  y1: number;
}

export interface IPlanarCurve extends IControlPoints
{
  fromObject(coefs: IControlPoints): void;

  toObject(): IControlPoints;

  getX(t: number): number;

  getY(t: number): number;

  getXPrime(t: number): number;

  getYPrime(t: number): number;

  interpolate(points: Array<IPoint>): void;

  getTAtS(s: number): number;

  getTAtX(x: number): Array<number>;

  getYAtX(x: number): Array<number>;

  getXAtY(y: number): Array<number>;

  lengthAt(t: number): number;
}
