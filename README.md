## 一、简答题
### 1、当我们点击按钮的时候动态给 data 增加的成员是否是响应式数据，如果不是的话，如果把新增成员设置成响应式数据，它的内部原理是什么。
```javascript
let vm = new Vue({
 el: '#el',
 data: {
  o: 'object',
  dog: {}
 },
 method: {
  clickHandler () {
   // 该 name 属性是否是响应式的
   this.dog.name = 'Trump'
  }
 }
})
```
* 不是，data 属性时在创建 Vue 实例的时候转为响应式数据的。在 Vue 实例化后再给 data 新增属性，仅仅只是新增一个普通的js属性，而不是响应式数据。
* Vue 实例化后不允许动态添加根级别的响应式property，可以使用 `Vue.set(vm.someObjet, 'b', 2)`，也可以使用 `vm.$set`，这也是全局 Vue.set 方法的别名 `this.$set(this.someObject,'b',2)`
* Vue.set()实现原理：调用 `defineReactive(ob.value, key, val)` 函数进行依赖收集，调用 `ob.dep.notify()` 更新视图

### 2、请简述 Diff 算法的执行过程
* Diff 算法是对比新旧节点的子节点，同级别节点依次比较，算法时间复杂度为O(n)
* 在进行同级别节点比较的时候，首先会对新旧节点数组的开始和结束节点设置标记索引，遍历过程中移动索引
* 在对开始和结束节点比较的时候，总共有四种情况：
    * oldStartVnode / newStartVnode(旧开始节点 / 新开始节点)
    * oldEndVnode / newEndVnode(旧结束节点 / 新结束节点)
    * oldStartVnode / newEndVnode(旧开始节点 / 新结束节点)
    * oldEndVnode / newStartVnode(旧结束节点 / 新开始节点)
循环遍历新旧节点
* 首先判断 oldStartVnode 和 newStartVnode 是否是 sameVnode(sel 和 key 是否相同)
    * patchVnode 比较 oldStartVnode 和 newStartVnode，更新节点
    * 标记索引往后移(++oldStartIdx、++newStartIdx)
* 否则判断 oldEndVnode 和 newEndVnode 是否是 sameVnode(sel 和 key 是否相同)
    * patchVnode 比较 oldEndVnode 和 newEndVnode，更新节点
    * 标记索引往前移(--oldEndIdx、--newEndIdx)
* 否则判断 oldStartVnode 和 newEndVnode 是否是 sameVnode(sel 和 key 是否相同)
    * patchVnode 比较 oldStartVnode 和 newEndVnode，更新节点
    * 把 oldStartVnode 移动到右边
    * 标记索引移动(++oldStartIdx、--newEndIdx)
* 否则判断 oldEndVnode 和 newStartVnode 是否是 sameVnode(sel 和 key 是否相同)
    * patchVnode 比价 oldEndVnode 和 newStartVnode，更新节点
    * 把 oldEndVnode 移动到左边
    * 标记索引移动(--oldEndIdx、++newStartIdx)
* 如果不是以上四种情况
    * 遍历新节点，使用 newStartVnode 的 key 在老节点数组中找相同节点
    * 如果没有找到，说明 newStartVnode 是新节点
        * 创建新节点对应的 DOM 元素，插入到 DOM 树中
    * 如果找到了
        * 判断新节点和找到的老节点的 sel 选择器是否相同
        * 如果不相同，说明节点被修改了
            * 重新创建对应的 DOM 元素，插入到 DOM 树中
        * 如果相同，把 elmToMove 对应的 DOM 元素，移动到左边
* 循环结束
    * 当老节点的所有子节点先遍历完(oldStartIdx > oldEndIdx)，循环结束
    * 新节点的所有子节点先遍历完(newStartIdx > newEndIdx)，循环结束
    
    如果老节点的数组先遍历完(oldStartIdx > oldEndIdx)，说明新节点有剩余，把剩余节点批量插入到右边
    
    如果新节点的数组先遍历完(newStartIdx > newEndIdx)，说明老节点有剩余，把剩余节点批量删除

## 二、编程题
### 1、模拟 VueRouter 的 hash 模式的实现，实现思路和 History 模式类似，把 URL 中的 # 后面的内容作为路由的地址，可以通过 hashchange 事件监听路由地址的变化。
代码地址：https://github.com/YuYun95/lagou_part3_module1/tree/master/code/hash-router
* 思路
    * Hash 模式是基于锚点，通过锚点值作为路由地址；以及 onhashchange 事件，地址发生变化时触发onhashchange
    * Hash 模式路由与 history 模式路由类似
    * 不同点在于 router-link 组件内的 a 标签 href 地址前添加 '/#'；`href: '/#' + this.to`
    * a 标签不需要添加事件阻止默认行为和记录历史，因为锚点并不会触发 a 标签的默认行为，而且会自动修改 url
    * hash值发生变化的时候会触发 onhashchange 事件，监听该事件，把保存路由的响应式数据修改为对应地址，渲染对应的组件； `window.addEventListener('hashchange
    ', () => { this.data.current = window.location.hash.substr(1) })`
    
