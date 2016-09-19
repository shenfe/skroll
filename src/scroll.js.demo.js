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
    var test_native = getUrlParameter('native'),
        test_choice = getUrlParameter('hide'),
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

    if(test_native) {
        document.title = '原生滚动';
    } else {
        if(!test_choice) {
            document.title = '模拟滚动';
        } else if(!getUrlHash()) {
            document.title = '模拟滚动-display:none';
        } else {
            document.title = '模拟滚动-visibility:hidden';
        }
    }
    if(test_requestAnimationFrame) {
        document.title += '-raf';
    }

    if(test_content == 1)
        test_generateContent1(test_targetDom, [test_listLength]);
    else
        test_generateContent2(test_targetDom, [test_listLength, 2, 1, 1]);

    if(test_native) return;

    window.scrollPanel = new Scroll(test_targetDom, {
        acceleration: 5000,
        raf: !!test_requestAnimationFrame,
        scrollBarMode: 1,
        plugins: test_choice ? [Hide] : []
    });
});
