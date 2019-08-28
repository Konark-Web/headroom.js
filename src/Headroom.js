import features from "./features";
import Debouncer from "./Debouncer";
import { extend } from "./utils";
import createScroller from "./scroller";

/**
 * Helper to add an event listener with an options object in supported browsers
 */
function addEventListenerWithOptions(target, type, handler, options) {
  var optionsOrCapture = options;
  if (!features.passiveSupported()) {
    optionsOrCapture = options.capture;
  }
  target.addEventListener(type, handler, optionsOrCapture);
}

/**
 * Helper to remove an event listener with an options object in supported browsers
 */
function removeEventListenerWithOptions(target, type, handler, options) {
  var optionsOrCapture = options;
  if (!features.passiveSupported()) {
    optionsOrCapture = options.capture;
  }
  target.removeEventListener(type, handler, optionsOrCapture);
}

/**
 * Helper function for normalizing tolerance option to object format
 */
function normalizeTolerance(t) {
  return t === Object(t) ? t : { down: t, up: t };
}

/**
 * UI enhancement for fixed headers.
 * Hides header when scrolling down
 * Shows header when scrolling up
 * @constructor
 * @param {DOMElement} elem the header element
 * @param {Object} options options for the widget
 */
function Headroom(elem, options) {
  options = extend(options, Headroom.options);

  this.lastKnownScrollY = 0;
  this.elem = elem;
  this.tolerance = normalizeTolerance(options.tolerance);
  this.classes = options.classes;
  this.offset = options.offset;
  this.scroller = options.scroller;
  this.scrollSource = createScroller(options.scroller);
  this.initialised = false;
  this.onPin = options.onPin;
  this.onUnpin = options.onUnpin;
  this.onTop = options.onTop;
  this.onNotTop = options.onNotTop;
  this.onBottom = options.onBottom;
  this.onNotBottom = options.onNotBottom;
  this.frozen = false;
}
Headroom.prototype = {
  constructor: Headroom,

  /**
   * Initialises the widget
   */
  init: function() {
    if (!Headroom.cutsTheMustard) {
      return;
    }

    this.debouncer = new Debouncer(this.update.bind(this));
    this.elem.classList.add(this.classes.initial);

    // defer event registration to handle browser
    // potentially restoring previous scroll position
    setTimeout(this.attachEvent.bind(this), 100);

    return this;
  },

  /**
   * Unattaches events and removes any classes that were added
   */
  destroy: function() {
    var classes = this.classes;

    this.initialised = false;

    for (var key in classes) {
      if (Object.prototype.hasOwnProperty.call(classes, key)) {
        this.elem.classList.remove(classes[key]);
      }
    }

    removeEventListenerWithOptions(this.scroller, "scroll", this.debouncer, {
      capture: false,
      passive: true
    });
  },

  /**
   * Attaches the scroll event
   * @private
   */
  attachEvent: function() {
    if (!this.initialised) {
      this.lastKnownScrollY = this.scrollSource.scrollY();
      this.initialised = true;
      addEventListenerWithOptions(this.scroller, "scroll", this.debouncer, {
        capture: false,
        passive: true
      });

      this.debouncer.handleEvent();
    }
  },

  /**
   * Unpins the header if it's currently pinned
   */
  unpin: function() {
    var classList = this.elem.classList;
    var classes = this.classes;

    if (
      classList.contains(classes.pinned) ||
      !classList.contains(classes.unpinned)
    ) {
      classList.add(classes.unpinned);
      classList.remove(classes.pinned);
      if (this.onUnpin) {
        this.onUnpin.call(this);
      }
    }
  },

  /**
   * Pins the header if it's currently unpinned
   */
  pin: function() {
    var classList = this.elem.classList;
    var classes = this.classes;

    if (classList.contains(classes.unpinned)) {
      classList.remove(classes.unpinned);
      classList.add(classes.pinned);
      if (this.onPin) {
        this.onPin.call(this);
      }
    }
  },

  /**
   * Handles the top states
   */
  top: function() {
    var classList = this.elem.classList;
    var classes = this.classes;

    if (!classList.contains(classes.top)) {
      classList.add(classes.top);
      classList.remove(classes.notTop);
      if (this.onTop) {
        this.onTop.call(this);
      }
    }
  },

  /**
   * Handles the not top state
   */
  notTop: function() {
    var classList = this.elem.classList;
    var classes = this.classes;

    if (!classList.contains(classes.notTop)) {
      classList.add(classes.notTop);
      classList.remove(classes.top);
      if (this.onNotTop) {
        this.onNotTop.call(this);
      }
    }
  },

  bottom: function() {
    var classList = this.elem.classList;
    var classes = this.classes;

    if (!classList.contains(classes.bottom)) {
      classList.add(classes.bottom);
      classList.remove(classes.notBottom);
      if (this.onBottom) {
        this.onBottom.call(this);
      }
    }
  },

  /**
   * Handles the not top state
   */
  notBottom: function() {
    var classList = this.elem.classList;
    var classes = this.classes;

    if (!classList.contains(classes.notBottom)) {
      classList.add(classes.notBottom);
      classList.remove(classes.bottom);

      if (this.onNotBottom) {
        this.onNotBottom.call(this);
      }
    }
  },

  /**
   * determines if the scroll position is outside of document boundaries
   * @param  {int}  currentScrollY the current y scroll position
   * @return {bool} true if out of bounds, false otherwise
   */
  isOutOfBounds: function(currentScrollY) {
    var pastTop = currentScrollY < 0;
    var pastBottom =
      currentScrollY + this.scrollSource.height() >
      this.scrollSource.scrollHeight();

    return pastTop || pastBottom;
  },

  /**
   * determines if the tolerance has been exceeded
   * @param  {int} currentScrollY the current scroll y position
   * @return {bool} true if tolerance exceeded, false otherwise
   */
  toleranceExceeded: function(currentScrollY, direction) {
    return (
      Math.abs(currentScrollY - this.lastKnownScrollY) >=
      this.tolerance[direction]
    );
  },

  /**
   * determine if it is appropriate to unpin
   * @param  {int} currentScrollY the current y scroll position
   * @param  {bool} toleranceExceeded has the tolerance been exceeded?
   * @return {bool} true if should unpin, false otherwise
   */
  shouldUnpin: function(currentScrollY, toleranceExceeded) {
    var scrollingDown = currentScrollY > this.lastKnownScrollY;
    var pastOffset = currentScrollY >= this.offset;

    return scrollingDown && pastOffset && toleranceExceeded;
  },

  /**
   * determine if it is appropriate to pin
   * @param  {int} currentScrollY the current y scroll position
   * @param  {bool} toleranceExceeded has the tolerance been exceeded?
   * @return {bool} true if should pin, false otherwise
   */
  shouldPin: function(currentScrollY, toleranceExceeded) {
    var scrollingUp = currentScrollY < this.lastKnownScrollY;
    var pastOffset = currentScrollY <= this.offset;

    return (scrollingUp && toleranceExceeded) || pastOffset;
  },

  /**
   * Handles updating the state of the widget
   */
  update: function() {
    var currentScrollY = this.scrollSource.scrollY();
    var scrollDirection =
      currentScrollY > this.lastKnownScrollY ? "down" : "up";
    var toleranceExceeded = this.toleranceExceeded(
      currentScrollY,
      scrollDirection
    );

    if (this.isOutOfBounds(currentScrollY)) {
      // Ignore bouncy scrolling in OSX
      return;
    }

    if (this.frozen === true) {
      this.lastKnownScrollY = currentScrollY;
      return;
    }

    if (currentScrollY <= this.offset) {
      this.top();
    } else {
      this.notTop();
    }

    if (
      currentScrollY + this.scrollSource.height() >=
      this.scrollSource.scrollHeight()
    ) {
      this.bottom();
    } else {
      this.notBottom();
    }

    if (this.shouldUnpin(currentScrollY, toleranceExceeded)) {
      this.unpin();
    } else if (this.shouldPin(currentScrollY, toleranceExceeded)) {
      this.pin();
    }

    this.lastKnownScrollY = currentScrollY;
  },

  /**
   * Freezes the current state of the widget
   */
  freeze: function() {
    this.frozen = true;
    this.elem.classList.add(this.classes.frozen);
  },

  /**
   * Re-enables the default behaviour of the widget
   */
  unfreeze: function() {
    this.frozen = false;
    this.elem.classList.remove(this.classes.frozen);
  }
};

/**
 * Default options
 * @type {Object}
 */
Headroom.options = {
  tolerance: {
    up: 0,
    down: 0
  },
  offset: 0,
  scroller: features.window,
  classes: {
    frozen: "headroom--frozen",
    pinned: "headroom--pinned",
    unpinned: "headroom--unpinned",
    top: "headroom--top",
    notTop: "headroom--not-top",
    bottom: "headroom--bottom",
    notBottom: "headroom--not-bottom",
    initial: "headroom"
  }
};

Headroom.cutsTheMustard = features.rAF && features.bind && features.classList;

export default Headroom;