* src/vuerouter/index.js
```javascript
let _Vue = null

export default class VueRouter {
  static install(Vue) {
    // 1、判断当前插件是否已经被安装
    if (VueRouter.install.installed) {
      return
    }
    VueRouter.install.installed = true
    //  2、把Vue构造函数记录到全局变量
    _Vue = Vue
    //  3、把创建Vue实例时候传入的router对象注入到Vue实例上
    // 使用混入，注意this指向，在外面this指向VueRouter，使用混入this指向Vue
    _Vue.mixin({
      beforeCreate() {
        if (this.$options.router) {// vue实例执行；组件不执行，组件的$options不存在router属性
          _Vue.prototype.$router = this.$options.router // 把入口文件中new Vue()是传入的router挂载到$router
          this.$options.router.init() // 入口实例化Vue的时候传入了实例化的VueRouter，此时router挂载到vue的$options属性上
        }
      }
    })
  }

  constructor(options) {
    this.options = options // 记录构造函数传入的选项
    this.routeMap = {} // 把路由规则解析存储到routeMap，键：路由地址，值：路由组件，将来router-view组件会根据当前路由地址到routeMap对象找到对应的组件渲染到浏览器
    // data是一个响应式对象，存储当前的路由地址，路由变化时自动加载组件
    this.data = _Vue.observable({ // vue提供的创建响应式对象方法
      current: window.location.hash.substr(1) || '/' // 存储当前的路由地址，默认是‘/’
    })
  }

  init() {
    this.createRouteMap()
    this.initComponents(_Vue)
    this.initEvent()
  }

  createRouteMap() {
    // 遍历所有路由规则，把路由规则解析为键值对形式，存储到routeMap对象
    this.options.routes.forEach(route => {
      this.routeMap[route.path] = route.component
    })
  }

  initComponents(Vue) { // 传入Vue构造函数是为了减少对外部的依赖
    Vue.component('router-link', {
      props: {
        to: String
      },
      render(h) {
        // h 函数为我们创建虚拟DOM
        // 参数一：选择器；参数二：DOM元素设置属性；参数三：标签之间的内容，内容有很多所以用数组
        return h('a', {
          attrs: {
            href: '/#' + this.to
          },
        }, [this.$slots.default]) // 通过this.$slots.default获取默认插槽的内容
      },
    })
    const self = this
    Vue.component('router-view', {
      render(h) {
        // render 函数里的this不是指向Vue实例
        // 获取当前路由地址对应的路由组件，调用 h 函数把组件转为虚拟DOM返回
        // 获取当前路由对应的组件，data是响应式的，当当前地址改变后将更新对应的页面
        const component = self.routeMap[self.data.current]
        return h(component)
      }
    })
  }

  initEvent() {
    // 浏览器前进 后退
    window.addEventListener('hashchange', () => {
      this.data.current = window.location.hash.substr(1)
    })
  }
}

```
### 2、在模拟 Vue.js 响应式源码的基础上实现 v-html 指令，以及 v-on 指令。
代码地址：https://github.com/YuYun95/lagou_part3_module1/tree/master/code/04-minivue
* v-html 指令
    * 原理：v-html 实现和 v-text 基本一样，不同在于 v-html 把变量赋值到 innerHTML
    * compiler.js 核心代码
```javascript
htmlUpdater(node, value, key) {
  console.log(node, value, key)
  node.innerHTML = value
  new Watcher(this.vm, key, (newValue) => {
    node.innerHTML = newValue
  })
}
```

* v-on 指令
    * 在 vue.js 文件中变量 methods，把事件注入到 vue 实例
    * 在 compiler.js 文件判断指令处添加'@'的判断，在 update 函数判断attrName是否含有 'on:'，如果有就把后面的事件行为提取拼接为对应的函数名调用

* vue.js  省略部分代码
```javascript

class Vue {
  constructor(options) {
    this.$methods = options.methods || {}
    this._injectionMethods(this.$methods)
  }

  // 代理数据
  // .....

  // 把methods注入vue实例
  _injectionMethods(methods) {
    Object.keys(methods).forEach(fnName => {
      this[fnName] = this.$methods[fnName]
    })
  }
}
```

