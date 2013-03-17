define(["utils/animation-controller"], function(AnimationController) {

    var Animation = function(name) {
        this._id = AnimationController.instance.allocateAnimationId();
        this.name = name;
        this._animations = [];
        this._stoppedAnimations = null;
    };

    _.extend(Animation.prototype, Backbone.Events, {
        compute: function(state, viewSate) {
            _.each(this._animations, function(animation) {
                animation.compute(state, viewSate);
            });
            if (this._stoppedAnimations) {
                var stoppedAnimations = this._stoppedAnimations;
                this._stoppedAnimations = null;
                var self = this;
                _.each(stoppedAnimations, function(animation) {
                    self._removeStoppedAnimation(animation, state);
                });
            }
        },

        search: function(name) {
            return _.find(this._animations, function(animation) { return animation.name == name; });
        },

        get: function(name) {
            var result = this.search(name);
            if (!result) {
                result = new Animation(name);
                this.append(result);
            }
            return result;
        },

        _injectAnimation: function(animation) {
            animation.on("change:animation", this._onAnimationPropertyChange, this);
            animation.once("stop", this._onAnimationStopped.bind(this, animation));
            this._onAnimationPropertyChange();
        },

        append: function(animation) {
            this._animations.push(animation);
            this._injectAnimation(animation);
            return this;
        },

        insert: function(animation, i) {
            this._animations.splice(i, 0, animation);
            this._injectAnimation(animation);
            return this;
        },

        remove: function(animation) {
            var index = this._animations.indexOf(animation);
            if (index == -1)
                return;
            this._internalRemove(index);
            return this;
        },

        removeAll: function() {
            _.each(this._animations, function(animation) {
                animation.off("change:animation", this._onAnimationPropertyChange, this);
            });
            this._animations = [];
            return this;
        },

        _internalRemove: function(index) {
            var animation = this._animations[index];
            this._animations.splice(index, 1);
            animation.off("change:animation", this._onAnimationPropertyChange, this);
            this._onAnimationPropertyChange();
        },

        _onAnimationStopped: function(animation) {
            if (!this._stoppedAnimations)
                this._stoppedAnimations = [];
            this._stoppedAnimations.push(animation);
        },

        _removeStoppedAnimation: function(animation, state) {
            var index = this._animations.indexOf(animation);
            if (index == -1)
                return;
            this._internalRemove(index);
            var next = animation.next();
            if (!next)
                return;
            this.insert(next, index);
            state.requestImmediateFrame();
        },

        _onAnimationPropertyChange: function() {
            this.trigger("change:animation");
        },

        last: function() {
            return (this._animations.length) ? this._animations[this._animations.length - 1] : null;
        },

        chain: function(duration) {
            var BasicAnimation = require("utils/basic-animation");
            var animation = new BasicAnimation("start").setDuration(duration !== undefined ? duration : 0);
            if (this._animations.length)
                this.last().setNext(animation);
            else
                this.append(animation);
            return animation;
        }
    });

    return Animation;

});