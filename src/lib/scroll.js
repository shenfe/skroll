/**
 * Advice:
 * Don't change the size of container elements easily.
 * If something needs to be inputted, open a dialog.
 */
define(function() {
    var page,
        scrollBar,
        plugins,
        heightOf = {
            page: 0,
            parent: 0,
            bar: 0,
            foo: 0
        },
        startX,
        startY,
        startTop,
        thenX, thenY, nowX, nowY,
        lastMoveTime,
        lastLastMoveTime,
        totalDistX,
        totalDistY,
        threshold = 150, //required min distance traveled to be considered swipe
        restraint = 100, // maximum distance allowed at the same time in perpendicular direction
        allowedTime = 300, // maximum time allowed to travel that distance
        thresholdTime = 100,
        acceleration = 4000,
        maxSpeed = 4000,
        startTime,
        scrollPosition = 0,
        distXIntervals = [],
        distYIntervals = [],
        timeIntervals = [],
        scrollBarConf = {
            draggable: false,
            minHeight: '10px',
            hideDelay: 1000,
            mode: 0 // 0: hidden, 1: autoShow, 2: alwaysShow
        },
        ifRequestAnimationFrame,
        requestAnimationFrame = window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            function(callback){ window.setTimeout(callback, 1000/60) },
        scrollBarData = {
            hideTimeout: null,
            thenX: null,
            nowX: null,
            thenY: null,
            nowY: null,
            startX: null,
            startY: null,
            totalDistX: null,
            totalDistY: null,
            startTop: null,
            startTime: null,
            lastMoveTime: null,
            lastLastMoveTime: null,
            scrollPosition: 0
        };
    var ScrollHelp = {
        updateHeights: function() {
            heightOf.parent = heightOf.foo = page.parentNode.clientHeight; // clientHeight / offsetHeight / getBoundingClientRect ?
            heightOf.page = page.clientHeight;
            heightOf.bar = heightOf.foo * heightOf.parent / heightOf.page;
        },
        getScrollBar: function() {
            if(scrollBar) return scrollBar;
            var p = page.parentNode;
            if(!p) return null;
            var b = p.getElementsByClassName('scroll-foo');
            if(!b || !b.length) {
                var f = document.createElement('div');
                b = document.createElement('div');
                f.className = 'scroll-foo';
                f.setAttribute('style', 'position: absolute;top: 0;right: 0;width: 8px;height: 100%;background-color: #ccc;z-index: 100;opacity: 0.8;' + (scrollBarConf.mode == 1 ? 'display: none;' : ''));
                b.setAttribute('style', 'position: relative;top: 0;right: 0;background-color: #666;width: 100%;height: 0;');
                f.appendChild(b);
                p.appendChild(f);

                ScrollHelp.updateHeights();
                b.style.height = heightOf.parent / heightOf.page * 100 + '%';

                b.addEventListener('touchstart', function(e) {
                    if(!scrollBarConf.draggable) return;

                    var touchobj = e.changedTouches[0];
                    scrollBarData.thenX = scrollBarData.nowX = scrollBarData.startX = touchobj.pageX;
                    scrollBarData.thenY = scrollBarData.nowY = scrollBarData.startY = touchobj.pageY;
                    scrollBarData.startTime = scrollBarData.lastLastMoveTime = scrollBarData.lastMoveTime = Date.now();
                    scrollBarData.startTop = scrollBarData.scrollPosition = ScrollHelp.stopTranslate(this);

                    ScrollHelp.stopTranslate(page);

                    ScrollHelp.updateHeights();

                    if(scrollBarConf.mode === 1) {
                        this.parentNode.style.display = 'block';
                        if(scrollBarData.hideTimeout != null) {
                            window.clearTimeout(scrollBarData.hideTimeout);
                        }
                    }

                    e.preventDefault();
                }, false);
                b.addEventListener('touchmove', function(e) {
                    if(!scrollBarConf.draggable) return;

                    if(heightOf.bar >= heightOf.foo) {
                        return;
                    }
                    var touchobj = e.changedTouches[0];

                    var newY = scrollBarData.startTop + touchobj.pageY - scrollBarData.startY;
                    if (newY < 0) newY = 0;
                    var maxTranslateY = ScrollHelp.getMaxTranslate('bar', this);
                    if (newY > maxTranslateY) newY = maxTranslateY;
                    scrollBarData.scrollPosition = ScrollHelp.setTranslate('bar', this, newY, true);

                    scrollBarData.thenX = scrollBarData.nowX;
                    scrollBarData.nowX = touchobj.pageX;
                    scrollBarData.thenY = scrollBarData.nowY;
                    scrollBarData.nowY = touchobj.pageY;
                    scrollBarData.lastLastMoveTime = scrollBarData.lastMoveTime;
                    scrollBarData.lastMoveTime = Date.now();

                    ScrollHelp.setTranslate('page', page, -heightOf.page * (newY / heightOf.foo));

                    e.preventDefault(); // prevent scrolling when inside DIV
                }, false);
                b.addEventListener('touchend', function(e) {
                    if(!scrollBarConf.draggable) return;

                    if(scrollBarConf.mode == 1) {
                        scrollBarData.hideTimeout = window.setTimeout(function() {
                            this.parentNode.style.display = 'none';
                        }.bind(this), scrollBarConf.hideDelay);
                    }
                    e.preventDefault();
                }, false);
            } else {
                b = b[0].childNodes[0];
            }
            scrollBar = b;
            return b;
        },
        calSpeed: function(dists, times, dist, time) {
            var len = dists.length;
            var r = 2;
            if(len <= 0) return 0;
            if(len == 1) {
                if(times[0] <= 0) return 0;
                return dists[0] / times[0];
            }
            if(len < 2 * r) {
                return dist / time;
            }
            var d1, t1, d2, t2, ta;
            d1 = d2 = 0;
            t1 = t2 = ta = 0;
            for(var i = 1; i <= r; i++) {
                d1 += dists[len - i];
                t1 += times[len - i];
                d2 += dists[len - i - r];
                t2 += times[len - i - r];
            }
            if(len < 3 * r) {
                t = (t1 + t2) / 2;
                return (d1 / t) * 2 - d2 / t;
            }
            var d3, t3;
            d3 = t3 = 0;
            for(var i = len - 1 - 2 * r; i >= len - 3 * r; i--) {
                d3 += dists[i];
                t3 += times[i];
            }
            t = (t1 + t2 + t3) / 3;
            return d1 / t + d2 / t - d3 / t;
        },
        getMaxTranslate: function(id, el) {
            if(id === 'page') return heightOf.parent - heightOf.page;
            return heightOf.foo - heightOf.bar;
        },
        _setT: function(el, t) {
            el.style.transform = el.style.WebkitTransform = 'translate3d(0,' + t + 'px,0)';
        },
        setTranslate: function(id, el, d, r) {
            var t = d || 0;
            if(!r) {
                if (t > 0) t = 0;
                else if (t < this.getMaxTranslate(id, el)) t = this.getMaxTranslate(id, el);
            } else {
                if (t < 0) t = 0;
                else if (t > this.getMaxTranslate(id, el)) t = this.getMaxTranslate(id, el);
            }

            var tt = t;

            if (ifRequestAnimationFrame) {
                requestAnimationFrame((function(_el, _t) {
                    return function() {
                        ScrollHelp._setT(_el, _t);
                    };
                })(el, t));
            } else {
                ScrollHelp._setT(el, t);
            }

            return tt;
        },
        _calTranslate: function(s0, v, a) {
            return parseFloat(s0) + (v > 0 ? 1 : -1) * v * v / (2 * Math.abs(a));
        },
        _setTransitionClass: function(el, time, x1, y1, x2, y2) {
            var t = time ? ('transform ' + time + 's cubic-bezier(' + x1 + ', ' + y1 + ', ' + x2 + ', ' + y2 + ')') : x1;
            el.style.transition = el.style.WebkitTransition = t;
            return t;
        },
        updateTransition: function(id, el, v, a, p, _b0, _b1) {
            if (a > 0) a = -a;
            var b0 = _b0 || 0,
                b1 = _b1 || this.getMaxTranslate(id, el),
                newP = this._calTranslate(p, v, a),
                d = 0;

            if (newP > b0) d = b0 - p;
            else if (newP < b1) d = p - b1;
            else d = Math.abs(newP - p);

            v = Math.abs(v);

            var foo = v * v + 2 * a * d;
            if (foo < 0) foo = 0;
            var time = (Math.sqrt(foo) - v) / a,
                x1 = 1 / 3,
                y1 = v * time / d / 3,
                x2 = x1 + 1 / 3,
                y2 = y1 + 1 / 3;

            var t = this._setTransitionClass(el, time, x1, y1, x2, y2);

            return {
                position: this.setTranslate(id, el, newP),
                distance: d,
                time: time,
                transition: t
            };
        },
        stopTranslate: function(el) {
            var computedStyle = window.getComputedStyle(el);
            var t = computedStyle.getPropertyValue('transform');
            el.style.transform = el.style.WebkitTransform = t;

            if (t != 'none') {
                t = t.substring(t.lastIndexOf(', ') + 2, t.length - (t.endsWith('px)') ? 3 : 1));
            }

            if (t == 'none') {
                t = 0;
            }

            el.style.transition = el.style.WebkitTransition = '';

            return parseFloat(t);
        }
    };

    var putPlugins = function() {
        var ens = eventQueues.names;
        var pl = null;
        for(var i = 0, ilen = plugins.length; i < ilen; i++) {
            pl = plugins[i];
            for(var j = 0, jlen = ens.length; j < jlen; j++) {
                if(pl['onScroll' + ens[j]]) {
                    eventQueues['on' + ens[j]].push(pl['onScroll' + ens[j]]);
                }
            }
        }
    };

    var eventQueues = {
        names: ['Init', 'Start', 'Pause', 'Move', 'End'],
        onInit: [],
        init: function(el, data) {
            for(var i = 0, len = this.onInit.length; i < len; i++) {
                this.onInit[i](el, data);
            }
        },
        onStart: [], // start a scroll, and actually pause a scroll at the same time
        start: function(el, data) {
            for(var i = 0, len = this.onStart.length; i < len; i++) {
                this.onStart[i](el, data);
            }
        },
        onMove: [],
        move: function(el, data) {
            for(var i = 0, len = this.onMove.length; i < len; i++) {
                this.onMove[i](el, data);
            }
        },
        onEnd: [],
        end: function(el, data) {
            for(var i = 0, len = this.onEnd.length; i < len; i++) {
                this.onEnd[i](el, data);
            }
        }
    };

    var onResize = function() {
        ScrollHelp.updateHeights();
        if(scrollBarConf.mode != 0) ScrollHelp.getScrollBar();
    };

    var control = function(dom, conf) {
        page = dom;
        acceleration = conf.acceleration || 4000;
        scrollBarConf.mode = conf.scrollBarMode || 0;
        ifRequestAnimationFrame = !!conf.raf;

        ScrollHelp.updateHeights();

        plugins = conf.plugins;
        putPlugins();
        eventQueues.init(page);

        // 初始化滚动条
        if(scrollBarConf.mode != 0) ScrollHelp.getScrollBar();

        page.addEventListener('touchstart', function(e) {
            var touchobj = e.changedTouches[0];
            thenX = nowX = startX = touchobj.pageX;
            thenY = nowY = startY = touchobj.pageY;
            startTime = lastLastMoveTime = lastMoveTime = Date.now();
            startTop = scrollPosition = ScrollHelp.stopTranslate(this);

            ScrollHelp.updateHeights();

            if(scrollBarConf.mode != 0 && heightOf.parent && heightOf.page && heightOf.parent < heightOf.page) {
                var b = ScrollHelp.getScrollBar();
                if(scrollBarConf.mode == 1) {
                    b.parentNode.style.display = 'block';
                    if(scrollBarData.hideTimeout != null) {
                        window.clearTimeout(scrollBarData.hideTimeout);
                    }
                }
                b.style.height = heightOf.parent / heightOf.page * 100 + '%';
                ScrollHelp.stopTranslate(b);
            }

            distXIntervals = [],
            distYIntervals = [],
            timeIntervals = [];

            eventQueues.start(this, {
                position: startTop
            });

            console.log('touchstart ' + startTop);

            // e.preventDefault();
        }, false);

        page.addEventListener('touchmove', function(e) {
            if(heightOf.page <= heightOf.parent) {
                return;
            }
            var touchobj = e.changedTouches[0];

            var newY = startTop + touchobj.pageY - startY;
            if (newY > 0) newY = 0;
            var maxTranslateY = ScrollHelp.getMaxTranslate('page', this);
            if (newY < maxTranslateY) newY = maxTranslateY;
            scrollPosition = ScrollHelp.setTranslate('page', this, newY);

            thenX = nowX;
            nowX = touchobj.pageX;
            thenY = nowY;
            nowY = touchobj.pageY;
            lastLastMoveTime = lastMoveTime;
            lastMoveTime = Date.now();

            distXIntervals.push(nowX - thenX);
            distYIntervals.push(nowY - thenY);
            timeIntervals.push(lastMoveTime - lastLastMoveTime);

            if(scrollBarConf.mode != 0 && heightOf.parent && heightOf.page) {
                ScrollHelp.setTranslate('bar', ScrollHelp.getScrollBar(), -heightOf.foo * (newY / heightOf.page), true);
            }

            // e.preventDefault(); // prevent scrolling when inside DIV
        }, false);

        page.addEventListener('touchend', function(e) {
            var touchobj = e.changedTouches[0];
            totalDistX = touchobj.pageX - startX;
            totalDistY = touchobj.pageY - startY;
            var elapsedTime = Date.now() - startTime;
            var scrollDir = null;
            if (elapsedTime <= allowedTime) {
                if (Math.abs(totalDistX) >= threshold && Math.abs(totalDistY) <= restraint) {
                    scrollDir = (totalDistX < 0) ? 'left' : 'right';
                } else if (Math.abs(totalDistY) >= threshold && Math.abs(totalDistX) <= restraint) {
                    scrollDir = (totalDistY < 0) ? 'up' : 'down';
                }
            }

            var endTime = Date.now();
            var curPosition = scrollPosition;
            var transBoundary = ScrollHelp.getMaxTranslate('page', this);
            if (endTime - lastMoveTime < thresholdTime && heightOf.parent && heightOf.page && heightOf.parent < heightOf.page) {
                var initialSpeed = 1000 * ScrollHelp.calSpeed(distYIntervals, timeIntervals, totalDistY, elapsedTime);
                if(Math.abs(initialSpeed) > maxSpeed) {
                    initialSpeed = (initialSpeed < 0 ? -maxSpeed : maxSpeed);
                }

                var transResult = ScrollHelp.updateTransition('page', this, initialSpeed, acceleration, scrollPosition, 0, transBoundary);
                curPosition = transResult.position;

                if(scrollBarConf.mode != 0) {
                    var b = ScrollHelp.getScrollBar();
                    ScrollHelp._setTransitionClass(b, false, transResult.transition);
                    ScrollHelp.setTranslate('bar', b, -curPosition / heightOf.page * heightOf.foo, true);
                    if(scrollBarConf.mode == 1) {
                        scrollBarData.hideTimeout = window.setTimeout(function() {
                            b.parentNode.style.display = 'none';
                        }, transResult.time * 1000 + scrollBarConf.hideDelay);
                    }
                }

                eventQueues.end(this, {
                    scrollDir: scrollDir,
                    totalDistX: totalDistX,
                    totalDistY: totalDistY,
                    elapsedTime: elapsedTime,
                    distXIntervals: distXIntervals,
                    distYIntervals: distYIntervals,
                    timeIntervals: timeIntervals,
                    endPosition: curPosition,
                    startPosition: startTop,
                    transBoundary: transBoundary
                });

                console.log('touchend ' + curPosition);
            }

            // e.preventDefault();
        }, false);
    };

    return {
        control: control
    };
});
