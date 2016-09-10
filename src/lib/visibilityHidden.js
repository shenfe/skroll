define(function () {
    var _list = null,
        _conf = {
            liveRangeOffset: 20,
            liveRange: 40
        },
        _cache = {
            begin: 0, // 刚好没过(<=)pos的元素索引，从0到len-1
            pos: 0,
            dir: 0, // 0: down, 1: up
            hIndex: [], // height
            pIndex: [], // position
            vIndex: [] // visibility
        };

    var _initIndex = function () {
        var children = _list.childNodes;
        var len = children.length;
        var h = 0;
        for (var i = 0; i < len; i++) {
            _cache.pIndex[i] = h;
            _cache.hIndex[i] = children[i].offsetHeight;
            h += _cache.hIndex[i];
            _cache.vIndex[i] = true;
        }
    };

    var init = function (list, conf) {
        var children = list.childNodes;
        if (!children || !children.length) {
            return;
        }

        _conf.liveRangeOffset = conf.offset || _conf.liveRangeOffset;
        _conf.liveRange = conf.range || _conf.liveRange;

        _list = list;

        _initIndex();

        // 隐藏首尾
        var tempBegin = 0 - _conf.liveRangeOffset,
            tempEnd = 0 + _conf.liveRange,
            len = children.length;
        for(var i = tempBegin - 1; i >= 0; i--) {
            children[i].style.visibility = 'hidden';
            _cache.vIndex[i] = false;
        }

        for(var i = tempEnd; i < len; i++) {
            children[i].style.visibility = 'hidden';
            _cache.vIndex[i] = false;
        }
    };

    var _getBegin = function(pos, len) {
        var begin = 0, i;
        if (_cache.dir == 0) { // 向下移动
            for (i = _cache.begin; i >= 0; i--) {
                if (_cache.pIndex[i] <= pos) { // 第i个元素刚好没过pos
                    begin = i;
                    break;
                }
            }
        } else { // 向上移动
            for (i = _cache.begin; i < len; i++) {
                if (_cache.pIndex[i] > pos) { // 第i个元素刚好超过pos
                    break;
                }
            }
            begin = i - 1;
        }
        if(begin < 0) begin = 0;
        return begin;
    };

    var update = function (pos) {
        // console.log({
        //     p: pos
        // });
        var children = _list.childNodes;
        var len = children.length;
        var begin = 0;
        var i = 0, j = 0;

        if (pos < 0) pos = -pos;
        if (pos == _cache.pos) return;
        if (pos < _cache.pos) {
            _cache.dir = 0; // 向下移动
        } else {
            _cache.dir = 1; // 向上移动
        }
        _cache.pos = pos;

        begin = _getBegin(pos, len);

        // toggle一些元素 {
        var tempBegin, tempEnd;
        if (_cache.dir == 0) { // 向下移动
            tempBegin = _cache.begin - _conf.liveRangeOffset - 1;
            tempEnd = begin - _conf.liveRangeOffset;
            if(tempBegin > len - 1) tempBegin = len - 1;
            if(tempEnd < 0) tempEnd = 0;
            for (i = tempBegin; i >= tempEnd; i--) {
                children[i].style.visibility = 'visible';
                _cache.vIndex[i] = true;
            }

            tempBegin = begin + _conf.liveRange;
            tempEnd = _cache.begin + _conf.liveRange;
            if(tempBegin < 0) tempBegin = 0;
            if(tempEnd > len) tempEnd = len;
            for (j = tempBegin; j < tempEnd; j++) {
                children[j].style.visibility = 'hidden';
                _cache.vIndex[j] = false;
            }
        } else { // 向上移动
            tempBegin = _cache.begin + _conf.liveRange;
            tempEnd = begin + _conf.liveRange;
            if(tempBegin < 1) tempBegin = 1;
            if(tempEnd > len - 1) tempEnd = len - 1;
            for (j = tempBegin; j < tempEnd; j++) {
                children[j].style.visibility = 'visible';
                _cache.vIndex[j] = true;
            }

            tempBegin = _cache.begin - _conf.liveRangeOffset;
            tempEnd = begin - _conf.liveRangeOffset;
            if(tempBegin < 0) tempBegin = 0;
            if(tempEnd > len) tempEnd = len;
            for (i = tempBegin; i < tempEnd; i++) {
                children[i].style.visibility = 'hidden';
                _cache.vIndex[i] = false;
            }
        }
        // }

        _cache.begin = begin;

        // console.log({
        //     h: _list.offsetHeight,
        //     begin: begin
        // });
    };

    return {
        init: init,
        update: update
    }
});
