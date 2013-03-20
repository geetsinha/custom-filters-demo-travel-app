define(["mobileui/utils/time"], function(Time) {

    function computeDirection(x) { return x >= 0 ? 1 : -1; }

    var Momentum = function(duration) {
        this._duration = duration;
        this._minAcceleration = 1 / 50;
        this._friction = 0.001;
        this.reset();
    };

    _.extend(Momentum.prototype, Backbone.Events, {
        setDuration: function(duration) {
            this._duration = duration;
        },

        reset: function() {
            this._direction = 0;
            this._velocity = 0;
            this._acceleration = 0;
            this._previousValue = 0;
            this._previousTime = null;
        },

        computeDelta: function() {
            if (Math.abs(this._acceleration) > this._minAcceleration)
                return this._velocity * this._duration + 
                    this._acceleration * this._friction * this._duration * this._duration;
            return 0;
        },

        injectValue: function(value) {
            var direction = computeDirection(value);
            if (direction != this._direction) {
                this._velocity = 0;
                this._acceleration = 0;
            }
            var time = Time.now();
            if (this._previousTime !== null) {
                var deltaTime = time - this._previousTime;
                if (deltaTime) {
                    var velocity = (value - this._previousValue) / deltaTime;
                    this._acceleration = (velocity - this._velocity) / deltaTime;
                    this._velocity = velocity;
                }
            }
            this._previousValue = value;
            this._previousTime = time;
        }
    });

    return Momentum;

});