* compiler.js  省略部分代码
```javascript
class Compiler {
  
  // 根据指令拼接函数(不需要if语句)，调用对于的指令处理函数
  update(node, key, attrName) {
    if (attrName.startsWith('on:')) {
      attrName = attrName.replace('on:', '')
    }

    let updateFn = this[attrName + 'Updater']
    updateFn && updateFn.call(this, node, this.vm[key], key)
  }

  // v-on
  clickUpdater(node, value, key) {
    node.onclick = value
  }

  // v-html
  htmlUpdater(node, value, key) {
    node.innerHTML = value
    new Watcher(this.vm, key, (newValue) => {
      node.innerHTML = newValue
    })
  }

  // 判断元素属性是否是指令
  isDirective(attrName) {
    return attrName.startsWith('v-') || attrName.startsWith('@')
  }
}

```

* index.html
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>mini vue</title>
  </head>
  <body>
    <div id="app">
      <h1>v-html</h1>
      <div v-html="html"></div>
      <h1>v-on</h1>
      <div @:click="clickHandler">点击触发</div>
      <div v-on:mouseover="mouseOver">鼠标进入触发</div>
    </div>

    <script src="./js/dep.js"></script>
    <script src="./js/watcher.js"></script>
    <script src="./js/compiler.js"></script>
    <script src="./js/observer.js"></script>
    <script src="./js/vue.js"></script>
    <script>
    let vm = new Vue({
      el: '#app',
      data: {
        html: '<p style="color: skyblue">这是一个p标签</p>',
      },
      methods: {
        clickHandler() {
          console.log('点击事件')
          alert('点击了')
        },
        mouseOver(){
          alert('鼠标进入')
          console.log('mouseOver')
        }
      }
    })
    </script>
  </body>
</html>

```
### 3、参考 Snabbdom 提供的电影列表的示例，实现类似的效果
代码地址：https://github.com/YuYun95/lagou_part3_module1/tree/master/code/snabbdom
* 实现原理
  * 导入 init 函数注册模块返回一个 patch，导入 h 函数创建 vnode
  * 导入 className 切换类样式、eventlisteners 注册事件、style行内样式、props 设置DOM元素的属性
  * 当初始的 HTML 文档被完全加载和解析完成之后，使用 h 函数生成 vnode，然后 patch 到 id 为 container 的 div 上生成页面结构
  * 排序按钮通过 eventlisteners 的 on 属性调用排序函数，点击按钮调用排序函数，然后重新渲染页面；class 判断当前的是以什么排序，对应的按钮显示为激活状态；style 设置整个列表的高度
  * 在定义列表的行结构时，使用 props 模块设置 DOM 的 key 属性；通过 style 模块添加delayed(进场样式)和remove(退场样式)以及 opacity 和 transform
  * hook属性中设置了insert属性，也就是在节点插入到dom中后，触发该回调，设置节点的高度
  * 每一行的最后一列添加删除的图标，使用 eventlisteners 的 on 属性调用删除函数，点击删除按钮删除该行，然后重新渲染页面
  * 添加按钮的回调函数就是随机生成一个数据对象，但是其rank属性是全局递增的。然后对新数据调用h函数生成新的vnode，并且patch到页面上，重新渲染了页面
  * 注意：删除当删除剩余一条数据的时候会报错 `Uncaught TypeError: Cannot read property 'offset' of undefined` 是因为当删除仅剩的一条数据是 render 函数中的 `data[data.length - 1]` 为 undefined，需要对该处代码做判断做对应的处理，此处已改为判断为 undefined 时 将不获取数据 offset 而是赋值为0
  
```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link href="./src/index.css">
</head>

<body>
    <div id="container"></div>
    <script src="./src/index.js"></script>
</body>

</html>
```

```javascript
import { init, h } from 'snabbdom'
import className from 'snabbdom/modules/class'
import eventlisteners from 'snabbdom/modules/eventlisteners'
import style from 'snabbdom/modules/style'
import props from 'snabbdom/modules/props'

let patch = init([className, eventlisteners, style, props])

var vnode

