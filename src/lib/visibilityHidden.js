define(function () {
    var _list = null,
        _conf = {
            hideAsInit: true,
            mode: 1, // 1: active, to get element pos in time; 0: passive, to keep element pos and wait for changes to come.
            itemHeightFixed: false, // if each item is of the same height and won't change.
            _itemHeight: 0,
            _liveRangeOffset: 0,
            get liveRangeOffset() {
                if(this._liveRangeOffset !== 0) return this._liveRangeOffset;
                this._liveRangeOffset = Math.ceil(this.screenMaxHeight / _cache.minHeight) * this.liveRatio;
                return this._liveRangeOffset;
            },
            set liveRangeOffset(ro) {
                this._liveRangeOffset = ro;
            },
            _liveRange: 0,
            get liveRange() {
                if(this._liveRange !== 0) return this._liveRange;
                this._liveRange = Math.ceil(this.screenMaxHeight / _cache.minHeight) * (1 + this.liveRatio);
                return this._liveRange;
            },
            set liveRange(r) {
                this._liveRange = r;
            },
            liveRatio: 1,
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
            hIndexOf: function(i, children, cache) {
                if(_conf.itemHeightFixed) {
                    if(_conf._itemHeight === 0) {
                        _conf._itemHeight = children[i].offsetHeight;
                    }
                    this.hIndex[i] = _conf._itemHeight;
                    return _conf._itemHeight;
                }
                if(cache === true) return this.hIndex[i];
                if(_conf.mode === 0) return this.hIndex[i];
                if(i < this.pSafeTo) return this.hIndex[i];
                if(this.vIndex[i] === false) return this.hIndex[i];
                var r = children[i].offsetHeight;
                this.hIndex[i] = r;
                return r;
            },
            pIndex: [], // position
            pIndexOf: function(i, len, children, dir, cache) { //TODO: RECONSIDER
                if(_conf.itemHeightFixed) {
                    var confItemHeight = _conf._itemHeight;
                    if(confItemHeight === 0) {
                        confItemHeight = _conf._itemHeight = children[i].offsetHeight;
                    }
                    confItemHeight *= (i - 1);
                    this.pIndex[i] = confItemHeight;
                    return confItemHeight;
                }
                if(cache === true) return this.pIndex[i];
                if(_conf.mode === 0) return this.pIndex[i];
                if(i === 0) return 0;
                var r;
                if(i <= this.pSafeTo) {
                    r = this.pIndex[i];
                } else {
                    if(dir === 0) { // i++, go down
                        r = this.pIndexOf(i - 1, len, children, dir) + this.hIndexOf(i - 1, children);
                        this.pSafeTo = i;
                    } else if(dir === 1) { // i--, go up
                        if(i === len) {
                            r = _list.offsetHeight;
                        } else {
                            r = this.pIndexOf(i + 1, len, children, dir) - this.hIndexOf(i, children);
                        }
                        if(this.pIndex[i] === r) {
                            this.pSafeTo = i;
                        }
                    } else if(dir === -1) { // get by offsetTop
                        r = children[i].offsetTop;
                        if(this.pIndex[i] === r) {
                            this.pSafeTo = i;
                        }
                    } else {
                        return this.pIndex[i];
                    }
                    this.pIndex[i] = r;
                }
                // console.log({
                //     i: i,
                //     p: r
                // });
                return r;
            },
            pUnsafeAll: function() { // 使用过hIndexOf、pIndexOf后，需要及时将pSafeTo重置
                this.pSafeTo = 0;
            },
            pSafeTo: 0,
            vIndex: [], // visible
            rIndex: [], // removal
            minHeight: 1000000 // minimum height of a child node
        };

    window._conf = _conf;
    window._cache = _cache;

    var childNodes = function() {
        return _list.children;
    };

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

    var _initIndex = function (len, children) {
        var h = 0;
        var curH, minH = 1000000, min = 12;
        for (var i = 0; i < len; i++) {
            children[i].setAttribute('data-key', i);
            // if(_conf.mode === 0) {
                curH = _conf.itemHeightFixed ? _cache.hIndexOf(i, children) : children[i].offsetHeight;//_cache.hIndexOf(i, children);
                if(curH < minH && curH > min) {
                    minH = curH;
                }
                _cache.pIndex[i] = h;
                // console.log('pIndex[' + i + ']: ' + h);
                _cache.hIndex[i] = curH;
                h += curH;
            // }

            _cache.vIndex[i] = true;
        }
        _cache.showBegin = 0;
        _cache.showEnd = len - 1;
        _cache.minHeight = (minH === 1000000 ? min : minH);
        // console.log('minItemHeight: ' + _cache.minHeight);
    };

    var init = function (list, conf) {
        // console.log(conf);
        _conf.itemHeightFixed = conf.itemHeightFixed || _conf.itemHeightFixed;
        var children = list.children;
        if (!children || !children.length) {
            return;
        }

        _list = list;

        var len = children.length;

        _initIndex(len, children);

        if(_conf.hideAsInit) { // 隐藏首尾
            var tempBegin = 0 - _conf.liveRangeOffset,
                tempEnd = 0 + _conf.liveRange - 1;
            if(tempBegin < 0) tempBegin = 0;
            if(tempEnd >= len) tempEnd = len - 1;
            var i;
            for(i = tempBegin - 1; i >= 0; i--) {
                children[i].style.visibility = 'hidden';
                _cache.vIndex[i] = false;
            }

            for(i = tempEnd + 1; i < len; i++) {
                children[i].style.visibility = 'hidden';
                _cache.vIndex[i] = false;
            }

            _cache.showBegin = tempBegin;
            _cache.showEnd = tempEnd;
        }

        _cache.listLen = len;
    };

    var _getBeginOfScrollEnd = function(pos, len, children) {
        // console.log('_getBeginOfScrollEnd');
        var begin = -1, i;

        _cache.pIndexOf(_cache.begin, len, children, -1);

        if (_cache.dir === 0) { // 向下移动
            var pi;
            for (i = _cache.begin; i >= 0; i--) {
                if(_cache.rIndex[i] === true) continue;
                pi = _cache.pIndexOf(i, len, children, 1);
                if (pi <= pos) { // 第i个元素刚好没过pos
                    begin = i;
                    break;
                }
            }
            if(begin < 0) begin = 0;
        } else { // 向上移动
            var pi;
            for (i = _cache.begin; i < len; i++) {
                if(_cache.rIndex[i] === true) continue;
                pi = _cache.pIndexOf(i, len, children, 0);
                _cache.pSafeTo = i;
                if (pi > pos) { // 第i个元素刚好超过pos
                    begin = i - 1;
                    break;
                }
            }
            if(begin < 0) begin = len - 1;
        }
        // console.log('                                  to: ' + begin);
        return begin;
    };

    var _getBeginOfTouchStart = function(pos, len, children) {
        // console.log('_getBeginOfTouchStart');
        var begin = _cache.begin, i;

        _cache.pIndexOf(_cache.begin, len, children, -1);

        if (_cache.dir === 0) { // 向下移动
            for (i = _cache.begin; i < len; i++) {
                if(_cache.rIndex[i] === true) continue;
                if (_cache.pIndexOf(i, len, children, 0) <= pos) { // 第i个元素刚好没过pos
                    begin = i;
                } else break;
                _cache.pSafeTo = i;
            }
        } else { // 向上移动
            for (i = _cache.begin; i >= 0; i--) {
                if(_cache.rIndex[i] === true) continue;
                if (_cache.pIndexOf(i, len, children, 1) > pos) { // 第i个元素刚好超过pos
                    continue;
                } else {
                    begin = i;
                    break;
                }
            }
        }
        return begin;
    };

    var _getBeginClosed = function() {
        // console.log('_getBeginClosed');
        var children = childNodes();
        var len = children.length;
        var pos = _cache.pos;
        var begin = _cache.begin, i;
        var i;
        var r = -1;
        if (_cache.pIndexOf(begin, len, children) > pos) { // 第begin个元素过pos
            r = 0;
            for (i = begin - 1; i >= 0; i--) {
                if(_cache.rIndex[i] === true) continue;
                if (_cache.pIndexOf(i, len, children, 1) <= pos) { // 第i个元素刚好没过pos
                    r = i;
                    break;
                }
            }
        } else {
            r = len - 1;
            for (i = begin + 1; i < len; i++) {
                if(_cache.rIndex[i] === true) continue;
                if (_cache.pIndexOf(i, len, children, 0) > pos) { // 第i个元素刚好过pos
                    r = i - 1;
                    break;
                }
                _cache.pSafeTo = i;
            }
        }
        return r;
    }

    var updateByForce = function(notAll, onlyDown) {
        // console.log('updateByForce');
        var children = childNodes();
        var len = children.length;
        var begin = _getBeginClosed();
        if (onlyDown === true) rshow(begin, begin - _conf.liveRangeOffset, len, children, true, !notAll);
        show(begin, begin + _conf.liveRange - 1, len, children, true, !notAll);
        _cache.begin = begin;
        _cache.pUnsafeAll();
    };

    var updateOnElementAdd = function(olen, nlen) {
        // console.log('updateOnElementAdd');
        var children = childNodes();
        if(!olen) {
            olen = _cache.listLen;
        }
        if(!nlen) {
            nlen = children.length;
        }

        var ifShow = _cache.vIndex[olen - 1];
        if(olen < nlen) {
            _cache.listLen = nlen;
            var h = _cache.pIndexOf(olen - 1, olen, children, 0) + _cache.hIndexOf(olen - 1, children);
            _cache.pSafeTo = olen - 1;
            var curH;
            for(var i = olen; i < nlen; i++) {
                if(_cache.rIndex[i] === true) continue;
                children[i].setAttribute('data-key', i);
                curH = _conf.itemHeightFixed ? _cache.hIndexOf(i, children) : children[i].offsetHeight;//_cache.hIndexOf(i, children);
                // if(_conf.mode === 0) {
                    _cache.pIndex[i] = h;
                    _cache.hIndex[i] = curH;
                // }
                h += curH;
                _cache.vIndex[i] = ifShow;
                if(!ifShow) {
                    children[i].style.visibility = 'hidden';
                }
            }
            _cache.pUnsafeAll();
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

        var children = childNodes();
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
            rshow(_cache.begin, to, len, children, true); //TODO: 一直单方向移动会造成显示的元素过多
            // show();
            // console.log('upto: ' + to);
        } else { // 向上移动
            to = begin + _conf.liveRange - 1;
            show(_cache.begin, to, len, children, true);
            // rshow();
            // console.log('downto: ' + to);
        }

        _cache.begin = begin;

        _cache.touchEndLock = false;

        _cache.pUnsafeAll();
    };

    var updateOnTouchStart = function(pos) {
        //TODO
    };

    var show = function(begin, end, len, children, ifCheck, forceUpdate) { // go down
        // console.log('show: ');
        if(begin < 0) begin = 0;
        if(end > len - 1) end = len - 1;
        // console.log({
        //     begin: begin,
        //     end: end
        // });

        for (var j = begin; j <= end; j++) {
            if(_cache.rIndex[j] === true) continue;
            if(_cache.vIndex[j]) continue;
            _cache.vIndex[j] = true;
            children[j].style.visibility = 'visible';
        }

        _cache.showEnd = end;
        // console.log('showEnd ' + end);

        if(ifCheck) {
            for (var j = end + 1; j < len; j++) {
                if(_cache.rIndex[j] === true) continue;
                if(!_cache.vIndex[j]) {
                    if(forceUpdate) continue;
                    break;
                }
                children[j].style.visibility = 'hidden';
                _cache.vIndex[j] = false;
            }
        }
    };

    var rshow = function(begin, end, len, children, ifCheck, forceUpdate) { // go up
        // console.log('rshow');
        if(end < 0) end = 0;
        if(begin > len - 1) begin = len - 1;
        // console.log({
        //     rbegin: begin,
        //     rend: end
        // });

        for (var j = begin; j >= end; j--) {
            if(_cache.rIndex[j] === true) continue;
            if(_cache.vIndex[j]) continue;
            _cache.vIndex[j] = true;
            children[j].style.visibility = 'visible';
        }

        _cache.showBegin = end;
        // console.log('showBegin ' + end);

        if(ifCheck) {
            for (var j = end - 1; j >= 0; j--) {
                if(_cache.rIndex[j] === true) continue;
                if(!_cache.vIndex[j]) {
                    if(forceUpdate) continue;
                    break;
                }
                children[j].style.visibility = 'hidden';
                _cache.vIndex[j] = false;
            }
        }
    };

    var getTouchedElement = function(touchY, offset) {
        // console.log('getTouchedElement');
        var begin = _getBeginClosed();
        var len = _cache.listLen;
        // console.log('current begin: ' + begin);
        // _cache.pUnsafeAll();
        var bh = _cache.pIndexOf(begin, len, childNodes());
        var r = 0;
        offset += touchY;
        // console.log('offset: ' + offset);
        // console.log(_cache.pIndex);
        if(bh < offset) {
            var i;
            for(i = begin + 1; i < len; i++) {
                if(_cache.pIndexOf(i, len, childNodes(), 0) > offset) {
                    r = i - 1;
                    break;
                }
            }
            if(i === len) r = len - 1;
        } else if(bh === offset) {
            r = begin;
        } else {
            for(var i = begin - 1; i >= 0; i--) {
                if(_cache.pIndexOf(i, len, childNodes(), 1) <= offset) {
                    r = i;
                    break;
                }
            }
        }
        // console.log('current touch: ' + r);
        return childNodes()[r];
    };

    var updateElement = function (el, offset, notAllChecked, onlyDown) {
        // console.log('updateElement');
        if(_conf.mode === 0 || _conf.itemHeightFixed) return;

        if(typeof el === 'number') {
            // console.log('startY: ' + el);
            // console.log('offset: ' + offset);
            el = getTouchedElement(el, offset);
        }

        var idx = parseInt(el.getAttribute('data-key'));
        var newH = el.offsetHeight;
        var d = newH - _cache.hIndex[idx];
        if(d !== 0) {
            for(var i = idx, len = _cache.hIndex.length; i < len; i++) {
                if(_cache.rIndex[i] === true) continue;
                _cache.hIndex[i] += d;
                _cache.pIndex[i] += d;
            }

            updateByForce(!!notAllChecked, onlyDown);
        }
    };

    return {
        onInit: init,
        onScrollStart: function(el, data) {
            updateElement(data.touchY, -data.position, false, false);
            // updateOnTouchStart(-data.position);
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
