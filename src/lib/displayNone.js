define(function () {
    var _list = null,
        _conf = {
            mode: 'passive', // active: 主动监听子元素高度变化, passive: 由调用者通知改变
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
            liveRatio: 4,
            displayNeeded: true,
            ifRequestAnimationFrame: false,
            screenMaxHeight: window.screen.height * 2
        },
        _cache = {
            begin: 1, // 刚好没过(<=)pos的元素索引，从1到len-2
            pos: 0,
            dir: 0, // 0: down, 1: up
            hIndex: [], // height
            pIndex: [], // position
            vIndex: [], // visible
            dIndex: [], // display
            preHeight: 0,
            subHeight: 0,
            minHeight: 1000000 // minimum height of a child node
        },
        _preBlank = null,
        _subBlank = null;

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
        var blankStyle = 'width:100%;height:0;padding:0;border:0;margin:0;';
        _preBlank = document.createElement('div');
        _preBlank.setAttribute('style', blankStyle);
        _list.insertBefore(_preBlank, _list.childNodes[0]);
        _subBlank = document.createElement('div');
        _subBlank.setAttribute('style', blankStyle);
        _list.appendChild(_subBlank);
        _cache.preHeight = 0;
        _cache.subHeight = 0;
    };

    var _initIndex = function () {
        var children = _list.childNodes;
        var len = children.length;
        var h = 0;
        var curH, minH = 1000000;
        for (var i = 1; i < len; i++) {
            _cache.pIndex[i] = h;
            curH = _cache.hIndex[i] = children[i].offsetHeight;
            if(curH < minH && curH > 12) {
                minH = curH;
            }
            h += curH;
            _cache.vIndex[i] = true;
            if (_conf.displayNeeded) _cache.dIndex[i] = _getStyle(children[i], 'display');
        }
        _cache.minHeight = minH;
    };

    var init = function (list) {
        var children = list.childNodes;
        if (!children || !children.length) {
            return;
        }

        _list = list;

        _initBlank();

        _initIndex();

        // 隐藏首尾
        var tempBegin = 1 - _conf.liveRangeOffset,
            tempEnd = 1 + _conf.liveRange,
            len = children.length;
        for(var i = tempBegin - 1; i >= 1; i--) {
            children[i].style.display = 'none';
            _cache.vIndex[i] = false;
        }
        _preBlank.style.height = _cache.pIndex[tempBegin < 1 ? 1 : tempBegin] + 'px';

        for(var i = tempEnd; i < len - 1; i++) {
            children[i].style.display = 'none';
            _cache.vIndex[i] = false;
            _cache.subHeight += _cache.hIndex[i];
        }
        _subBlank.style.height = _cache.subHeight + 'px';
    };

    var _getBeginOfScrollEnd = function(pos, len) {
        var begin = 1, i;
        if (_cache.dir == 0) { // 向下移动
            for (i = _cache.begin; i >= 1; i--) {
                if (_cache.pIndex[i] <= pos) { // 第i个元素刚好没过pos
                    begin = i;
                    break;
                }
            }
        } else { // 向上移动
            for (i = _cache.begin; i < len; i++) {
                if (_cache.pIndex[i] > pos) { // 第i个元素刚好超过pos
                    begin = i - 1;
                    break;
                }
            }
        }
        if(begin < 1) begin = 1;
        return begin;
    };

    var _getBeginOfTouchStart = function(pos, len) {
        var begin = _cache.begin, i;
        if (_cache.dir == 0) { // 向下移动
            for (i = _cache.begin; i < len - 1; i++) {
                if (_cache.pIndex[i] <= pos) { // 第i个元素刚好没过pos
                    begin = i;
                } else break;
            }
        } else { // 向上移动
            for (i = _cache.begin; i >= 1; i--) {
                if (_cache.pIndex[i] > pos) { // 第i个元素刚好超过pos
                    continue;
                } else {
                    begin = i;
                    break;
                }
            }
        }
        return begin;
    };

    var updateOnTouchEnd = function (pos) {
        var children = _list.childNodes;
        var len = children.length;
        var begin = 1;
        var i = 0, j = 0;

        if (pos < 0) pos = -pos;
        if (pos == _cache.pos) return;
        if (pos < _cache.pos) {
            _cache.dir = 0; // 向下移动
        } else {
            _cache.dir = 1; // 向上移动
        }
        _cache.pos = pos;

        begin = _getBeginOfScrollEnd(pos, len);

        if(_cache.dir == 0) {

            // console.log({
            //     touch: 'end',
            //     dir: _cache.dir,
            //     from: _cache.begin,
            //     upTo: begin
            // });

            rdisplay(_cache.begin, Math.min(begin, _cache.begin - _conf.liveRangeOffset), len, children, true);
        } else {

            // console.log({
            //     touch: 'end',
            //     dir: _cache.dir,
            //     from: _cache.begin,
            //     downTo: begin
            // });

            display(_cache.begin, Math.max(begin, _cache.begin + _conf.liveRange - 1), len, children, true);
        }
        _cache.begin = begin;
        return;
    };

    var updateOnTouchStart = function(pos) {
        var children = _list.childNodes;
        var len = children.length;
        if (pos < 0) pos = -pos;
        var begin = _getBeginOfTouchStart(pos, len);

        // console.log({
        //     touch: 'start',
        //     begin: begin,
        //     upTo: begin - _conf.liveRangeOffset,
        //     downTo: begin + _conf.liveRange - 1
        // });

        display(begin, begin + _conf.liveRange - 1, len, children, true);
        rdisplay(begin, begin - _conf.liveRangeOffset, len, children, true);
    };

    var display = function(begin, end, len, children, ifCheck) { // go down
        if(begin < 1) begin = 1;
        if(end > len - 2) end = len - 2;
        for (var j = begin; j <= end; j++) {
            if(_cache.vIndex[j]) continue;
            children[j].style.display = _conf.displayNeeded ? _cache.dIndex[j] : 'block';
            _cache.vIndex[j] = true;
            _cache.subHeight -= _cache.hIndex[j];
        }

        if(ifCheck) {
            for (var j = end + 1; j < len - 1; j++) {
                if(!_cache.vIndex[j]) break;
                children[j].style.display = 'none';
                _cache.vIndex[j] = false;
                _cache.subHeight += _cache.hIndex[j];
            }
        }

        _subBlank.style.height = _cache.subHeight + 'px';
    };

    var rdisplay = function(begin, end, len, children, ifCheck) { // go up
        if(end < 1) end = 1;
        if(begin > len - 2) begin = len - 2;
        for (var j = begin; j >= end; j--) {
            if(_cache.vIndex[j]) continue;
            children[j].style.display = _conf.displayNeeded ? _cache.dIndex[j] : 'block';
            _cache.vIndex[j] = true;
        }

        if(ifCheck) {
            for (var j = end - 1; j >= 1; j--) {
                if(!_cache.vIndex[j]) break;
                children[j].style.display = 'none';
                _cache.vIndex[j] = false;
            }
        }

        _preBlank.style.height = _cache.pIndex[end] + 'px';
    };

    // index starts from 1
    var updateHeightOf = function (index, newHeight) {
        if(!newHeight) var newHeight = _list.childNodes[index].offsetHeight;
        var diff = newHeight - _cache.hIndex[index];
        _cache.hIndex[index] = newHeight;
        for (var i = index, len = _cache.pIndex; i < len; i++) {
            _cache.pIndex[i] += diff;
        }
    };

    return {
        onScrollInit: init,
        onScrollStart: function(el, data) {
            updateOnTouchStart(-data.position);
        },
        onScrollEnd: function(el, data) {
            updateOnTouchEnd(-data.endPosition);
        },
        reflow: updateHeightOf
    }
});
