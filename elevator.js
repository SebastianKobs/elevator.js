/*!
 * Elevator.js
 *
 * MIT licensed
 * Copyright (C) 2015 Tim Holman, http://tholman.com
 */

/*********************************************
 * Elevator.js
 *********************************************/

var Elevator = function (options) {
    "use strict";

    // Elements
    var body = null;

    // Scroll vars
    var animation = null;
    var duration = null; // ms
    var customDuration = false;
    var startTime = null;
    var startPosition = null;
    var endPosition = 0;
    var targetElement = null;
    var verticalPadding = null;
    var elevating = false;

    var mainAudio;
    var endAudio;
    var stuckAudio;

    var startCallback;
    var endCallback;
    var stuckCallback;

    var that = this;

    //fx
    var canGetStuck = false;
    var stuckChance = 0.2;
    var stuckStepChance = null;
    var rideStucks = false;
    var bounceStart = null;
    var bounceEnd = null;
    var bounceAnimation = null;
    var bounceStartTime = null;
    var bounceDuration = 750;
    var bounceRange = 200;
    /**
     * Utils
     */

    // Thanks Mr Penner - http://robertpenner.com/easing/
    function easeInOutQuad(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }

    function easeInBounce(t, b, c, d) {
        return c - easeOutBounce(d - t, 0, c, d) + b;
    }

    function easeOutBounce(t, b, c, d) {
        if ((t /= d) < (1 / 2.75)) {
            return c * (7.5625 * t * t) + b;
        } else if (t < (2 / 2.75)) {
            return c * (7.5625 * (t -= (1.5 / 2.75)) * t + .75) + b;
        } else if (t < (2.5 / 2.75)) {
            return c * (7.5625 * (t -= (2.25 / 2.75)) * t + .9375) + b;
        } else {
            return c * (7.5625 * (t -= (2.625 / 2.75)) * t + .984375) + b;
        }
    }

    function easeInOutBounce(t, b, c, d) {
        if (t < d / 2) return easeInBounce(t * 2, 0, c, d) * .5 + b;
        return easeOutBounce(t * 2 - d, 0, c, d) * .5 + c * .5 + b;
    }

    function extendParameters(options, defaults) {
        for (var option in defaults) {
            var t =
                options[option] === undefined && typeof option !== "function";
            if (t) {
                options[option] = defaults[option];
            }
        }
        return options;
    }

    function getVerticalOffset(element) {
        var verticalOffset = 0;
        while (element) {
            verticalOffset += element.offsetTop || 0;
            element = element.offsetParent;
        }

        if (verticalPadding) {
            verticalOffset = verticalOffset - verticalPadding;
        }

        return verticalOffset;
    }

    function getClampedRandomValue(min, max) {
        return Math.max(min, Math.min(max, Math.random()));
    }

    /**
     * Main
     */

    // Time is passed through requestAnimationFrame, what a world!
    function animateLoop(time) {
        if (!startTime) {
            startTime = time;
        }

        var timeSoFar = time - startTime;
        var easedPosition = easeInOutQuad(
            timeSoFar,
            startPosition,
            endPosition - startPosition,
            duration
        );

        window.scrollTo(0, easedPosition);

        if (timeSoFar < duration) {
            animation = requestAnimationFrame(animateLoop);
        } else {
            animationFinished();
        }
        /**
         * fx: stuck chance gets higher based on elapsed time
         * actual chance to get stuck is random per ride
         */
        if (rideStucks) {
            document.body.style.opacity = getClampedRandomValue(0.4, 0.8);
        }
        if (rideStucks && Math.random() * (timeSoFar / duration) > stuckStepChance) {
            animationFinishedOnStuck();
        }
    }

    function animateBounce(time) {
        if (!bounceStartTime) {
            bounceStartTime = time;
        }

        var timeSoFar = time - bounceStartTime;
        var easedPosition = easeInOutBounce(
            timeSoFar,
            bounceStart,
            bounceEnd - bounceStart,
            bounceDuration
        );
        window.scrollTo(0, easedPosition);

        if (timeSoFar < bounceDuration) {
            bounceAnimation = requestAnimationFrame(animateBounce);
        } else {
            resetBounce();
        }
    }

    //            ELEVATE!
    //              /
    //         ____
    //       .'    '=====<0
    //       |======|
    //       |======|
    //       [IIIIII[\--()
    //       |_______|
    //       C O O O D
    //      C O  O  O D
    //     C  O  O  O  D
    //     C__O__O__O__D
    //    [_____________]
    this.elevate = function () {
        if (elevating) {
            return;
        }

        elevating = true;
        //fx: add chance to get stuck
        if (canGetStuck) {
            if (Math.random() > stuckChance) {
                rideStucks = true;
                stuckStepChance = getClampedRandomValue(0.3, 0.7);
            }
        }
        startPosition = document.documentElement.scrollTop || body.scrollTop;
        updateEndPosition();

        // No custom duration set, so we travel at pixels per millisecond. (0.75px per ms)
        if (!customDuration) {
            duration = Math.abs(endPosition - startPosition) * 1.5;
        }

        requestAnimationFrame(animateLoop);

        // Start music!
        if (mainAudio) {
            mainAudio.play();
        }

        if (startCallback) {
            startCallback();
        }
    };

    function browserMeetsRequirements() {
        return (
            window.requestAnimationFrame &&
            window.Audio &&
            window.addEventListener
        );
    }

    function resetPositions() {
        startTime = null;
        startPosition = null;
        elevating = false;
    }

    function resetBounce() {
        //fx reset
        bounceStartTime = null;
        bounceStart = null;
        rideStucks = false;
        stuckStepChance = getClampedRandomValue(0.3, 0.7);
        document.body.style.opacity = 1;
    }



    function updateEndPosition() {
        if (targetElement) {
            endPosition = getVerticalOffset(targetElement);
        }
    }

    function animationFinishedOnStuck() {
        cancelAnimationFrame(animation);

        bounceStart = document.documentElement.scrollTop || body.scrollTop;
        bounceEnd = bounceStart - bounceRange;

        resetPositions();

        stopMainAudio();

        requestAnimationFrame(animateBounce);

        if (stuckAudio) {
            stuckAudio.play();
        }

        if (stuckCallback) {
            stuckCallback();
        }
    }
    function animationFinished() {
        resetPositions();

        // Stop music!
        stopMainAudio();

        if (endAudio) {
            endAudio.play();
        }

        if (endCallback) {
            endCallback();
        }
    }

    function stopMainAudio() {
        if (mainAudio) {
            mainAudio.pause();
            mainAudio.currentTime = 0;
        }
    }
    function onWindowBlur() {
        // If animating, go straight to the top. And play no more music.
        cancelAnimationFrame(bounceAnimation);
        resetBounce();

        if (elevating) {
            cancelAnimationFrame(animation);
            resetPositions();

            if (mainAudio) {
                mainAudio.pause();
                mainAudio.currentTime = 0;
            }

            updateEndPosition();
            window.scrollTo(0, endPosition);
        }
    }

    function bindElevateToElement(element) {
        if (element.addEventListener) {
            element.addEventListener("click", that.elevate, false);
        } else {
            // Older browsers
            element.attachEvent("onclick", function () {
                updateEndPosition();
                document.documentElement.scrollTop = endPosition;
                document.body.scrollTop = endPosition;
                window.scroll(0, endPosition);
            });
        }
    }

    function init(_options) {
        // Take the stairs instead
        if (!browserMeetsRequirements()) {
            return;
        }

        // Bind to element click event.
        body = document.body;

        var defaults = {
            duration: undefined,
            mainAudio: false,
            endAudio: false,
            preloadAudio: true,
            loopAudio: true,
            startCallback: null,
            endCallback: null,
            canGetStuck: false
        };

        _options = extendParameters(_options, defaults);

        if (_options.element) {
            bindElevateToElement(_options.element);
        }

        if (_options.duration) {
            customDuration = true;
            duration = _options.duration;
        }

        if (_options.targetElement) {
            targetElement = _options.targetElement;
        }

        if (_options.verticalPadding) {
            verticalPadding = _options.verticalPadding;
        }
        //fx
        if (_options.canGetStuck) {
            canGetStuck = true;
        }

        window.addEventListener("blur", onWindowBlur, false);

        if (_options.mainAudio) {
            mainAudio = new Audio(_options.mainAudio);
            mainAudio.setAttribute("preload", _options.preloadAudio);
            mainAudio.setAttribute("loop", _options.loopAudio);
        }

        if (_options.endAudio) {
            endAudio = new Audio(_options.endAudio);
            endAudio.setAttribute("preload", "true");
        }

        if (_options.endCallback) {
            endCallback = _options.endCallback;
        }

        if (_options.startCallback) {
            startCallback = _options.startCallback;
        }
    }

    init(options);
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = Elevator;
}
