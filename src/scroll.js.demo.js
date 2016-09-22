var getUrlParameter = function (name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(window.location.search) || [, ""])[1].replace(/\+/g, '%20')) || null;
};
var getUrlHash = function () {
    var url = window.location.href;
    if (url.indexOf('#') < 0) return '';
    return url.substring(url.indexOf('#') + 1);
};

requirejs.config({
    paths: {
        scroll: './lib/scroll',
        hide: './lib/' + (!getUrlHash() ? 'displayNone' : 'visibilityHidden'),
        renode: './lib/renode',
        domini: './lib/domini',
        domock: './lib/domock'
    }
});

requirejs(['scroll', 'hide', 'domini', 'domock'], function(Scroll, Hide, Domini, Domock) {
    var test_listLength = parseInt(getUrlParameter('size') || '1000', 10);
    var test_targetDom = document.getElementById('div1');
    var test_method = getUrlParameter('method'),
        test_requestAnimationFrame = getUrlParameter('raf'),
        test_content = getUrlParameter('content');
    var test_generateContent1 = function(div, levels) {
        for (var i = 0; i < levels[0]; i++) {
            var child = document.createElement('div');
            child.className = 'test-div';
            child.innerHTML = i;
            div.appendChild(child);
        }
    };
    var test_generateContent2 = function(div, levels) {
        Domock(div, levels);
    };

    if(test_content == 1)
        test_generateContent1(test_targetDom, [test_listLength]);
    else
        test_generateContent2(test_targetDom, [test_listLength, 4, 2, 2]);

    if(test_method === 'native') {
        document.title = '原生滚动';
    } else if(test_method === 'iscroll') {
        document.title = 'iscroll滚动';

        // function loaded() {
            window.scrollPanel = new IScroll(test_targetDom.parentNode, {
                scrollbars: true,
                bounce: false
            });
            console.log('iscroll');
        // }
        // window.onload = loaded;
    } else {
        document.title = '模拟滚动';

        window.scrollPanel = new Scroll(test_targetDom, {
            acceleration: 3000,
            maxSpeed: 6000,
            raf: !!test_requestAnimationFrame,
            scrollBarMode: 1,
            hMode: 0,
            plugins: [Hide]
        });
    }

    if(test_requestAnimationFrame) {
        document.title += '-raf';
    }
});
