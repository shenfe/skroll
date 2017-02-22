# Scroll.js

手动实现适用于移动端的滚动。

# Test

## 模拟滚动不同隐藏方式间对比

| 方式 | 查看链接 |
| :---: | :---: |
| display none | `scroll.js.html?size=1000&content=1` |
| visibility hidden | `scroll.js.html?size=1000&content=1#1` |
| 无 | `scroll.js.html?size=1000&content=1&hide=false` |

## 不同滚动对比

| 方式 | 查看链接 |
| :---: | :---: |
| 高度固定自动隐藏模拟滚动 | `scroll.js.html?size=10000&content=0&height=true` |
| 高度固定不隐藏模拟滚动 | `scroll.js.html?size=10000&content=0&height=true&hide=false` |
| iscroll | `scroll.js.iscroll.html?size=10000&content=0&method=iscroll` |
| 原生 | `scroll.js.native.html?size=10000&content=0&method=native` |
