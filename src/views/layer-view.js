define(["mobileui/utils/rect",
        "mobileui/utils/transform",
        "mobileui/utils/outsets",
        "mobileui/utils/animation-set",
        "mobileui/utils/request-animation-frame",
        "mobileui/views/layout-params"
], function(Rect, Transform, Outsets, AnimationSet, requestAnimationFrame, LayoutParams) {

    var LayerView = Backbone.View.extend({

        initialize: function() {
            LayerView.__super__.initialize.call(this);
            this._bounds = new Rect();
            this._transform = new Transform();
            this._margin = new Outsets();
            this._padding = new Outsets();
            this._opacity = 1;
            this._animation = null;

            this._params = null;

            this._bounds.on("change:position", this._onPositionChanged, this);
            this._bounds.on("change:size", this._onSizeChanged, this);
            this._transform.on("change", this._onTransformChanged, this);
            this._padding.on("change", this._onPaddingChanged, this);
            this._margin.on("change", this._onMarginChanged, this);

            this._invalidationFlags = null;
            this._needsLayout = false;
            this._state = LayerView.VISIBLE;
        },

        animation: function() {
            if (!this._animation) {
                this._animation = new AnimationSet();
                this._animation.viewState().on("invalidate", this._onAnimationInvalidated, this);
            }
            return this._animation;
        },

        hasAnimation: function() {
            return !!this._animation;
        },

        setElement: function(el) {
            if (this.$el)
                this.$el.data("layer-view", null);
            LayerView.__super__.setElement.call(this, el);
            if (this.$el)
                this.$el.data("layer-view", this);
        },

        childrenViews: function() {
            var children = [];
            this.$el.children().each(function(i, child) {
                var layerView = $(child).data("layer-view");
                if (layerView)
                    children.push(layerView);
            });
            return children;
        },

        params: function() {
            return this._params;
        },

        setParams: function(params) {
            this._params = params;
            this.setNeedsLayout(true);
            return this;
        },

        matchParentSize: function() {
            this.setParams(new LayoutParams().matchParent());
            return this;
        },

        append: function(view) {
            this.$el.append(view.$el);
            return this._childAdded(view, /* useAnimation */ false);
        },

        appendWithAnimation: function(view) {
            this.$el.append(view.$el);
            return this._childAdded(view, /* useAnimation */ true);
        },

        before: function(view, otherView) {
            otherView.$el.before(view.$el);
            return this._childAdded(view, /* useAnimation */ false);
        },

        beforeWithAnimation: function(view, otherView) {
            otherView.$el.before(view.$el);
            return this._childAdded(view, /* useAnimation */ true);
        },

        after: function(view, otherView) {
            otherView.$el.after(view.$el);
            return this._childAdded(view, /* useAnimation */ false);
        },

        afterWithAnimation: function(view, otherView) {
            otherView.$el.after(view.$el);
            return this._childAdded(view, /* useAnimation */ true);
        },

        detachWithAnimation: function() {
            return this._internalDetachWithAnimation("detach");
        },

        removeWithAnimation: function() {
            return this._internalDetachWithAnimation("remove");
        },

        detach: function() {
            return this._internalDetach("detach");
        },

        remove: function() {
            return this._internalDetach("remove");
        },

        _internalDetachWithAnimation: function(detach) {
            if (this._state != LayerView.REMOVED) {
                var parentView = this.parent();
                if (parentView)
                    return parentView._childRemoved(this, detach, /*useAnimation*/ true);
                this._internalDetachRemove(detach);
            }
            return $.Deferred().resolveWith(this).promise();
        },

        _internalDetach: function(detach) {
            if (this._state == LayerView.REMOVED)
                return this;
            var parentView = this.parent();
            if (parentView)
                return parentView._childRemoved(this, detach, /* useAnimation */ false);
            this._internalDetachRemove(detach);
            return this;
        },

        _childAdded: function(view, useAnimation) {
            view.setNeedsLayout(true);
            this.setNeedsLayout(true);
            view._state = LayerView.VISIBLE;
            if (useAnimation) {
                view.everHadLayout = false;
                return this._animateAttach(view)
                    .then(function() { return view; });
            }
            return this;
        },

        _animateAttach: function(view) {
            return $.Deferred().resolveWith(view).promise();
        },

        _internalDetachRemove: function(detach) {
            if (detach == "detach")
                this.$el.detach();
            else
                this.$el.remove();
        },

        _childRemoved: function(view, detach, useAnimation) {
            this.setNeedsLayout(true);
            view._state = LayerView.REMOVED;
            if (useAnimation) {
                return this._animateDetach(view).then(function() {
                    view._internalDetachRemove(detach);
                    return view;
                });
            } else {
                view._internalDetachRemove(detach);
            }
            return view;
        },

        _animateDetach: function(view) {
            return $.Deferred().resolveWith(view).promise();
        },

        shouldIgnoreDuringLayout: function() {
            return this._state == LayerView.REMOVED;
        },

        addClass: function(className) {
            this.$el.addClass(className);
            return this;
        },

        removeClass: function(className) {
            this.$el.removeClass(className);
            return this;
        },

        parent: function() {
            var parent = this.$el.parent();
            for (; parent.length; parent = parent.parent()) {
                var layerView = parent.data("layer-view");
                if (layerView)
                    return layerView;
            }
            return null;
        },

        layoutIfNeeded: function() {
            if (!this._needsLayout)
                return;
            this.layout();
        },

        layoutChildren: function() {
            this.setLayoutOnChildren();
            _.each(this.childrenViews(), function(view) {
                view.layoutIfNeeded();
            });
        },

        layoutBounds: function() {
            var params = this.params();
            if (!params)
                return;
            var parentView = this.parent();
            if (!parentView)
                return;
            if (params.width() == LayoutParams.MATCH_PARENT)
                this.bounds().setWidth(parentView.bounds().width());
            if (params.height() == LayoutParams.MATCH_PARENT)
                this.bounds().setHeight(parentView.bounds().height());
        },

        setLayoutOnChildren: function() {
            if (!this.checkInvalidationFlag("size"))
                return;
            _.each(this.childrenViews(), function(view) {
                view.setNeedsLayout(true);
            });
        },

        layout: function() {
            this.layoutBounds();
            this.layoutChildren();
            this.setNeedsLayout(false);
        },

        setNeedsLayout: function(needsLayout) {
            if (this._needsLayout == needsLayout)
                return;
            this._needsLayout = needsLayout;
            if (needsLayout && this.$el.parent().length) {
                var parentView = this.parent();
                if (parentView) {
                    parentView.setNeedsLayout(needsLayout);
                } else {
                    requestAnimationFrame.once("layout", this.onBeforeUpdate, this).run();
                }
            }
        },

        onBeforeUpdate: function() {
            this.layoutIfNeeded();
        },

        updateLayout: function() {
            this.setNeedsLayout(true);
            return this;
        },

        setBounds: function(bounds) {
            this._bounds.set(bounds);
        },

        bounds: function() {
            return this._bounds;
        },

        setMargin: function(margin) {
            this._margin.set(margin);
        },

        margin: function() {
            return this._margin;
        },

        setPadding: function(padding) {
            this._padding.set(padding);
        },

        padding: function() {
            return this._padding;
        },

        outerWidth: function() {
            return this.bounds().width() +
                this.padding().horizontal() +
                this.margin().horizontal();
        },

        outerHeight: function() {
            return this.bounds().height() +
                this.padding().vertical() +
                this.margin().vertical();
        },

        setTransform: function(transform) {
            this._transform.set(transform);
        },

        transform: function() {
            return this._transform;
        },

        opacity: function() {
            return this._opacity;
        },

        setOpacity: function(opacity) {
            this._opacity = opacity;
            this._onOpacityChanged();
            return this;
        },

        render: function() {
            this.$el.addClass("js-layer-view");
            this._validatePosition();
            this._validateSize();
            this._validateTransform();
            return this;
        },

        invalidate: function(type) {
            this._requestAnimationFrame();
            this._invalidationFlags[type] = true;
        },

        checkInvalidationFlag: function(type) {
            return this._invalidationFlags ? this._invalidationFlags[type] : false;
        },

        _requestAnimationFrame: function() {
            if (this._invalidationFlags)
                return;
            this._invalidationFlags = {};
            requestAnimationFrame(this._update.bind(this));
        },

        _update: function() {
            if (!this._invalidationFlags)
                return;
            var invalidationFlags = this._invalidationFlags;
            this._invalidationFlags = null;
            var self = this;
            _.each(invalidationFlags, function(enabled, type) {
                if (!enabled)
                    return;
                self._validate(type);
            });
            this.trigger("update");
        },

        _validate: function(type) {
            var fn = this["_validate" + _.string.capitalize(type)];
            if (fn)
                fn.call(this);
            else
                this.trigger("validate:" + type);
        },

        _validatePosition: function() {
            this.$el
                .css("left", this._bounds.x())
                .css("top", this._bounds.y());
        },

        _validateSize: function() {
            this.$el
                .css("width", this._bounds.width())
                .css("height", this._bounds.height());
            console.log(this.$el.get(0), this._bounds.width(), this._bounds.height());
        },

        _validateTransform: function() {
            var result = this._transform;
            if (this._animation)
                result = this._animation.viewState().blendTransform(result);
            if (result.has3DTransforms())
                this.$el.css("transform", result.toString());
            else
                this.$el.css("transform", result.toString() + " translateZ(0)");
        },

        _validateOpacity: function() {
            var result = this._opacity;
            if (this._animation)
                result = this._animation.viewState().blendOpacity(result);
            this.$el.css("opacity", result);
        },

        _validatePadding: function() {
            this.$el.css("padding", this._padding.toCSSString("px"));
        },

        _validateMargin: function() {
            this.$el.css("margin", this._margin.toCSSString("px"));
        },

        _onPositionChanged: function() {
            this.invalidate("position");
        },

        _onSizeChanged: function() {
            this.invalidate("size");
        },

        _onTransformChanged: function() {
            this.invalidate("transform");
        },

        _onOpacityChanged: function() {
            this.invalidate("opacity");
        },

        _onPaddingChanged: function() {
            this.invalidate("padding");
            this.setNeedsLayout(true);
        },

        _onMarginChanged: function() {
            this.invalidate("margin");
        },

        _onAnimationInvalidated: function(propertyName) {
            this.invalidate(propertyName);
        }
    });

    _.extend(LayerView, {
        VISIBLE: "visible",
        REMOVED: "removed"
    });

    return LayerView;

});