var nextKey = 11
var margin = 8
var sortBy = 'rank'
var totalHeight = 0
var originalData = [
    { rank: 1, title: 'The Shawshank Redemption', desc: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.', elmHeight: 0 },
    { rank: 2, title: 'The Godfather', desc: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.', elmHeight: 0 },
    { rank: 3, title: 'The Godfather: Part II', desc: 'The early life and career of Vito Corleone in 1920s New York is portrayed while his son, Michael, expands and tightens his grip on his crime syndicate stretching from Lake Tahoe, Nevada to pre-revolution 1958 Cuba.', elmHeight: 0 },
    { rank: 4, title: 'The Dark Knight', desc: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, the caped crusader must come to terms with one of the greatest psychological tests of his ability to fight injustice.', elmHeight: 0 },
    { rank: 5, title: 'Pulp Fiction', desc: 'The lives of two mob hit men, a boxer, a gangster\'s wife, and a pair of diner bandits intertwine in four tales of violence and redemption.', elmHeight: 0 },
    { rank: 6, title: 'Schindler\'s List', desc: 'In Poland during World War II, Oskar Schindler gradually becomes concerned for his Jewish workforce after witnessing their persecution by the Nazis.', elmHeight: 0 },
    { rank: 7, title: '12 Angry Men', desc: 'A dissenting juror in a murder trial slowly manages to convince the others that the case is not as obviously clear as it seemed in court.', elmHeight: 0 },
    { rank: 8, title: 'The Good, the Bad and the Ugly', desc: 'A bounty hunting scam joins two men in an uneasy alliance against a third in a race to find a fortune in gold buried in a remote cemetery.', elmHeight: 0 },
    { rank: 9, title: 'The Lord of the Rings: The Return of the King', desc: 'Gandalf and Aragorn lead the World of Men against Sauron\'s army to draw his gaze from Frodo and Sam as they approach Mount Doom with the One Ring.', elmHeight: 0 },
    { rank: 10, title: 'Fight Club', desc: 'An insomniac office worker looking for a way to change his life crosses paths with a devil-may-care soap maker and they form an underground fight club that evolves into something much, much more...', elmHeight: 0 },
]
var data = [
    originalData[0],
    originalData[1],
    originalData[2],
    originalData[3],
    originalData[4],
    originalData[5],
    originalData[6],
    originalData[7],
    originalData[8],
    originalData[9],
]

// 根据prop排序
function changeSort(prop) {
    sortBy = prop
    data.sort((a, b) => {
        if (a[prop] > b[prop]) {
            return 1
        }
        if (a[prop] < b[prop]) {
            return -1
        }
    })
    render()
}

// 添加一条数据
function add() {
    // 随机获取 originalData 中的一条数据
    var n = originalData[Math.floor(Math.random() * 10)]

    // 添加数据
    data = [{ rank: nextKey++, title: n.title, desc: n.desc, elmHeight: 0 }].concat(data)
    render()
    render()
}


// 根据传递的movie移除对应的数据
function remove(movie) {
    data = data.filter((m) => {
        return m !== movie
    })
    render()
}

// 定义列表行
function movieView(movie) {
    return h('div.row', {// 定义行
        key: movie.rank,
        style: { // 行内样式
            opacity: '0',
            transform: 'translate(-200px)',
            // 进场样式
            delayed: { transform: `translateY(${movie.offset}px)`, opacity: '1' },
            // 退场样式
            remove: { opacity: '0', transform: `translateY(${movie.offset}px) translateX(200px)` }
        },
        hook: { insert: (vnode) => { movie.elmHeight = vnode.elm.offsetHeight } },
    }, [// 定义列表列
        h('div', { style: { fontWeight: 'bold' } }, movie.rank),
        h('div', movie.title),
        h('div', movie.desc),
        h('div.btn.rm-btn', { on: { click: [remove, movie] } }, 'x'),
    ])
}

// 调用patch对比新旧vnode渲染
function render() {
    data = data.reduce((acc, m) => {
        var last = acc[acc.length - 1]
        m.offset = last ? last.offset + last.elmHeight + margin : margin
        return acc.concat(m)
    }, [])
console.log(data[data.length - 1]);

    // 处理删除所以内容报错的问题
    totalHeight = data[data.length - 1] ? data[data.length - 1].offset + data[data.length - 1].elmHeight : 0
    vnode = patch(vnode, view(data))
}


// layout
function view(data) {
    return h('div', [
        h('h1', 'Top 10 movies'),
        h('div', [
            h('a.btn.add', { on: { click: add } }, 'Add'),
            'Sort by: ',
            h('span.btn-group', [
                h('a.btn.rank', { class: { active: sortBy === 'rank' }, on: { click: [changeSort, 'rank'] } }, 'Rank'),
                h('a.btn.title', { class: { active: sortBy === 'title' }, on: { click: [changeSort, 'title'] } }, 'Title'),
                h('a.btn.desc', { class: { active: sortBy === 'desc' }, on: { click: [changeSort, 'desc'] } }, 'Description'),
            ]),
        ]),
        h('div.list', { style: { height: totalHeight + 'px' } }, data.map(movieView)),
    ])
}

window.addEventListener('DOMContentLoaded', () => {
    var container = document.getElementById('container')
    vnode = patch(container, view(data))
    render()
})

```
