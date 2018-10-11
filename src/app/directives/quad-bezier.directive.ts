import { Directive, ElementRef, Input, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';

import { TSMT$QuadBezier } from '../libs/QuadBezier';

import * as PIXI from 'pixi.js/dist/pixi.js';
import Rectangle        = PIXI.Rectangle;
import InteractionEvent = PIXI.interaction.InteractionEvent;
import Point            = PIXI.PointLike;

@Directive({selector: '[quad-bezier]'})
export class QuadBezierDirective implements OnInit, OnDestroy
{
  // static PIXI options
  protected static OPTIONS: Object = {
    backgroundColor: 0xF0F8FF,
    antialias: true
  };

  // some properties to quickly change line and fill colors
  protected static CIRCLE_FILL_COLOR: number     = 0xff3300;
  protected static CIRCLE_LINE_COLOR: number     = 0x000000;
  protected static BEZIER_LINE_COLOR: number     = 0x0ebfe9;
  protected static CONSTRAINT_LINE_COLOR: number = 0x333333;

  protected _width: number  = 800;    // display width in px
  protected _height: number = 600;    // display height in px

  // reference to the Typescript Math Toolkit Quadratic Bezier (handles all bezier computations while PIXI handles rendering)
  protected _bezier: TSMT$QuadBezier;

  /**
   * Specify the display width in pixels
   *
   * @type {number} value Pixel width (must be greater than zero)
   */
  @Input('width')
  public set width(value: number)
  {
    this._width = !isNaN(value) && value > 0 ? value : this._width;
  }

  /**
   * Specify the display height in pixels
   *
   * @type {number} value Pixel height (must be greater than zero)
   */
  @Input('height')
  public set height(value: number)
  {
    this._height = !isNaN(value) && value > 0 ? value : this._height;
  }

  /**
   * Indicate that an interpolation point has been addded
   *
   * @type {Point}
   */
  @Output('point')
  protected _pointEmitter: EventEmitter<Point>;

  /**
   * Indicate that arc length of the quadratic curve has been updated
   *
   * @type {number}
   */
  @Output('length')
  protected _lengthEmitter: EventEmitter<number>;

  protected _pointCount: number = 0;              // interpolation point count
  protected _clickFcn: Function;                  // reference to function used to handle clicks in the display area
  protected _rect: Rectangle;                     // display area bounding rectangle

  // PIXI app and stage references
  protected _app: PIXI.Application;
  protected _stage: PIXI.Container;

  // container and graphic display objects in the layout
  protected _control: PIXI.Container;                     // control points
  protected _constraints: PIXI.Graphics;                  // geometric constraints (control cage)
  protected _curve: PIXI.Graphics;                        // quad bezier curve
  protected _atTContainer: PIXI.Container;                // container for points at equal t (natural parameter)
  protected _atSContainer: PIXI.Container;                // container for points at equal s (normalized arc length)
  protected _atSIndicators: Array<PIXI.Graphics>;         // visual reference to points at equal t (natural parameter)
  protected _atTIndicators: Array<PIXI.Graphics>;         // visual reference to points at equal t (natural parameter)

  // direct references to control and middle interpolation points
  protected _p0: PIXI.Graphics;  // (x0, y0)
  protected _p1: PIXI.Graphics;  // (cx, cy)
  protected _p2: PIXI.Graphics;  // (x1, y1)
  protected _pI: PIXI.Graphics;  // interpolation point (quad passes through PO, PI, and P2)

  /**
   * Construct a new {QuadBezierDirective}
   *
   * @param {ElementRef} _elRef Element reference
   *
   * @returns {nothing}
   */
  constructor(protected _elRef: ElementRef)
  {
    this._pointEmitter  = new EventEmitter<Point>();
    this._lengthEmitter = new EventEmitter<number>();

    this._bezier = new TSMT$QuadBezier();
  }

  /**
   * Angular lifecycle (on init)
   *
   * @returns {nothing} Performs all PIXI setup
   */
  public ngOnInit(): void
  {
    const options = Object.assign({width: this._width, height: this._height}, QuadBezierDirective.OPTIONS);

    this._app = new PIXI.Application(options);
    this._elRef.nativeElement.appendChild(this._app.view);

    this._clickFcn = (evt: any) => this.addInterpolationPoint(evt.x, evt.y);

    this._elRef.nativeElement.addEventListener('click', this._clickFcn);

    this._rect  = this._elRef.nativeElement.getBoundingClientRect();
    this._stage = this._app.stage;

    // in case you want to see what renderer you have (otherwise comment out)
    const renderer: PIXI.WebGLRenderer | PIXI.CanvasRenderer = this._app.renderer;
    console.log( "renderer is: ", renderer );

    // remaining PIXI setup
    this.__setup();
  }

  /**
   * Angular lifecycle (on destroy)
   *
   * @returns {nothing}
   */
  public ngOnDestroy(): void
  {
    if (this._elRef.nativeElement.hasEventListner('click')) {
      this._elRef.nativeElement.removeEventListener('click', this._clickFcn);
    }
  }

  /**
   * Set visibility of 'Equal t' values container
   *
   * @param {boolean} value True if container is visible
   *
   * @returns {nothing}
   */
  public set showT(value: boolean)
  {
    this._atTContainer.visible = value;
  }

  /**
   * Set visibility of 'Equal s' values container
   *
   * @param {boolean} value True if container is visible
   *
   * @returns {nothing}
   */
  public set showS(value: boolean)
  {
    this._atSContainer.visible = value;
  }

  /**
   * Add an interpolation point to the display
   *
   * @param {number} x x-coordinate of interpolation point
   *
   * @param {number} y y-coordinate of interpolation point
   */
  public addInterpolationPoint(x: number, y: number): void
  {
    if (this._pointCount < 3)
    {
      if (!isNaN(x) && !isNaN(y))
      {
        this._pointCount++;

        switch (this._pointCount)
        {
          // first endpoint
          case 1:
            this._p0.x = x - this._rect.left;
            this._p0.y = y - this._rect.top;
          break;

          // middle interpolation point
          case 2:
            this._pI.x = x - this._rect.left;
            this._pI.y = y - this._rect.top;
          break;

          // second endpoint
          case 3:
            this._p2.x = x - this._rect.left;
            this._p2.y = y - this._rect.top;
          break;
        }

        // indicate that the new interpolation point has been accepted
        this._pointEmitter.next({x: x, y: y});

        if (this._pointCount == 3)
        {
          // don't listen for click events any more (so that control/interp points may be dragged)
          this._elRef.nativeElement.removeEventListener('click', this._clickFcn);

          // 3-point quad bezier interpolation
          this._bezier.interpolate([{x: this._p0.x, y: this._p0.y}, {x: this._pI.x, y: this._pI.y}, {x: this._p2.x, y: this._p2.y}]);

          // indicate that a new arc length is available
          this._lengthEmitter.next(this._bezier.sAtT(1));

          // update the display
          this.__update();
        }
      }
    }
  }

  /**
   * Clear the display and prepare for a new set of interpolation points
   *
   * @returns {nothing}
   */
  public clear(): void
  {
    this._pointCount = 0;

    this._elRef.nativeElement.addEventListener('click', this._clickFcn);

    // clear all graphic displays (control points can be re-used)
    this._p0.x = -20;
    this._p0.y = -20;
    this._p1.x = -20;
    this._p1.y = -20;
    this._p2.x = -20;
    this._p2.y = -20;
    this._pI.x = -20;
    this._pI.y = -20;

    this._constraints.clear();
    this._curve.clear();
  }

  /**
   * Update the display
   *
   * @private
   * @returns {nothing}
   */
  protected __update(): void
  {
    // draw the bezier curve
    this._curve.clear();
    this._curve.lineStyle(2, QuadBezierDirective.BEZIER_LINE_COLOR, 1);

    this._curve.moveTo(this._bezier.x0, this._bezier.y0);
    this._curve.quadraticCurveTo(this._bezier.cx, this._bezier.cy, this._bezier.x1, this._bezier.y1);

    // draw the control cage or geometric constraints
    this._constraints.clear();
    this._constraints.lineStyle(2, QuadBezierDirective.CONSTRAINT_LINE_COLOR, 1);
    this._constraints.moveTo(this._bezier.x0, this._bezier.y0);
    this._constraints.lineTo(this._bezier.cx, this._bezier.cy);
    this._constraints.lineTo(this._bezier.x1, this._bezier.y1);

    // draw points at equal-t and equal-s (s is normalized arc length)
    let t: number        = 0.2;
    let x: number        = this._bezier.getX(t);
    let y: number        = this._bezier.getY(t);
    let g: PIXI.Graphics = this._atTIndicators[0];

    // colors are hardcoded to match the legend colors
    this.__circleAt(x, y, 5, 0x0000ff, g);

    t = 0.4;
    x = this._bezier.getX(t);
    y = this._bezier.getY(t);
    g = this._atTIndicators[1];

    this.__circleAt(x, y, 5, 0x0000ff, g);

    t = 0.6;
    x = this._bezier.getX(t);
    y = this._bezier.getY(t);
    g = this._atTIndicators[2];

    this.__circleAt(x, y, 5, 0x0000ff, g);

    t = 0.8;
    x = this._bezier.getX(t);
    y = this._bezier.getY(t);
    g = this._atTIndicators[3];

    this.__circleAt(x, y, 5, 0x0000ff, g);

    let s: number = 0.2;
    t             = this._bezier.getTAtS(s);
    x             = this._bezier.getX(t);
    y             = this._bezier.getY(t);
    g             = this._atSIndicators[0];

    this.__circleAt(x, y, 5, 0x006400, g);

    s = 0.4;
    t = this._bezier.getTAtS(s);
    x = this._bezier.getX(t);
    y = this._bezier.getY(t);
    g = this._atSIndicators[1];

    this.__circleAt(x, y, 5, 0x006400, g);

    s = 0.6;
    t = this._bezier.getTAtS(s);
    x = this._bezier.getX(t);
    y = this._bezier.getY(t);
    g = this._atSIndicators[2];

    this.__circleAt(x, y, 5, 0x006400, g);

    s = 0.8;
    t = this._bezier.getTAtS(s);
    x = this._bezier.getX(t);
    y = this._bezier.getY(t);
    g = this._atSIndicators[3];

    this.__circleAt(x, y, 5, 0x006400, g);
  }

  /**
   * Draw a circle in the specified graphics context
   *
   * @param {number} x x-coordinate of circle center
   *
   * @param {number} y y-coordinate of circle center
   *
   * @param {number} r circle radius (must be greater than zero)
   *
   * @param {number} fill fill color
   *
   * @param {PIXI.Graphics} g graphics context
   *
   * @private
   * @returns {nothing} Draws the circle at the specified location with the specified fill color into the supplied graphic context
   */
  protected __circleAt(x: number, y: number, r: number, fill: number, g: PIXI.Graphics): void
  {
    g.clear();
    g.beginFill(fill);
    g.drawCircle(x, y, r);
    g.endFill();
  }

  /**
   * PIXI setup
   *
   * @private
   * @returns {nothing}
   */
  protected __setup(): void
  {
    this._curve        = new PIXI.Graphics();
    this._constraints  = new PIXI.Graphics();
    this._control      = new PIXI.Container();
    this._atSContainer = new PIXI.Container();
    this._atTContainer = new PIXI.Container();

    this._atTContainer.visible = false;
    this._atSContainer.visible = false;

    // create interactive control points and middle interpolation point
    this._p0 = new PIXI.Graphics();
    this._p1 = new PIXI.Graphics();
    this._p2 = new PIXI.Graphics();
    this._pI = new PIXI.Graphics();

    this.__createCircle(this._p0);
    this.__createCircle(this._p1);
    this.__createCircle(this._p2);
    this.__createCircle(this._pI);

    this.__makeDraggable(this._p0);
    this.__makeDraggable(this._p1);
    this.__makeDraggable(this._p2);
    this.__makeDraggable(this._pI);

    this._control.addChild(this._p0);
    this._control.addChild(this._p1);
    this._control.addChild(this._p2);
    this._control.addChild(this._pI);

    // t = 0.2, t = 0.4, t = 0.6, t = 0.8
    this._atTIndicators = [new PIXI.Graphics(), new PIXI.Graphics(), new PIXI.Graphics(), new PIXI.Graphics()];

    this._atTContainer.addChild(this._atTIndicators[0]);
    this._atTContainer.addChild(this._atTIndicators[1]);
    this._atTContainer.addChild(this._atTIndicators[2]);
    this._atTContainer.addChild(this._atTIndicators[3]);

    // s = 0.2, s = 0.4, s = 0.6, s = 0.8
    this._atSIndicators = [new PIXI.Graphics(), new PIXI.Graphics(), new PIXI.Graphics(), new PIXI.Graphics()];

    this._atSContainer.addChild(this._atSIndicators[0]);
    this._atSContainer.addChild(this._atSIndicators[1]);
    this._atSContainer.addChild(this._atSIndicators[2]);
    this._atSContainer.addChild(this._atSIndicators[3]);

    this._stage.addChild(this._constraints);
    this._stage.addChild(this._curve);
    this._stage.addChild(this._control);
    this._stage.addChild(this._atTContainer);
    this._stage.addChild(this._atSContainer);
  }

  /**
   * Create a new circle as part of the setup context - these circles are meant to be draggable indicators of interpolation point position
   * in the display
   *
   * @param {PIXI.Graphics} g Graphic context
   *
   * @private
   * @returns {nothing}
   */
  protected __createCircle(g: PIXI.Graphics): void
  {
    g.lineStyle(1, QuadBezierDirective.CIRCLE_LINE_COLOR, 1);
    g.beginFill(QuadBezierDirective.CIRCLE_FILL_COLOR);

    g.drawCircle(0, 0, 6);
    g.endFill();

    // position off-stage
    g.x           = -20;
    g.y           = -20;
    g.interactive = true;
    g.buttonMode  = true;
    g.hitArea     = new PIXI.Rectangle(0, 0, 12, 12);
  }

  /**
   * Make a graphic context draggable
   *
   * @param {PIXI.Graphics} g Graphic context
   *
   * @private
   * @returns {nothing}
   */
  protected __makeDraggable(g: PIXI.Graphics): void
  {
    g.pivot.set(0.5);
    g.dragging = false;

    // todo - better form: keep function references and remove these listeners if the directive is destroyed

    // todo - have not yet tested on touch device
    g.on( 'mousedown', (evt: InteractionEvent) => this.__startDrag(evt) )
     .on( 'touchstart', (evt: InteractionEvent) => this.__startDrag(evt) )

     .on( 'mouseup', (evt: InteractionEvent) => this.__endDrag(evt) )
     .on( 'mouseupoutside', (evt: InteractionEvent) => this.__endDrag(evt) )
     .on( 'touchend', (evt: InteractionEvent) => this.__endDrag(evt) )
     .on( 'touchendoutside', (evt: InteractionEvent) => this.__endDrag(evt) )

     .on( 'mousemove', (evt: InteractionEvent) => this.__dragging(evt) )
     .on( 'touchmove', (evt: InteractionEvent) => this.__dragging(evt) );
  }

  /**
   * start-drag handler
   *
   * @param {PIXI.interaction.InteractionEvent} evt Event reference
   *
   * @private
   * @returns {nothing}
   */
  protected __startDrag(evt: InteractionEvent): void
  {
    (<PIXI.Graphics> evt.currentTarget).dragging = true;
  }

  /**
   * Execute while dragging an interactive point indicator
   *
   * @param {PIXI.interaction.InteractionEvent} evt Event reference
   *
   * @private
   * @returns {nothing}
   */
  protected __dragging(evt: InteractionEvent): void
  {
    const g: PIXI.Graphics = <PIXI.Graphics> evt.currentTarget;
    if (g && g.dragging)
    {
      // update control point position
      g.x = evt.data.global.x;
      g.y = evt.data.global.y;

      // re-interpolate and update the display
      this._bezier.interpolate([{x: this._p0.x, y: this._p0.y}, {x: this._pI.x, y: this._pI.y}, {x: this._p2.x, y: this._p2.y}]);

      // indicate that a new arc length is available
      this._lengthEmitter.next(this._bezier.sAtT(1));

      this.__update();
    }
  }

  /**
   * Execute after drag complete
   *
   * @param {PIXI.interaction.InteractionEvent} evt Event reference
   *
   * @private
   * @returns {nothing}
   */
  protected __endDrag(evt: InteractionEvent): void
  {
    const g: PIXI.Graphics = <PIXI.Graphics> evt.currentTarget;

    if (g) {
      g.dragging = false;
    }
  }
}
