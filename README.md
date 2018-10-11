# Typescript Math Toolkit Quadratic Bezier

This is a beta release of the Typescript Math Toolkit quadratic bezier class, complete with arc-length parameterization.  When I first began programming Bezier curves in the 1980s, I shared the same general impression concerning the natural parameter, _t_, with most programmers.  It's easy to presume that the point on the curve at _t = 0.5_, for example, is always at exactly one-half of the total length of the curve.  This is, in fact, only true under very limited circumstances.  In general, let _s_ represent normalized arc length in [0,1].  So, _s = 0_ is the initial point of the curve and _s = 1_ is the terminal point of the curve, i.e. at 100% of the total arc length of the curve.  Let _p = B(t)_ and _q = B(s)_ represent points on the curve at some value of the natural parameter, _t_ and normalized arc-length, _s_, where both _t_ and _s_ are in the open interval (0,1).  In general, _p != q_.  The points may be close or notably distinct, depending on the location of the curve's control points or geometric constraints.  

Arc-length parameterization is required for applications that must identify points at a specific fraction of the curve's total length.  This parameterization is performed numerically as there are no simple, closed-form formulas that produce a naturally arc-length parameterized curve.  Every Bezier code I've written since the 1990's has such parameterization and the current Typescript implementation is no different.  

The current quad Bezier library is illustrated via an interactive Angular 6 demo that uses PIXI 4 for dynamic drawing.  This demo differs from others in that three interpolation points are specified instead of the typical three control points.  Three-point quad Bezier interpolation is applied to compute geometric constraints that cause the quad Bezier to pass through all three input points.

Now, there are an infinity of quadratic curves that pass through three points that are distinct and not collinear.  In order to specify a unique curve, a parameter value (_t_) must be chosen so that the Bezier curve passes through the middle interpolation point at that value of the natural parameter.  The quad Bezier class computes this parameter as the fraction of chord length from the first to second points divided by the sum of the chord length from first to second and second to third points.  The demo draws the Bezier curve and the geometric constraints that cause the curve to interpolate all three points.

Points on the curve at equal increments of _t_ and _s_ may also be illustrated.  Drag one of the control points to see how the relationship between the two varies as a function of the geometric constraints.


Author:  Jim Armstrong - [The Algorithmist]

@algorithmist

theAlgorithmist [at] gmail [dot] com

Angular: 6.1.0

PIXI: 4.8.2

Angular CLI: 6.2.3

## Running the demo

The drawing area is represented in light blue.  Click anywhere in that area to define three interpolation points, which are visually represented by red circles.  After the third point is entered, the display is updated to show the control points and the quadratic Bezier curve.  The total arc length of the curve is displayed as well.  Click on the _Equal t_ and/or _Equal s_ checkboxes to visualize points on the curve at _t = 0.2, 0.4, 0.6, 0.8_ as or _s = 0.2, 0.4, 0.6, 0.8_.  Drag one of the control points to see how the spread between natural and normalized arc length parameterization changes as a function of geometric constraints.

Here is an image of the demo with both _Equal t_ and _Equal s_ increments selected.

![Quad Bezier Demo](quad1.png)

The quad Bezier public API is very robust and is summarized below.  This summary does not include other methods available in the _PlanarCurve_ superclass.


```
fromObject(control: IControlPoints): void
public getX(t: number): number
public getY(t: number): number
public getXPrime(t: number): number
public getYPrime(t: number): number
public interpolate(points: Array<IPoint>): number
public getTAtS(s: number): number
public getTAtX(x: number): Array<number>
public getYAtX(x: number): Array<number>
public getXAtY(y: number): Array<number>
public sAtT(t: number): number
```

Since numerical approximation is required for general arc-length parameterization as well as some of the internal computations, the code distribution also includes classes for numerical integration and root finding.


## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.


## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.


## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).


License
----

Apache 2.0

**Free Software? Yeah, Homey plays that**

[//]: # (kudos http://stackoverflow.com/questions/4823468/store-comments-in-markdown-syntax)

[The Algorithmist]: <http://algorithmist.net>
