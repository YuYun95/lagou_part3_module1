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
* 对比新旧节点的key和sel是否相同，如果不是相同节点，删除之前的内容，重新渲染
* 如果是相同节点，判断vnode的text是否有值，比较不同，如果不同更新文本
* Diff 算法是对新旧节点的同级进行比较

## 二、编程题
### 1、模拟 VueRouter 的 hash 模式的实现，实现思路和 History 模式类似，把 URL 中的 # 后面的内容作为路由的地址，可以通过 hashchange 事件监听路由地址的变化。
代码：[]()
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
