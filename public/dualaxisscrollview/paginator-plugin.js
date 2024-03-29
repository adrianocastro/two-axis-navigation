/*jslint nomen:true sloppy:true white:true*/
/*global Y*/
// TODO: rename foo to cards (or something similar)
YUI().add('paginator-plugin', function (Y) {

/**
 * Provides a plugin, which adds pagination support to ScrollView instances
 *
 * @module scrollview-paginator
 */
var getClassName = Y.ClassNameManager.getClassName,
    SCROLLVIEW = 'scrollview',
    CLASS_HIDDEN = getClassName(SCROLLVIEW, 'hidden'),
    CLASS_PAGED = getClassName(SCROLLVIEW, 'paged'),
    UI = (Y.ScrollView) ? Y.ScrollView.UI_SRC : "ui",
    INDEX = "index",
    SCROLL_X = "scrollX",
    SCROLL_Y = "scrollY",
    TOTAL = "total",
    HOST = "host",
    BOUNDING_BOX = "boundingBox",
    CONTENT_BOX = "contentBox",
    SELECTOR = "selector",
    FLICK = "flick",
    DRAG = "drag";

/**
 * Scrollview plugin that adds support for paging
 *
 * @class ScrollViewPaginator
 * @namespace Plugin
 * @extends Plugin.Base
 * @constructor
 */
function PaginatorPlugin() {
    PaginatorPlugin.superclass.constructor.apply(this, arguments);
}

/**
 * The identity of the plugin
 *
 * @property NAME
 * @type String
 * @default 'paginatorPlugin'
 * @static
 */
PaginatorPlugin.NAME = 'pluginScrollViewPaginator';

/**
 * The namespace on which the plugin will reside
 *
 * @property NS
 * @type String
 * @default 'pages'
 * @static
 */
PaginatorPlugin.NS = 'pages';

/**
 * The default attribute configuration for the plugin
 *
 * @property ATTRS
 * @type Object
 * @static
 */
PaginatorPlugin.ATTRS = {

    /**
     * CSS selector for a page inside the scrollview. The scrollview
     * will snap to the closest page.
     *
     * @attribute selector
     * @type {String}
     */
    selector: {
        value: null
    },

    /**
     * The active page number for a paged scrollview
     *
     * @attribute index
     * @type {Number}
     * @default 0
     */
    index: {
        value: 0,
        validator: function(val) {
            return val >= 0 && val < this.get(TOTAL);
        }
    },

    /**
     * The total number of pages
     *
     * @attribute total
     * @type {Number}
     * @default 0
     */
    total: {
        value: 0
    }
};

Y.extend(PaginatorPlugin, Y.Plugin.Base, {

    optimizeMemory: false,
    padding: 1,
    _uiEnabled: true,
    _prevent: new Y.Do.Prevent(),
    foo: [],

    /**
     * Designated initializer
     *
     * @method initializer
     */
    initializer: function (config) {
        var paginator = this,
            host = paginator.get(HOST),
            cb = host.get(CONTENT_BOX),
            optimizeMemory = config.optimizeMemory || paginator.optimizeMemory,
            padding = config.padding || paginator.padding;

        this._cb = cb;

        paginator.padding = padding;
        paginator.optimizeMemory = optimizeMemory;
        paginator._host = host;
        paginator._hostOriginalFlick = host.get(FLICK);
        paginator._hostOriginalDrag = host.get(DRAG);

        paginator.beforeHostMethod('_mousewheel', paginator._mousewheel);
        paginator.beforeHostMethod('_flickFrame', paginator._flickFrame);
        paginator.beforeHostMethod('_onGestureMoveStart', function(e){

            var paginator = this,
                index     = paginator.get(INDEX),
                cardNode  = paginator._getPageNodes().item(index);

            this.cardNode = cardNode;

            // Store the mouse starting point (e.clientY) for this gesture
            paginator.foo[index]._prevY = e.clientY;
        });

        paginator.beforeHostMethod('_onGestureMove', function(e){
            var host = this._host,
                scrollsVertical,
                paginator = this,
                index = paginator.get(INDEX);

            if (host._scrollsVertical == null) {
                host._scrollsVertical = (Math.abs(e.clientX - host._startClientX) < Math.abs(e.clientY - host._startClientY));
            }

            scrollsVertical = host._scrollsVertical;

            if (host._prevent.move) {
                e.preventDefault();
            }

            host._isDragging = true;
            host._endClientY = e.clientY;
            host._endClientX = e.clientX;

            if (scrollsVertical) {
                // Figure out the movement delta and add it to the previous scrolled amount
                paginator.foo[index].scrollY -= e.clientY - paginator.foo[index]._prevY;
                // TODO: remove host.set and create a hostScrollTo method
                // paginator.hostScrollTo(SCROLL_Y, paginator.foo[index].scrollY);
                // Set the scrollY coordinate calculated above
                host.set(SCROLL_Y, paginator.foo[index].scrollY);
                // Store previous y coordinate
                paginator.foo[index]._prevY = e.clientY;
            }
            else {
                host.set(SCROLL_X, -(e.clientX - host._startX));
            }

            return paginator._prevent;
        });

        paginator.beforeHostMethod('_onGestureMoveEnd', paginator._onGestureMoveEnd);
        paginator.beforeHostMethod('scrollTo', function(x, y, duration){
            console.log('scrollTo('+x+','+y+')');
            var paginator     = this,
                host          = paginator._host,
                isVert        = host._scrollsVertical,
                transition    = {
                    easing   : 'ease-out',
                    duration : duration/1000
                };

            if (isVert) {
                var index = paginator.get(INDEX);

                if (duration) {
                    transition.transform = 'translateY(' + -y + 'px) translateZ(0px)';
                    this.cardNode.transition(transition);
                }
                else {
                    this.cardNode.setStyle('transform', 'translateY(' + -y + 'px) translateZ(0px)');
                }

                // Store last known y offset
                this.foo[index].scrollY = y;

            }
            else {
                var cb = this._cb;

                // TODO:
                //     - consider using host's _transform
                //     - consider replacing setStyle with a 0 duration transition on the else
                if (duration) {
                    transition.transform = 'translateX('+ -x +'px) translateZ(0px)';
                    cb.transition(transition);
                }
                else {
                    cb.setStyle('transform', 'translateX('+ -x +'px) translateZ(0px)');
                }
            }
            return paginator._prevent;
        });
        paginator.afterHostMethod('_uiDimensionsChange', paginator._afterHostUIDimensionsChange);
        paginator.afterHostEvent('render', paginator._afterHostRender);
        paginator.afterHostEvent('scrollEnd', paginator._scrollEnded);
        paginator.after('indexChange', paginator._afterIndexChange);
    },

    /**
     * After host render handler
     *
     * @method _afterHostRender
     * @param {Event.Facade}
        * @protected
     */
    _afterHostRender: function (e) {
        var paginator = this,
            host = paginator._host,
            pageNodes = paginator._getPageNodes(),
            size = pageNodes.size(),
            bb = host.get(BOUNDING_BOX);

        pageNodes.each(function(node, i){
            paginator.foo[i] = {
                scrollX: 0,
                scrollY: 0
            }
        });

        bb.addClass(CLASS_PAGED);
        paginator.set(TOTAL, size);
        paginator._optimize();
    },

    /**
     * After host _uiDimensionsChange
     *
     * @method _afterHostUIDimensionsChange
     * @param {Event.Facade}
        * @protected
     */
    _afterHostUIDimensionsChange: function(e) {
        var paginator = this;
        paginator.set(TOTAL, paginator._getPageNodes().size());
    },

    /**
     * Over-rides the host _onGestureMoveEnd method
     * Executed on flicks at end of strip, or low velocity flicks that are not enough to advance the page.
     *
     * @method _onGestureMoveEnd
     * @protected
     */
    _onGestureMoveEnd: function (e) {
        var paginator  = this,
            host       = paginator._host,
            isVertical = host._scrollsVertical,
            index      = paginator.get(INDEX);

        if (!isVertical) {
            paginator.scrollTo(index);
        }
        else {
            // offsetY is negative when the user pulls the card down past its top margin
            var offsetY = paginator.foo[index].scrollY;

            // If pulled down past top
            if (offsetY < 0) {
                offsetY = 0;
                // Reset offsetY to 0 and scrollTo top with animation
                host.scrollTo(null, offsetY, 400, this.cardNode);
            }

            console.log('updating scrollY for', index);
            paginator.foo[index].scrollY = offsetY;
        }
    },

    /**
     * Executed to respond to the flick event, by over-riding the default flickFrame animation.
     * This is needed to determine if the next or prev page should be activated.
     *
     * @method _flickFrame
     * @protected
     */
    _flickFrame: function () {
        console.log('_flickFrame() - paginator');
        var paginator = this,
            host = paginator._host,
            velocity = host._currentVelocity,
            isForward = velocity < 0,
            isVert = host._scrollsVertical;

        if (velocity && !isVert) {
            if (isForward) {
                paginator.next();
            }
            else {
                paginator.prev();
            }
            return paginator._prevent;
        }
    },

    /**
     * Executed to respond to the mousewheel event, by over-riding the default mousewheel method.
     *
     * @method _mousewheel
     * @param {Event.Facade}
        * @protected
     */
    _mousewheel: function (e) {
        var paginator = this,
            host = paginator._host,
            isForward = e.wheelDelta < 0, // down (negative) is forward.  @TODO Should revisit.
            cb = this._cb;

        // Only if the mousewheel event occurred on a DOM node inside the CB
        if (cb.contains(e.target)){
            if (isForward) {
                paginator.next();
            }
            else {
                paginator.prev();
            }

            // prevent browser default behavior on mousewheel
            e.preventDefault();

            // Block host._mousewheel from running
            return paginator._prevent;
        }
    },

    /**
     * scrollEnd handler to run some cleanup operations
     *
     * @method _scrollEnded
     * @param {Event.Facade}
        * @protected
     */
    _scrollEnded: function (e) {
        var paginator = this,
            currentIndex = paginator.get(INDEX);

        paginator._optimize();
        this._uiEnable();
    },

    /**
     * index attr change handler
     *
     * @method _afterIndexChange
     * @param {Event.Facade}
        * @protected
     */
    _afterIndexChange: function (e) {
        var paginator = this,
            index = e.newVal;

        if(e.src !== UI) {
            paginator.scrollTo(index);
        }
    },

    /**
     * Improves performance by hiding page nodes not near the viewport
     *
     * @method _optimize
     * @protected
     */
    _optimize: function() {
        var paginator = this,
            host = paginator._host,
            optimizeMemory = paginator.optimizeMemory,
            isVert = host._scrollsVertical,
            currentIndex = paginator.get(INDEX),
            pageNodes;

        if (!optimizeMemory) {
            return false;
        }

        // Show the pages in/near the viewport & hide the rest
        pageNodes = paginator._getStage(currentIndex);
        paginator._showNodes(pageNodes.visible);
        paginator._hideNodes(pageNodes.hidden);

        paginator.scrollTo(currentIndex, 0);
    },

    /**
     * Determines which nodes should be visible, and which should be hidden.
     *
     * @method _getStage
     * @param index {Number} The page index # intended to be in focus.
     * @returns {object}
     * @protected
     */
    _getStage : function (index) {
        var paginator = this,
            host = paginator._host,
            padding = paginator.padding,
            visibleCount = padding + 1 + padding, // Before viewport | viewport | after viewport
            pageNodes = paginator._getPageNodes(),
            pageCount = paginator.get(TOTAL),
            start, visible, hidden;

        // Somehow this works.  @TODO cleanup
        start = Math.max(index-padding, 0);
        if (start+visibleCount > pageCount) {
            start = start-(start+visibleCount-pageCount);
        }

        visible = pageNodes.splice(start, visibleCount);
        hidden = pageNodes; // everything leftover

        return {
            visible: visible,
            hidden: hidden
        };
    },

    /**
     * A utility method to show node(s)
     *
     * @method _showNodes
     * @param nodeList {nodeList}
     * @protected
     */
    _showNodes : function (nodeList) {
        var host = this._host,
            cb = host.get(CONTENT_BOX);

        if (nodeList) {
            nodeList.removeClass(CLASS_HIDDEN).setStyle('display', '');
        }
    },

    /**
     * A utility method to hide node(s)
     *
     * @method _hideNodes
     * @param nodeList {nodeList}
     * @protected
     */
    _hideNodes : function (nodeList) {
        var host = this._host;

        if (nodeList) {
            nodeList.addClass(CLASS_HIDDEN).setStyle('display', 'none');
        }
    },

    /**
     * Enable UI interaction with the widget
     *
     * @method _uiEnable
     * @protected
     */
    _uiEnable: function () {
        var paginator = this,
            host = paginator._host,
            disabled = !paginator._uiEnabled;

        if (disabled) {
            // paginator._uiEnabled = true;
            // host.set(FLICK, paginator._hostOriginalFlick);
            // host.set(DRAG, paginator._hostOriginalDrag);
        }
    },

    /**
     * Disable UI interaction with the widget
     *
     * @method _uiDisable
     * @protected
     */
    _uiDisable: function () {
        var paginator = this,
            host = paginator._host;

        // paginator._uiEnabled = false;
        // host.set(FLICK, false);
        // host.set(DRAG, false);
    },

    /**
     * Gets a nodeList for the "pages"
     *
     * @method _getPageNodes
     * @protected
     * @returns {nodeList}
     */
    _getPageNodes: function() {
        var paginator = this,
            host = paginator._host,
            cb = host.get(CONTENT_BOX),
            pageSelector = paginator.get(SELECTOR),
            pageNodes = pageSelector ? cb.all(pageSelector) : cb.get("children");

        return pageNodes;
    },

    /**
     * Scroll to the next page in the scrollview, with animation
     *
     * @method next
     */
    next: function () {
        var paginator = this,
            index = paginator.get(INDEX),
            target = index + 1;

        if(paginator._uiEnabled) {
            paginator.set(INDEX, target);
        }
    },

    /**
     * Scroll to the previous page in the scrollview, with animation
     *
     * @method prev
     */
    prev: function () {
        var paginator = this,
            index = paginator.get(INDEX),
            target = index - 1;

        if(paginator._uiEnabled) {
            paginator.set(INDEX, target);
        }
    },

    /**
     * Scroll to a given page in the scrollview
     *
     * @method scrollTo
     * @param index {Number} The index of the page to scroll to
     * @param duration {Number} The number of ms the animation should last
     * @param easing {String} The timing function to use in the animation
     */
    scrollTo: function (index, duration, easing) {
        var paginator = this,
            host = paginator._host,
            isVert = host.isVertical,
            scrollAxis = (isVert) ? SCROLL_Y : SCROLL_X,
            pageNodes = paginator._getPageNodes(),
            startPoint = isVert ? host._startClientY : host._startClientX,
            endPoint = isVert ? host._endClientY : host._endClientX,
            delta = startPoint - endPoint,
            duration = (duration !== undefined) ? duration : PaginatorPlugin.TRANSITION.duration,
            easing = (easing !== undefined) ? duration : PaginatorPlugin.TRANSITION.easing,
            scrollVal;

        // If the delta is 0 (a no-movement mouseclick)
        if (delta === 0) {
            return false;
        }

        // Disable the UI while animating
        if (duration > 0) {
            paginator._uiDisable();
        }

        // Make sure the target node is visible
        paginator._showNodes(pageNodes.item(index));

        // Determine where to scroll to
        if (isVert) {
            scrollVal = pageNodes.item(index).get("offsetTop");
        } else {
            scrollVal = pageNodes.item(index).get("offsetLeft");
        }

        console.log(duration, scrollAxis, scrollVal);
        host.set(scrollAxis, scrollVal, {
            duration: duration,
            easing: easing
        });
    }
});

/**
 * The default snap to current duration and easing values used on scroll end.
 *
 * @property SNAP_TO_CURRENT
 * @static
 */
PaginatorPlugin.TRANSITION = {
    duration : 300,
    easing : 'ease-out'
};

Y.namespace('Plugin').ScrollViewPaginator = PaginatorPlugin;

});