define(function () {
    var _list = null,
        _conf = {
            hideAsInit: true,
            mode: 1, // 1: active, to get element pos in time; 0: passive, to keep element pos and wait for changes to come.
            _liveRangeOffset: 0,
            get liveRangeOffset() {
                if(this._liveRangeOffset) return this._liveRangeOffset;
                this._liveRangeOffset = Math.ceil(this.screenMaxHeight / _cache.minHeight * this.liveRatio);
                return this._liveRangeOffset;
            },
            set liveRangeOffset(ro) {
                this._liveRangeOffset = ro;
            },
            _liveRange: 0,
            get liveRange() {
                if(this._liveRange) return this._liveRange;
                this._liveRange = Math.ceil(this.screenMaxHeight / _cache.minHeight * (1 + this.liveRatio));
                return this._liveRange;
            },
            set liveRange(r) {
                this._liveRange = r;
            },
            liveRatio: 1,
            displayNeeded: false,
            ifRequestAnimationFrame: false,
            screenMaxHeight: window.screen.height
        },
        _cache = {
            touchStartLock: false,
            touchEndLock: false,
            showBegin: 0,
            showEnd: 0,
            listLen: 0,
            begin: 0, // 刚好没过(<=)pos的元素索引，从1到len-2
            pos: 0,
            dir: 0, // 0: down, 1: up
            hIndex: [], // height
            hIndexOf: function(i, children) {
                if(_conf.mode === 0) return this.hIndex[i];
                if(i < this.pSafeTo) return this.hIndex[i];
                var r;
                if(i < this.pSafeTo) {
                    r = this.pIndex[i + 1] - this.pIndex[i];
                } else {
                    r = children[i].offsetHeight;
                }
                this.hIndex[i] = r;
                return r;
            },
            pIndex: [], // position
            pIndexOf: function(i, children) { //TODO: RECONSIDER
                if(_conf.mode === 0) return this.pIndex[i];
                if(i <= this.pSafeTo) return this.pIndex[i];
                var r = children[i].offsetTop; // or use getBoundingClientRect() ?
                if(r === 0) r = this.preHeight;
                if(this.pIndex[i] === r) {
                    this.pSafeTo = i;
                }
                else this.pIndex[i] = r;
                return r;
            },
            pUnsafeAll: function() { // 使用过hIndexOf、pIndexOf后，需要及时将pSafeTo重置
                this.pSafeTo = 0;
            },
            pSafeTo: 0,
            vIndex: [], // visible
            dIndex: [], // display
            rIndex: [], // removal
            preHeight: 0,
            subHeight: 0,
            minHeight: 1000000 // minimum height of a child node
        };

    window._cache = _cache;

    var helper = {};

    var _requestAnimationFrame = window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        function(callback){ window.setTimeout(callback, 1000/60) };

    var _getStyle = function (oElm, strCssRule) {
        var strValue = '';
        if (document.defaultView && document.defaultView.getComputedStyle) {
            strValue = document.defaultView.getComputedStyle(oElm, '').getPropertyValue(strCssRule);
        } else if (oElm.currentStyle) {
            strCssRule = strCssRule.replace(/\-(\w)/g, function (strMatch, p1) {
                return p1.toUpperCase();
            });
            strValue = oElm.currentStyle[strCssRule];
        }
        return strValue;
    };

    var _initBlank = function () {
        _cache.preHeight = 0;
        _cache.subHeight = 0;
    };

    var _initIndex = function () {
        var children = _list.childNodes;
        var len = children.length;
        var h = 0;
        var curH, minH = 1000000;
        for (var i = 0; i < len; i++) {
            children[i].setAttribute('data-key', i);
            curH = children[i].offsetHeight;
            if(curH < minH && curH > 12) {
                minH = curH;
            }
            // if(_conf.mode === 0) {
                _cache.pIndex[i] = h;
                _cache.hIndex[i] = curH;
            // }
            h += curH;
            _cache.vIndex[i] = true;
            if (_conf.displayNeeded) _cache.dIndex[i] = _getStyle(children[i], 'display');
        }
        _cache.showBegin = 0;
        _cache.showEnd = len - 1;
        _cache.minHeight = minH;
        // console.log('minItemHeight: ' + _cache.minHeight);
    };

    var init = function (list) {
        var children = list.childNodes;
        if (!children || !children.length) {
            return;
        }

        _list = list;

        _initBlank();

        _initIndex();

        var len = children.length;

        if(_conf.hideAsInit) { // 隐藏首尾
            var tempBegin = 0 - _conf.liveRangeOffset,
                tempEnd = 0 + _conf.liveRange;
            if(tempBegin < 0) tempBegin = 0;
            if(tempEnd > len) tempEnd = len;
            var i;
            for(i = tempBegin - 1; i >= 0; i--) {
                _cache.preHeight += _cache.hIndexOf(i, children);
                children[i].style.display = 'none';
                _cache.vIndex[i] = false;
            }
            _list.style.paddingTop = _cache.preHeight + 'px';

            for(i = tempEnd; i < len; i++) {
                _cache.subHeight += _cache.hIndexOf(i, children);
                children[i].style.display = 'none';
                _cache.vIndex[i] = false;
            }
            _list.style.paddingBottom = _cache.subHeight + 'px';

            _cache.showBegin = tempBegin;
            _cache.showEnd = tempEnd - 1;
        }

        _cache.listLen = len;
    };

    var _getBeginOfScrollEnd = function(pos, len, children) {
        // console.log('_getBeginOfScrollEnd');
        var begin = -1, i;
        // console.log('    find new begin of scroll-end, from: ' + _cache.begin);
        if (_cache.dir === 0) { // 向下移动
            var pi;
            for (i = _cache.begin; i >= 0; i--) {
                if(_cache.rIndex[i] === true) continue;
                pi = _cache.pIndexOf(i, children);
                if (pi <= pos) { // 第i个元素刚好没过pos
                    begin = i;
                    break;
                }
            }
            _cache.pUnsafeAll();
            if(begin < 0) begin = 0;
        } else { // 向上移动
            var pi;
            for (i = _cache.begin; i < len; i++) {
                if(_cache.rIndex[i] === true) continue;
                pi = _cache.pIndexOf(i, children);
                if (pi > pos) { // 第i个元素刚好超过pos
                    begin = i - 1;
                    break;
                }
            }
            _cache.pUnsafeAll();
            if(begin < 0) begin = len - 1;
        }
        // console.log('                                  to: ' + begin);
        return begin;
    };

    var _getBeginOfTouchStart = function(pos, len, children) {
        // console.log('_getBeginOfTouchStart');
        var begin = _cache.begin, i;
        if (_cache.dir === 0) { // 向下移动
            for (i = _cache.begin; i < len; i++) {
                if(_cache.rIndex[i] === true) continue;
                if (_cache.pIndexOf(i, children) <= pos) { // 第i个元素刚好没过pos
                    begin = i;
                } else break;
            }
            _cache.pUnsafeAll();
        } else { // 向上移动
            for (i = _cache.begin; i >= 0; i--) {
                if(_cache.rIndex[i] === true) continue;
                if (_cache.pIndexOf(i, children) > pos) { // 第i个元素刚好超过pos
                    continue;
                } else {
                    begin = i;
                    break;
                }
            }
            _cache.pUnsafeAll();
        }
        return begin;
    };

    var _getBeginClosed = function() {
        // console.log('_getBeginClosed');
        var children = list.childNodes;
        var len = children.length;
        var pos = _cache.pos;
        var begin = _cache.begin, i;
        var i;
        var r = -1;
        if (_cache.pIndexOf(begin, children) > pos) { // 第begin个元素过pos
            r = 0;
            for (i = begin - 1; i >= 0; i--) {
                if(_cache.rIndex[i] === true) continue;
                if (_cache.pIndexOf(i, children) <= pos) { // 第i个元素刚好没过pos
                    r = i;
                    break;
                }
            }
            _cache.pUnsafeAll();
            return r;
        }
        r = len - 1;
        for (i = begin + 1; i < len; i++) {
            if(_cache.rIndex[i] === true) continue;
            if (_cache.pIndexOf(i, children) > pos) { // 第i个元素刚好过pos
                r = i - 1;
                break;
            }
        }
        _cache.pUnsafeAll();
        return r;
    }

    var updateByForce = function() {
        // console.log('updateByForce');
        var children = _list.childNodes;
        var len = children.length;
        var begin = _getBeginClosed();
        rshow(begin, begin - _conf.liveRangeOffset, len, children, true, true);
        show(begin, begin + _conf.liveRange - 1, len, children, true, true);
        _cache.begin = begin;
    };

    var updateOnElementAdd = function(olen, nlen) {
        // console.log('updateOnElementAdd');
        var children = _list.childNodes;
        if(!olen) {
            olen = _cache.listLen;
        }
        if(!nlen) {
            nlen = children.length;
        }

        var ifShow = _cache.vIndex[olen - 1];
        if(olen < nlen) {
            _cache.listLen = nlen;
            var h = _cache.pIndexOf(olen - 1, children) + _cache.hIndexOf(olen - 1, children);
            var curH;
            for(var i = olen; i < nlen; i++) {
                if(_cache.rIndex[i] === true) continue;
                children[i].setAttribute('data-key', i);
                curH = children[i].offsetHeight;
                // if(_conf.mode === 0) {
                    _cache.pIndex[i] = h;
                    _cache.hIndex[i] = curH;
                // }
                h += curH;
                _cache.vIndex[i] = ifShow;
                if(_conf.displayNeeded) _cache.dIndex[i] = _getStyle(children[i], 'display');
                if(!ifShow) {
                    children[i].style.display = 'none';
                    _cache.subHeight += curH;
                }
            }
            _cache.pUnsafeAll();
            if(!ifShow) _list.style.paddingBottom = _cache.subHeight + 'px';
        }
    };

    var _checkListLen = function(olen, nlen) {
        // console.log('_checkListLen');
        if(olen !== nlen) updateOnElementAdd(olen, nlen);
    };

    var updateOnTouchEnd = function (pos) {
        // console.log('updateOnTouchEnd');
        if(_cache.touchStartLock) {
            window.setTimeout(function() {
                updateOnTouchEnd(pos);
            }, 100);
            return;
        }

        _cache.touchEndLock = true;

        var children = _list.childNodes;
        var len = children.length;

        _checkListLen(_cache.listLen, len);

        var begin = 0;
        var i = 0, j = 0;

        if (pos < 0) pos = -pos;
        if (pos === _cache.pos) {
            _cache.touchEndLock = false;
            return;
        }
        if (pos < _cache.pos) {
            _cache.dir = 0; // 向下移动
        } else {
            _cache.dir = 1; // 向上移动
        }
        _cache.pos = pos;

        begin = _getBeginOfScrollEnd(pos, len, children);

        // console.log('                    to begin: ' + begin);

        var to;
        if(_cache.dir === 0) { // 向下移动
            to = begin - _conf.liveRangeOffset;
            rshow(_cache.begin, to, len, children, true);
            // console.log('upto: ' + to);
        } else { // 向上移动
            to = begin + _conf.liveRange - 1;
            show(_cache.begin, to, len, children, true);
            // console.log('downto: ' + to);
        }

        _cache.begin = begin;

        _cache.touchEndLock = false;
    };

    var updateOnTouchStart = function(pos) {
        //TODO
    };

    var show = function(begin, end, len, children, ifCheck, forceUpdate) { // go down
        // console.log('show');
        if(begin < 0) begin = 0;
        if(end > len - 1) end = len - 1;

        var displayNeeded = _conf.displayNeeded;
        _cache.pIndexOf(end, children);
        for (var j = begin; j <= end; j++) {
            if(_cache.rIndex[j] === true) continue;
            if(_cache.vIndex[j]) continue;
            _cache.vIndex[j] = true;
            children[j].style.display = displayNeeded ? _cache.dIndex[j] : 'block';
            _cache.subHeight -= _cache.hIndexOf(j, children);
        }
        _cache.pUnsafeAll();

        if(ifCheck) {
            _cache.pIndexOf(len - 1, children);
            for (var j = end + 1; j < len; j++) {
                if(_cache.rIndex[j] === true) continue;
                if(!_cache.vIndex[j]) {
                    if(forceUpdate) continue;
                    break;
                }
                var hj = _cache.hIndexOf(j, children);
                children[j].style.display = 'none';
                _cache.vIndex[j] = false;
                _cache.subHeight += hj;
            }
            _cache.pUnsafeAll();
        }

        _list.style.paddingBottom = (_cache.subHeight < 0 ? 0 : _cache.subHeight) + 'px';
    };

    var rshow = function(begin, end, len, children, ifCheck, forceUpdate) { // go up
        // console.log('rshow');
        if(end < 0) end = 0;
        if(begin > len - 1) begin = len - 1;

        var displayNeeded = _conf.displayNeeded;
        _cache.pIndexOf(begin, children);
        for (var j = begin; j >= end; j--) {
            if(_cache.rIndex[j] === true) continue;
            if(_cache.vIndex[j]) continue;
            _cache.vIndex[j] = true;
            children[j].style.display = displayNeeded ? _cache.dIndex[j] : 'block';
            _cache.preHeight -= _cache.hIndexOf(j, children);
        }
        _cache.pUnsafeAll();

        if(ifCheck) {
            _cache.pIndexOf(end - 1, children);
            for (var j = end - 1; j >= 0; j--) {
                if(_cache.rIndex[j] === true) continue;
                if(!_cache.vIndex[j]) {
                    if(forceUpdate) continue;
                    break;
                }
                var hj = _cache.hIndexOf(j, children);
                children[j].style.display = 'none';
                _cache.vIndex[j] = false;
                _cache.preHeight += hj;
            }
            _cache.pUnsafeAll();
        }

        _list.style.paddingTop = (_cache.preHeight < 0 ? 0 : _cache.preHeight) + 'px';
    };

    var updateElement = function (el) {
        // console.log('updateElement');
        // if(_conf.mode === 0) {
            var idx = parseInt(el.getAttribute('data-key'));
            var newH = el.offsetHeight;
            var d = newH - _cache.hIndex[i];
            for(var i = idx, len = _cache.hIndex.length; i < len; i++) {
                if(_cache.rIndex[i] === true) continue;
                _cache.hIndex[i] += d;
                _cache.pIndex[i] += d;
            }
        // }

        updateByForce();
    };

    return {
        onScrollInit: init,
        onScrollStart: function(el, data) {
            updateOnTouchStart(-data.position);
        },
        onScrollEnd: function(el, data) {
            updateOnTouchEnd(-data.endPosition);
        },
        onElementUpdate: function(el) {
            updateElement(el);
        },
        onElementRemove: function(el) {
            var index = parseInt(el.getAttribute('data-key'));
            _cache.rIndex[index] = true;
            // console.log('removing ' + index);
        },
        onElementAdd: function(el) {
            updateOnElementAdd();
        }
    }
});
