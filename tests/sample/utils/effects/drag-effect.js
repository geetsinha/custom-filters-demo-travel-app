define(["utils/effects/base-effect",
        "mobileui/utils/transform",
        "mobileui/utils/filter"],
    function(BaseEffect, Transform, Filter) {

    var commitDuration = 300,
        revertDuration = 100;

    function DragEffect(verticalLayout) {
        BaseEffect.call(this);
    }

    _.extend(DragEffect.prototype, BaseEffect.prototype, {
        isSupported: function() {
            return true;
        },

        onDragStart: function(containerView, filterView, nextCard, verticalLayout) {
            containerView.animation().removeAll();
            nextCard.filter().get("grayscale").setIntensity(100);
            nextCard.setOpacity(0.5);

            var translate = containerView.transform().get("translate");
            return verticalLayout ? translate.x() : translate.y();
        },

        onDragMove: function(containerView, filterView, nextCard, transform, dragStartValue, verticalLayout) {
            var translate = containerView.transform().get("translate"),
                grayscale = nextCard.filter().get("grayscale"),
                value;
            if (verticalLayout) {
                value = Math.min(0, dragStartValue + transform.dragX);
                translate.setX(value);
                grayscale.setIntensity(100 + value / containerView.bounds().width() * 100);
                nextCard.setOpacity(-value / containerView.bounds().width() / 2 + 0.5);
            } else {
                value = Math.min(0, dragStartValue + transform.dragY);
                translate.setY(value);
                grayscale.setIntensity(100 + value / containerView.bounds().height() * 100);
                nextCard.setOpacity(-value / containerView.bounds().height() / 2 + 0.5);
            }
            return value;
        },

        shouldRevert: function(containerView, value, direction, verticalLayout) {
            value *= 4;
            return ((verticalLayout && ((value > - containerView.bounds().width()) || (direction < 0))) ||
                (!verticalLayout && ((value > - containerView.bounds().height()) || (direction < 0))));
        },

        commit: function(containerView, filterView, nextCard, verticalLayout) {
            var chain = containerView.animation().start().get("slide-transform").chain(),
                transform = new Transform();

            if (verticalLayout)
                transform.translate(-containerView.bounds().width(), 0);
            else
                transform.translate(0, -containerView.bounds().height());
            chain = chain.transform(commitDuration, transform);

            containerView.animation().get("slide")
                .chain()
                .opacity(commitDuration, 0);

            nextCard.animation().start().get("slide-filter")
                .chain()
                .filter(commitDuration, new Filter().grayscale(0));
            nextCard.animation().get("slide-opacity")
                .chain()
                .opacity(commitDuration, 1);

            return chain;
        },

        revert: function(containerView, filterView, nextCard) {
            var chain = containerView.animation().start().get("slide-transform").chain();
            chain = chain.transform(revertDuration, new Transform());

            containerView.animation().get("slide")
                .chain()
                .opacity(revertDuration, 1);
            nextCard.animation().start().get("slide-filter")
                .chain()
                .filter(revertDuration, new Filter().grayscale(100));
            nextCard.animation().get("slide-opacity")
                .chain()
                .opacity(revertDuration, 0.5);

            return chain;
        },

        cleanup: function(containerView, filterView, nextCard) {
            nextCard.filter().clear();
        }
    });

    return DragEffect;

});
