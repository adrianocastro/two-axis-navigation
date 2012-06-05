YUI.add("media.single-axis-scrollview", function (Y, NAME) {
    function SingleAxisScrollView () {
        SingleAxisScrollView.superclass.constructor.apply(this, arguments);
    }

    Y.extend(SingleAxisScrollView, Y.ScrollView, {
            // initializer, enableUI and disableUI are used to allow locking control
            // of scrollviews that need to be progamatically handled and thus
            // only have certain movements (like flick and drag) disabled.
            initializer: function () {
                this.nestedScrollers = [];
                // save original (custom or default) flick state
                this.originalFlickState = this.get('flick');
                this.originalDragState  = this.get('drag');
                this.overrideGM();
                this.on('scrollEnd', Y.bind(this._onScrollEnd, this));
            },
            enableUI: function () {
                this.set('flick', this.originalFlickState);
                this.set('drag', this.originalDragState);
                this.uiDisabled = true;
            },
            disableUI: function () {
                this.set('flick', false);
                this.set('drag', false);
                this.uiDisabled = false;
            },
            addNestedScroller: function (scroller) {
                this.nestedScrollers.push(scroller);
            },
            overrideGM: function () {
                var self = this,
                    orig = this._onGestureMove;

                // Run the custom function as well as the original one
                if ('y' === this.get('axis')) {
                    this._onGestureMove = function (e) {
                        // Check movement is of vertical orientation (movement along Y axis is greater than X axis)
                        var verticalSwipe = (Math.abs(e.pageX - this.startX) < Math.abs(e.pageY - this.startY));

                        // If horizontal movement is detected and the card scrollview isn't being dragged or flicked then lock it
                        if (!verticalSwipe && !self._isDragging && !self._flicking) {
                            self.disable();
                        }
                        orig.apply(this, arguments);
                    }
                } else if ('x' === this.get('axis')) {
                    this._onGestureMove = function (e) {
                        // Check movement is of vertical orientation (movement along Y axis is greater than X axis)
                        var verticalSwipe = (Math.abs(e.pageX - this.startX) < Math.abs(e.pageY - this.startY));

                        // If vertical movement is detected and the river scrollview isn't being dragged or flicked then lock it
                        if (verticalSwipe && !self._isDragging && !self._flicking) {
                            self.disable();
                        }
                        orig.apply(this, arguments);
                    }
                }
            },

            _onGestureMoveStart: function (e) {
                // store starting X and Y coordinates of the move
                this.startX = e.pageX;
                this.startY = e.pageY;
                // call the superclass method
                SingleAxisScrollView.superclass._onGestureMoveStart.apply(this, arguments);
            },

            _onGestureMoveEnd: function (e) {
                SingleAxisScrollView.superclass._onGestureMoveEnd.apply(this, arguments);
                if (!e.flick) {
                    this._reEnableScrollViews();
                }
            },

            _onScrollEnd: function (e) {
                // Only re-enable if this is the end of translation
                if (e.onGestureMoveEnd) {
                    return;
                }
                this._reEnableScrollViews();
            },

            _reEnableScrollViews: function () {
                // Re-enable self and (if applicable) nested scrollviews on movement end
                Y.Object.each(this.nestedScrollers, function (svInstance) {
                    svInstance.enable();
                });
                this.enable();
            },

            // define settings based on movement across a specific axis
            _uiDimensionsChange: function() {
                var bb = this._bb,
                    CLASS_NAMES = Y.ScrollView.CLASS_NAMES,

                    scrollDims = this._getScrollDims(),
                    axis = this.get('axis'),

                    width = scrollDims[0],
                    height = scrollDims[1],
                    scrollWidth = scrollDims[2],
                    scrollHeight = scrollDims[3];

                // vertical scrollview
                if (axis === 'y') {
                    this._scrollsVertical = true;
                    this._maxScrollY = scrollHeight - height;
                    this._minScrollY = 0;
                    this._scrollHeight = scrollHeight;
                    bb.addClass(CLASS_NAMES.vertical);
                } else {
                    this._scrollsVertical = false;
                    delete this._maxScrollY;
                    delete this._minScrollY;
                    delete this._scrollHeight;
                    bb.removeClass(CLASS_NAMES.vertical);
                }

                // horizontal scrollview
                if (axis === 'x') {
                    this._scrollsHorizontal = true;
                    this._maxScrollX = scrollWidth - width;
                    this._minScrollX = 0;
                    this._scrollWidth = scrollWidth;
                    bb.addClass(CLASS_NAMES.horizontal);
                } else {
                    this._scrollsHorizontal = false;
                    delete this._maxScrollX;
                    delete this._minScrollX;
                    delete this._scrollWidth;
                    bb.removeClass(CLASS_NAMES.horizontal);
                }
            }
        },
        {
            ATTRS: {
                axis: {
                    value: null
                },
                uiDisabled: {
                    value: false
                }
            },
            NAME: 'singleAxisScrollView'
        }
    );

    Y.namespace("Media").SingleAxisScrollView = SingleAxisScrollView;

}, '0.0.1', { requires: ['scrollview', 'event'] });