YUI.add("media.single-axis-scrollview", function (Y, NAME) {
    function SingleAxisScrollView () {
        SingleAxisScrollView.superclass.constructor.apply(this, arguments);
    }

    Y.extend(SingleAxisScrollView, Y.ScrollView, {
            // initializer, enableUI and disableUI are used to allow locking control
            // of scrollviews that need to be progamatically handled and thus
            // only have certain movements (like flick and drag) disabled.
            initializer: function () {
                // save original (custom or default) flick state
                this.originalFlickState = this.get('flick');
                this.originalDragState  = this.get('drag');
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

            _onGestureMoveStart: function (e) {
                // store starting X and Y coordinates of the move
                this.startX = e.pageX;
                this.startY = e.pageY;
                // call the superclass method
                SingleAxisScrollView.superclass._onGestureMoveStart.apply(this, arguments);
            },

            _onGestureMoveEnd: function (e) {
                SingleAxisScrollView.superclass._onGestureMoveEnd.apply(this, arguments);

                var nestedScrollers = this.nestedScrollers,
                    svInstance;

                // Re-enable self and (if applicable) nested scrollviews on movement end
                if (nestedScrollers && this.hasNestedScrollers) {
                    Y.Object.each(nestedScrollers, function (svInstance) {
                        svInstance.enableUI();
                    });
                }
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

}, '0.0.1', { requires: ['media.scrollview-base', 'media.scrollview-paginator'] });