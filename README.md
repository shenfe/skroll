## lib-scroll

手动实现适用于移动端的滚动。

## 使用方式

在需要滚动的元素ready后，即可调用Scroll实现滚动。

```js
// <div style="position:relative;overflow:hidden;">
//     <div id="target" style="position:relative;"></div>
// </div>
new Scroll(document.getElementById('target'), {
    acceleration: 2000,     // deceleration of the sliding target in fact
    maxSpeed: 4000,         // maximum speed of the target
    itemHeightFixed: false, // false (default): no matter what children are like; true: optimized if the target's each child is of a fixed height
    scrollBarMode: 1        // 0: hidden; 1 (default): auto; 1: visible
});
```

## 兼容性

适用于移动端。

## 测试

### 自动隐藏与否对比

| 方式 | 查看链接 |
| :---: | :---: |
| 自动隐藏 | `scroll.js.html?size=1000&content=1` |
| 不隐藏 | `scroll.js.html?size=1000&content=1&hide=false` |

### 不同滚动对比

| 方式 | 查看链接 |
| :---: | :---: |
| 高度固定自动隐藏模拟滚动 | `scroll.js.html?size=10000&content=0&height=true` |
| 高度固定不隐藏模拟滚动 | `scroll.js.html?size=10000&content=0&height=true&hide=false` |
| iscroll | `scroll.js.iscroll.html?size=10000&content=0&method=iscroll` |
| 原生 | `scroll.js.native.html?size=10000&content=0&method=native` |
