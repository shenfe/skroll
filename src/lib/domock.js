define(['domini'], function (domini) {
    var cssSet = {
        'display': '|block|inline-block|flex|none',
        'position': '|relative|absolute|fixed',
        'top': '|0px',
        'right': '|0px',
        'bottom': '|0px',
        'left': '|0px',
        'float': '|right|left',
        'margin': '|0px',
        'border': '|0px',
        'padding': '|0px',
        'width': '|0px',
        'min-width': '|0px',
        'max-width': '|0px',
        'height': '|0px',
        'min-height': '|0px',
        'max-height': '|0px',
        'text-align': '|left|center|right',
        'white-space': '|nowrap',
        'word-wrap': '|break-word',
        'font-size': '|12px',
        'color': '|#000',
        'background': '|#000',
        'overflow': '|auto|visible|hidden',
        'opacity': '|0.5',
        'visibility': '|visible|hidden',
        'z-index': '|1'
    };
    var tagSet = {
        '#text': {
            inline: true
        },
        'DIV': {
            inline: false
        },
        'IMG': {
            inline: true
        },
        'A': {
            inline: true
        },
        'SPAN': {
            inline: true
        },
        'P': {
            inline: false
        }
    };
    var imgDef = [
        'http://sun-dog.cn/uploadfile/2014/0210/20140210085932667.jpg',
        'http://img4.duitang.com/uploads/blog/201309/14/20130914171430_CanSx.jpeg',
        'http://sun-dog.cn/uploadfile/2014/0210/20140210085955421.jpg',
        'http://wanzao2.b0.upaiyun.com/system/pictures/29286846/original/14e297ed0f9a7e63.gif',
        'http://easyread.ph.126.net/yJ1NxkXvP_p84Iqj3S8x7w==/7916733309127921062.jpg'
    ];
    var txtDef = [
        '6342526358946592645576768965703956792657165685794567394686357416557298673094567273526458764592867927465764867395672734657',
        'ey fjsd jgf  jfgshsdhg jsgj sd jhsgdjfhgsf yet ut   iuk hdgfjasg.',
        '苹果今天终于发布了 iPhone 7 发布会邀请函，确定9月7日，周三在旧金山比尔·格雷厄姆市政礼堂举行媒体发布会。苹果这次的发布会主题为“See you on the 7th”，7号见，相信大家都能看出来，这里的7号可能是双关语，有 iPhone 7 的意思。',
        '沈建国'
    ];
    var nodeLevelDef = [function () {
        return {
            tag: 'DIV',
            class: 'test-div'
        };
    }, function () {
        return {
            tag: 'DIV',
            style: {
                'background-color': '#eee'
            }
        };
    }, function () {
        return {
            tag: 'DIV',
            style: 'word-wrap: break-word;'
        };
    }, function () {
        return [{
            tag: 'IMG',
            style: {
                'max-width': '100%'
            },
            attr: {
                src: imgDef[Math.floor(Math.random() * imgDef.length)]
            }
        }, {
            tag: '#text',
            value: txtDef[Math.floor(Math.random() * txtDef.length)]
        }];
    }];
    var depth = 0;

    // 返回预定义的第d层的模板节点
    var ranode = function (d) {
        var n = nodeLevelDef[d]();
        if (n instanceof Array) {
            n = n[Math.floor(Math.random() * n.length)];
        }
        return n;
    };

    // 返回指定规模的随机节点数组，按预定义模板生成
    var random = function (levels) {
        if (levels.length == 0) return [];
        var r = [];
        for (var i = 0, len = levels[0]; i < len; i++) {
            var n = ranode(depth - levels.length);
            if (!tagSet[n.tag].inline) {
                n.children = random(levels.slice(1));
            }
            r.push(n);
        }
        return r;
    };

    return function (container, levels) {
        if (!(levels instanceof Array)) return null;
        depth = levels.length;
        var doms = random(levels);
        for (var i = 0, len = doms.length; i < len; i++) {
            container.appendChild(domini.domify(doms[i]));
        }
    };
});
