## 一、Vue-Router 原理实现

### Hash 模式和 History 模式的区别
* 表现形式的区别
    * Hash 模式域名后面带有'#'，# 后面的是路由地址，可以通过问号携带参数
    * History 模式就是正常的url地址，需要服务端配置支持
* 原理区别
    * Hash
        * Hash 模式是基于锚点，通过锚点值作为路由地址；以及 onhashchange 事件，地址发生变化是触发onhashchange
        * Hash 模式，调用push方法会先判断当前浏览器是否支持window.pushState，如果支持调用pushState改变地址栏，否则的话通过 window.location 改变地址
    * History
        * 模式是基于 HTML5 中的History API
        * history.pushState()，路径会发生变化，向服务器发送请求，IE10以后才支持
        * history.replaceState() 不会向服务器发送请求，只会改变浏览器地址，并且把地址记录在历史记录
        * history 模式下调用router.push(url) 方法的时候，push 方法内部会调用 window.pushState，把 url 设置到浏览器的地址栏
        * 当历史状态被激活的时候才会触发 popstate 事件

### History 模式
* history 模式需要服务器的支持
* 单页应用中，服务器不存在http://www.xxx.com/login 这样的地址会返回找不到改页面（单页应用只有一个index.html，不存在login页面）
* 在服务端应该除了静态资源外都返回单页引用的index.html

### VueRouter 实现原理
* Hash 模式
    * URL中 # 后面的内容作为路径地址
    * 监听 hashchange 事件
    * 根据当前路由地址找到对应组件重新渲染
* History 模式
    * 通过 history.pushState() 方法改变地址栏
    * 监听 popstate 事件，把访问地址记录在历史，并不会真正跳转路径，也就是浏览器不会发送请求；可以监听到浏览器操作历史的变化，在这个事件处理函数中，可以记录改变后的地址
    * 根据当前路由地址找到对应组件重新渲染

### VueRouter 模拟实现-分析
* Vue.use 方法可以接收一个函数，如果是函数会直接调用这个函数；可以传入对象，传入对象，会调用这个对象的install方法
* 创建一个VueRouter实例， VueRouter 是一个构造函数或者是一个类，这个类有一个静态的install方法
* VueRouter构造函数接收一个对象形式的参数，对象是一些路由规则
* 创建 Vue 实例，传入刚刚定义好的 router 对象

![](img/router.jpg)

* VueRouter：类名
* options：VueRouter实例传入的路由规则对象
* routeMap：记录路由地址和组件的对应关系，以后把路由规则解析到routeMap
* data：是一个对象，有个current属性，用来记录当前路由地址。设置data是因为需要一个响应式的数据（data是响应式），路由发送变化，对应的组件要更新
* install：是类的静态方法，实现 vue 的插件机制
* constructor：初始化属性，初始化方法
* init：调用后面的方法
* initEvent：注册popstate事件，监听浏览器历史的变化
* createRouteMap：初始化 routeMap 属性，把构造函数中出入的路由规则转换为键值对形式存储到routeMap，routeMap 就是一个对象，键是路由地址，值是对应的组件；在 router-view 组件中会使用 routeMap
* initComponents：创建 router-link 和 router-view 组件

```javascript
Vue.use(VueRouter)

const router = new VueRouter({
  routes: [
    { name: 'home', path: '/', component: homeComponent }
  ]
})

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
```

### VueRouter-install
* 判断当前插件是否已经被安装
* 把Vue构造函数记录到全局变量
* 把创建Vue实例时候传入的router对象注入到Vue实例上(入口文件中new Vue({})是传入的router)

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
        }
      }
    })
  }
}

```

### VueRouter-构造函数

![](img/router.jpg)

* 构造函数初始化options、routeMap、data
* options：记录构造函数传入的选项（new VueRouter({})中传入的路由规则）
* routeMap：把路由规则解析存储到routeMap，键：路由地址，值：路由组件，将来router-view组件会根据当前路由地址到routeMap对象找到对应的组件渲染到浏览器
* data是一个响应式对象，存储当前的路由地址，路由变化时自动加载组件
* observable：Vue提供的创建响应式对象方法
* current：存储当前的路由地址，判断浏览器地址是否为跟目录，如果是跟目录值为‘/’，如果不是跟目录就为目标地址（/about），如刷新浏览器的情况

```javascript
constructor(options) {
  this.options = options
  this.routeMap = {}
  this.data = _Vue.observable({
    current: window.location.pathname || '/'
  })
}
```

### VueRouter-createRouteMap
把构造函数中传过来的选项的route（路由规则）转为键值对存到routeMap对象

```javascript
createRouteMap() {
  // 遍历所有路由规则，把路由规则解析为键值对形式，存储到routeMap对象
  this.options.routes.forEach(route => {
    this.routeMap[route.path] = route.component
  })
}
```
### initComponents方法创建两个组件 router-link 和 router-view
### VueRouter-router-link
* 点击时阻止 a 标签默认行为（阻止跳转页面）
* 使用history.pushState 把浏览器地址改为 a 标签 href的值
* 把当前路径地址记录在data.current，data是响应式对象，当数据发生变化时会自动更新视图
* Vue的构建版本
    * 运行时版：不支持template模板，需要打包的时候提前编译
    * 完整版：包含运行时和编译器，体积比运行时版大10k左右，程序运行的时候把模板转换成render函数
    * 脚手架安装的vue项目时运行时版本，可通过配置[修改](https://cli.vuejs.org/zh/config/#runtimecompiler)
    * 使用render函数渲染组件

```javascript
initComponents(Vue) { // 传入Vue构造函数是为了减少对外部的依赖
  Vue.component('router-link', {
    props: {
      to: String
    },
    template: '<a :href="to"><slot></slot></a>'
  })
}
```
```javascript
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
          href: this.to
        },
        on: { // 注册点击事件
          click: this.clickHandler
        }
      }, [this.$slots.default]) // 通过this.$slots.default获取默认插槽的内容
    },
    methods: {
      clickHandler(e) {
        e.preventDefault() // 阻止默认行为

        // history.pushState 改变浏览器地址栏地址，不会向服务器发送请求
        // 参数一：data:触发popstate事件时传给popstate事件的事件对象参数；
        // 参数二：title 网页标题；
        // 参数三：地址
        // 改变浏览器地址栏，但不会加载对应的组件
        history.pushState({}, '', this.to)
        // 把当前路径记录在data.current，
        this.$router.data.current = this.to // this.$router.data.current：在install静态方法中已经把$router挂载到Vue上了
      }
    }
  })
}
```

### VueRouter-router-view

```javascript
initComponents(Vue) { // 传入Vue构造函数是为了减少对外部的依赖
  const self = this
  Vue.component('router-view', {
    render(h) {
      // render 函数里的this不是指向Vue实例
      // 获取当前路由地址对应的路由组件，调用 h 函数把组件转为虚拟DOM返回
      const component = self.routeMap[self.data.current] // 获取当前路由对应的组件
      return h(component)
    }
  })
}
```

### VueRouter-initEvent
* 点击浏览器前进、后退要更新界面
```javascript
initEvent() {
  // 浏览器前进 后退
  window.addEventListener('popstate', () => {
    this.data.current = window.location.pathname
  })
}
```

### 手写 Vue Router 完整代码
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
    // 存储当前的路由地址，判断浏览器地址是否为跟目录，如果是跟目录值为‘/’，如果不是跟目录就为目标地址（/about），如刷新浏览器的情况
      current: '/'
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
            href: this.to
          },
          on: { // 注册点击事件
            click: this.clickHandler
          }
        }, [this.$slots.default]) // 通过this.$slots.default获取默认插槽的内容
      },
      methods: {
        clickHandler(e) {
          e.preventDefault() // 阻止默认行为

          /**
           * history.pushState 改变浏览器地址栏地址，不会向服务器发送请求
           * 改变浏览器地址栏，但不会加载对应的组件
           * 参数一：data:触发popstate事件时传给popstate事件的事件对象参数；
           * 参数二：title 网页标题；
           * 参数三：地址
           */
          history.pushState({}, '', this.to)

          // 把当前路径记录在data.current，
          this.$router.data.current = this.to // this.$router.data.current：在install静态方法中已经把$router挂载到Vue上了
        }
      }
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
    window.addEventListener('popstate', () => {
      this.data.current = window.location.pathname
    })
  }
}

```
## 二、模拟 Vue.js 响应式原理

###  数据驱动
* 数据响应式、双向绑定、数据驱动
* 数据响应式
    * 数据模型仅仅是普通的 javascript 对象，而当我们修改数据时，视图会进行更新，避免繁琐的DOM操作，提高开发效率
* 双向绑定
    * 数据改变，视图改变；视图改变，数据也随之改变
    * 可以使用v-model 在表单元素上创建双向数据绑定
* 数据驱动是 Vue 最独特的特性之一
    * 开发过程中仅需要关注数据本身，不需要关心数据是如何渲染到视图

###  数据响应式核心原理-Vue2.x
* [Vue2.x深入响应式原理](https://cn.vuejs.org/v2/guide/reactivity.html)
* [MDN-Object.defineProperty](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)
* 浏览器兼容IE8以上（不兼容IE8）

```html
<div id="app">hello</div>
```

```javascript
// 模拟 Vue 中的 data 选项
let data = {
  msg: 'hello',
  count: 10
}

// 模拟 Vue 的实例
let vm = {}

// 数据劫持：当访问或者设置 vm 中的成员的时候，做一些干预操作
Object.defineProperty(vm, 'msg', {
  // 可枚举（可以遍历）
  enumerable: true,
  // 可配置（可以使用 delete 删除，可以通过 defineProperty 重新定义）
  configurable: true,
  // 当获取值的时候执行
  get () {
    console.log('get', data.msg)
    return data.msg
  },
  // 当设置值的时候执行
  set (newValue) {
    console.log('set', newValue)
    if (newValue === data.msg){
      return
    }
    data.msg = newValue
    // 数据更新，更新 DOM 的值
    document.querySelector('#app').textContent = data.msg
  }
})

vm.msg = 'Hello world'
console.log(vm.msg)
```

多个数据应该递归遍历数据，下面只实现遍历
```javascript
let data = {
  msg: 'hello',
  count: 10
}

let vm = {}

proxyData(data)

function proxyData(data) {
  // 遍历 data 对象中的所有属性
  Object.keys(data).forEach(key => {
    // 把 data 中的属性，转换成 vm 的 setter/getter
    Object.defineProperty(vm, key, {
      enumerable: true,
      configurable: true,
      get () {
        console.log('get', key, data[key])
        return data[key]
      },
      set (newValue) {
        console.log('set', kye, newValue)
        if (newValue === data[key]) {
          return
        }
        // 数据更新，更新 DOM
        document.querySelector('#app').textContent = data[key]
      }
    })
  })
}

vm.msg = 'Hello world'
console.log(vm.msg)
```

###  数据响应式核心原理-Vue3.x
* [MDN-Proxy](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
* 直接监听对象，而非属性
* ES6 中新增，IE不支持，性能由浏览器优化

```html
<div id="app">hello</div>
```

```javascript
// 模拟 vue 中的data
let data = {
  msg: 'hello',
  count: 10
}

// 模拟 vue 实例
let vm = new Proxy(data, {
  // 执行代理行为的函数
  //  当访问 vm 的成员会执行
  get(target, key) { // target：代理的对象；key：访问的属性；这两个参数是系统传递的
    console.log('get, key:', key, target[key])
    return target[key]
  },
  // 当设置 vm 的成员会执行
  set(target, key, newValue) {
    console.log('set, key:', key, newValue)
    if (target[key] === newValue) return
    target[key] = newValue
    document.querySelector('#app').textContent = target[key]
  }
})

vm.msg = 'Hello world'
console.log(vm.msg)
```

### 发布订阅模式
* 发布订阅模式
    * 订阅者
    * 发布者
    * 信号中心
>我们假定，存在一个“信号中心”，某个任务执行完，就向信号中心“发布”(publish)一个信号，其他任务可以向信号中心“订阅”(subscribe)这个信号，从而知道什么时候自己可以开始执行，这就叫做“发布/订阅模式”(publish-subscribe pattern)
* vue 的自定义事件
```javascript
let vm = new Vue()

vm.$on('dataChange', () =>{ console.log('dataChange') })

vm.$on('dataChange', () => { console.log('dataChange1') })

vm.$emit('dataChange')
```
* 自定义事件实现原理
    * 调用 $on 注册事件，调用 $emit 触发事件
    * 在 vm 内部定义变量存储注册的事件名称和事件处理函数
    * 注册事件可以注册多个事件名称，也可以给同一个事件注册多个事件处理函数
    * 所以存储的变量时一个键值对的形式，键是事件名，值是事件处理函数；{ 'click': [fn1, fn2], 'change': [fn1] }
    * $emint传递的是一个事件名称，通过名称去存储的变量找对应的事件处理函数一次执行

* 兄弟组件通信过程
```javascript
// eventBus.js
let eventHus = new Vue()

// componentA.vue
// 发布者
addToDo: function () {
  // 发布消息（事件）
  eventHub.$emit('add-todo', { text: this.newTodoText })
  this.newTodoText = ''
}

// componentB.vue
// 订阅者
create: function () {
  // 订阅消息（事件）
  eventHub.$on('add-todo', this.addTodo)
}

```
* 实现发布订阅模式
```javascript
// 事件触发器
class EventEmitter {
  constructor() {
    this.subs = Object.create(null) // 参数的作用是设置对象的原型，null 该对象没有原型属性
  }

  // 注册事件
  $on(eventType, handler) {
    this.subs[eventType] = this.subs[eventType] || []
    this.subs[eventType].push(handler)
  }

  // 触发事件
  $emit(eventType) {
    if (this.subs[eventType]) {
      this.subs[eventType].forEach(handler => {
        handler() // 调用事件处理函数
      })
    }
  }
}

let em = new EventEmitter()
em.$on('click', () => { console.log('click1') })
em.$on('click', () => { console.log('click2') })
em.$emit('click')
```

### 观察者模式
* 观察者（订阅者）- Watcher
    * update(): 当事件发生时，具体要做的事情
* 目标（发布者）- Dep
    * subs数组: 存储所有的观察者
    * addSun(): 添加观察者
    * notify(): 当事件发生，调用所有观察者的update()方法
* 没有事件中心
    
```javascript

// 发布者
class Dep {
  constructor() {
    // 记录所有的订阅者
    this.subs = []
  }

  // 添加订阅者
  addSun(sub) {
    if (sub && sub.update) {
      this.subs.push(sub)
    }
  }

  // 发布通知
  notify() {
    this.subs.forEach(sub => {
      sub.update()
    })
  }
}

// 订阅者-观察者
class Watcher {
  update() {
    console.log('update')
  }
}

let dep = new Dep()
let watcher = new Watcher()

dep.addSun(watcher)

dep.notify()
```
* 总结
    * 观察者模式是由具体目标调度，比如当事件触发，Dep 就会去调用观察者的方法，所以观察者模式的订阅者与发布者之间存在依赖的
    * 发布/订阅模式由统一调度中心调用，因此发布者和订阅者不需要知道对方的存在
    
![](./img/model.jpg)

###  模拟Vue响应式原理-分析
需要模拟的vue实例成员有如下5种类型

![](./img/responsive-principle.jpg)

* Vue
    * 把 data 中的成员注入到 vue 实例，并且把 data 中的成员转成getter/setter
* Observer
    * 能够对数据对象的的所有属性进行监听，如有变动可拿到最新值并通知Dep
* Compiler
    * 解析每个元素指令和插值表达式，并替换成相应的数据
* Dep(观察者模式中的目标)
    * 添加观察者，当数据发生变化，通知所有观察者
* Watcher(观察者模式中的观察者)
    * 内部有一个updater方法，负责更新视图

### 模拟Vue响应式原理-Vue
Vue
* 功能
    * 负责接收初始化的参数（选项）
    * 负责把 data 中的属性注入到 Vue 实例，转换为getter/setter
    * 负责调用 observer 监听 data 中所有属性的变化
    * 负责调用 compiler 解析指令/插值表达式
* 结构

![](./img/myVue.jpg)

* 实现思路
    * 通过属性保存选项数据
    * 把 data 中的成员转换为 getter 和 setter，注入到 Vue 实例中，方便后续使用
    * 调用 observer 对象，监听数据的变化
    * 调用 compiler 对象，解析指令和插值表达式
```javascript
class Vue {
  constructor(options) {
    // 1.通过属性保存选项数据
    this.$options = options || {}
    this.$data = options.data || {}
    this.$el = typeof options.el === 'string' ? document.querySelector(options.el) : options.el
    // 2.把 data 中的成员转换为 getter 和 setter，注入到 vue 实例中
    this._proxyData(this.$data)
  }

  // 代理数据
  _proxyData(data) {
    // 遍历 data 中的所有属性
    Object.keys(data).forEach(key => {
      // 把 data 中的属性注入到 Vue 实例中
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        get() {
          return data[key]
        },
        set(newValue) {
          if (newValue === data[key]) {
            return
          }
          data[key] = newValue
        }
      })
    })
  }
}

```
### 模拟Vue响应式原理-Observer(观察者)
* 功能
    * 负责把 data 选项中的属性转换成响应式数据
    * data 中的某个属性也是对象，把该属性转换成响应式数据
    * 数据变化发送通知，需要结合观察者模式
* 结构

![](./img/myObserver.jpg)

* 实现思路
    * walk 方法判断传入的 data 对象是否是对象；遍历 data 对象的所有属性，调用 defineReactive方法，转化为 getter 和 setter（响应式数据）
    * defineReactive 方法接收三个参数，第三个参数接收的是val，而不是在方法内部通过 data[key]获取值，为什么？
    * 因为访问实例属性时，首先触发 vue.js 里的 get 方法，这个 get 调用了 data[key]即 $data，因为这里调用了_proxyData方法并且把$data传入，这里会触发 observer 里的 get 方法，因为实例化了 Observer 类 并且把 $data 传入；如果在 observer 里直接使用 data[key]，则又触发了这个 get 方法，产生一个死递归，会发生堆栈溢出错误
    * 第三个参数是局部变量，方法执行完应该被释放，但是这里没有释放，原因是传入的 obj 是 data 对象($data)，而 $data 引用了 get 方法，即外部对 get 方法有引用，而 get 方法又用到了val 产生了闭包
    * 当 data 的属性是对象，把这个对象的属性转为响应式数据
    * 当 data 的属性从新赋值为对象的时候，该对象的属性转为响应式数据
    
```javascript
class Observer {
  constructor(data) {
    this.walk(data)
  }

  // 遍历对象的所有属性，判断传入的 data 对象是否是对象，加强代码健壮性
  walk(data) {
    // 1.判断 data 是否是对象
    if (!data || typeof data !== 'object') {
      return
    }
    // 2.遍历 data 对象的所有属性，调用 defineReactive方法，转化为 getter 和 setter（响应式数据）
    Object.keys(data).forEach(key => {
      this.defineReactive(data, key, data[key])
    })
  }

  // 把属性转为getter 和 setter
  // 第三个参数直接把值传入，而不是在内部通过data[key]获取值？
  // 因为访问实例属性时，首先触发 vue.js 里的 get 方法，这个 get 调用了 data[key]即 $data，因为这里调用了_proxyData方法并且把$data传入，
  // 这里会触发 observer 里的 get 方法，因为实例化了 Observer 类 并且把 $data 传入
  // 如果在 observer 里直接使用 data[key]，则又触发了这个 get 方法，产生一个死递归，会发生堆栈溢出错误
  // 使用了闭包，get 方法引用外部变量，所以当 defineReactive 执行完后 val 没有立即释放，所以可以获取值

  defineReactive(obj, key, val) {
    const that = this
    // 负责收集依赖，并发送通知
    let dep = new Dep()

    // 如果val是对象，把 val内部的属性转为响应式数据
    this.walk(val)
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get() {
        // 收集依赖
        Dep.target && dep.addSub(Dep.target)
        return val
      },
      set(newValue) {
        if (newValue === val) {
          return
        }
        val = newValue
        // 判断新值是否是对象类型，如果是就把属性转为响应式
        that.walk(newValue)
        // 发送通知
        dep.notify()
      }
    })
  }
}

```

### 模拟Vue响应式原理-Compiler
* 功能(操作DOM)
    * 负责编译模板，解析指令/插值表达式
    * 负责页面的首次渲染
    * 当数据变化后重新渲染视图
* 结构

![](./img/myCompiler.jpg)

* 实现思路
    * 遍历 DOM 元素，判断是文本节点还是元素节点
    * 判断node节点，是否有子节点递归调用compile
    * 如果是文本节点，处理插值表达式把变量名替换为对应的值重新赋值给文本节点(注意变量名前后可能有多个空格)
    * 如果是元素节点，获取元素的属性节点，可能有多个属性节点所以要遍历判断属性是否以 v- 开始
    * 根据元素属性(指令)调用对于的解析函数，把对应的值替换，建议函数名以指令名开始和统一的结束词组合，如：textUpdater、modelUpdater，在调用函数就可以使用指令名拼接结束词，而不需要使用if判断语句，后期指令多了也比较容易维护管理

```javascript
class Compiler {
  constructor(vm) {
    this.el = vm.$el // DOM 对象
    this.vm = vm // Vue实例
    this.compile(this.el) // 立即编译模版
  }

  // 编译模板，处理文本节点和元素节点
  compile(el) {
    let childNones = el.childNodes
    Array.from(childNones).forEach(node => {
      // 处理文本节点
      if (this.isTextNode(node)) {
        this.compileText(node)
      } else if (this.isElementNode(node)) {
        // 处理元素节点
        this.compileElement(node)
      }

      // 判断node节点，是否有子节点，如果仅有子节点，要递归调用compile
      if (node.childNodes && node.childNodes.length) {
        this.compile(node)
      }
    })
  }

  // 编译元素节点(获取元素的属性节点)，处理指令
  compileElement(node) {
    // console.log(node.attributes)
    // 遍历所有的属性节点
    Array.from(node.attributes).forEach(attr => {
      // 判断是否是指令
      let attrName = attr.name
      if (this.isDirective(attrName)) {
        // v-text --> text
        attrName = attrName.substring(2)
        let key = attr.value
        this.update(node, key, attrName)
      }
    })
  }

  // 根据指令拼接函数(不需要if语句)，调用对于的指令处理函数
  update(node, key, attrName) {
    let updateFn = this[attrName + 'Updater']
    updateFn && updateFn(node, this.vm[key])
  }

  // 处理 v-text 指令
  textUpdater(node, value) {
    node.textContent = value
  }

  // v-model
  modelUpdater(node, value) {
    node.value = value
  }

  // 编译文本节点，处理插值表达式
  compileText(node) {
    // {{   msg }}
    // 匹配插值表达式，获取插值表达式中的内容
    let reg = /\{\{(.+?)\}\}/
    let value = node.textContent

    // 如果文本节点是插值表达式，就替换内容
    if (reg.test(value)) {
      let key = RegExp.$1.trim() // 获取正则匹配的第一个分组
      node.textContent = value.replace(reg, this.vm[key])
    }
  }

  // 判断元素属性是否是指令
  isDirective(attrName) {
    return attrName.startsWith('v-')
  }

  // 判断节点是否是文本节点
  isTextNode(node) {
    return node.nodeType === 3
  }

  // 判断节点是否是元素节点
  isElementNode(node) {
    return node.nodeType === 1
  }
}

```

### 模拟Vue响应式原理-Dep(Dependency)
![](./img/myDep1.jpg)
* Vue 负责把 data 注入到 Vue 实例并且调用 observer 和 compiler
* observer 负责数据劫持即监听属性的变化，把 data 属性转换为 getter 和
 setter
* compiler 负责解析插表达式和指令
* dep 负责在 getter 方法中收集依赖
* 所有响应式的属性都会创建一个对应的 dep 对象，负责收集所有依赖于该属性的地方，所有依赖于该属性的位置都会插件一个watcher对象，所以dep就是收集依赖于该属性的watcher对象，setter方法会通知依赖，当属性发生变化的时候会调用属性的notify发送通知

* 功能
    * 收集依赖，添加观察者(watcher)
    * 通知所有观察者
* 结构

![](./img/myDep2.jpg)

```javascript
class Dep {
  constructor() {
    // 存储所有的观察者
    this.subs = []
  }

  // 添加观察者
  addSub(sub) {
    if (sub && sub.update){
      this.subs.push(sub)
    }
  }

  // 发送通知
  notify() {
    this.subs.forEach(sun => {
      sun.update()
    })
  }
}

```

### 模拟Vue响应式原理-watcher
![](./img/myWatcher1.jpg)
* 在 data 属性的 getter 方法中通过 Dep 对象收集依赖，在 data 属性的setter 方法通过 Dep 对象触发依赖，所以 data 每个属性都要创建一个对应的 Dep 对象，在收集依赖的时候，把依赖该属性的所有watcher(观察者对象)添加到 Dep 对象的 subs 数组中，在 data 的setter方法触发依赖(发送通知)，它会调用 Dep 对象的 notify 方法通知所有关联的 watcher 对象，watcher对象负责更新对应的视图
* 功能
    * 当数据变化触发依赖，dep 通知所有的watcher实例更新视图
    * 自身实例化的时候往 dep 对象中添加自己()
    
![](./img/myWatcher2.jpg)

```javascript
class Watcher {
  constructor(vm, key, cb) {
    this.vm = vm
    // data 中的属性名称
    this.key = key
    // 回调函数负责更新视图
    this.cb = cb

    // 把watcher对象记录到Dep类的静态属性target
    Dep.target = this
    // 触发get方法，在get方法中会调用addSub

    this.oldValue = vm[key]
    Dep.target = null
  }

  // 当数据发生变化的时候更新视图
  update() {
    let newValue = this.vm[this.key]
    if (this.oldValue === newValue) {
      return
    }
    this.cb(newValue)
  }
}

```
### 总结
* 问题
    * 给属性重新赋值成对象，是否是响应式的？在observer类中的set方法会调用walk方法判断值是否是对象，如果是对象就转换为响应式
    * 给 Vue 实例新增一个成员是否是响应式的？不是
* 整体流程

![](./img/vue.jpg)

## 三、Virtual DOM 的实现原理

### 什么是虚拟 DOM
* Virtual DOM(虚拟 DOM)，是由普通的 JS 对象来描述 DOM 对象，因为不是真实的 DOM 对象，所以叫 Virtual DOM
* 真实 DOM 成员，通过以下代码打印出 DOM 成员可以看到 DOM 成员非常多，所以操作 DOM 开销很大
```javascript
let element = document.querySelector('#app')
let s = ''
for (var key in element) {
  s += key + ','
}
console.log(s)
```
* 可以使用 Virtual DOM 来描述真实 DOM，示例
```javascript
{
  sel: 'div',
  data: {},
  children: undefined,
  text: 'Hello Virtual DOM',
  elm: undefined,
  key: undefined
}
```

###　为什么使用　Virtual DOM
* 手动操作 DOM 比较麻烦，还需要考虑浏览器兼容性问题，虽然有 jQuery 等库简化 DOM 操作，但是随着项目的复杂 DOM 操作复杂提升
* 为了简化 DOM 的复杂操作于是出现了各种 MVVM 框架，MVVM 框架解决了视图和状态的同步问题
* 为了简化视图的操作我们可以使用模板引擎，但是模板引擎没有解决跟踪状态变化的问题，于是 Virtual DOM 出现了
* Virtual DOM 的好处是当状态改变时不需要立即更新 DOM，只需要创建一个虚拟树来描述 DOM，Virtual DOM 内部将弄清楚如何有效(diff)的更新 DOM
* 参考 github [vitual-dom](https://github.com/Matt-Esch/virtual-dom) 的描述
    * 虚拟 DOM 可以维护程序的状态，跟踪上一次的状态
    * 通过比较前后两次状态的差异更新真实DOM

### 虚拟DOM的作用和虚拟DOM库
* 维护视图和状态的关系
* 负责视图情况下提升渲染性能
* 除了渲染 DOM 以为，还可以实现 SSR(Nuxt.js/Next.js)、原生应用(Weex/React Native)、小程序(mpvue/uni-app)等
![](./img/virtual.jpg)
* Virtual DOM 库
    * [Snabbdom](https://github.com/snabbdom/snabbdom)
        * [中文文档](https://github.com/coconilu/Blog/issues/152)
        * Vue2.x 内部使用的 Virtual DOM 就是改造的Snabbdom
        * 大约200 SLOC(single line of code)
        * 通过模块可扩展
        * 源码使用 TypeScript 开发
        * 最快的 Virtual DOM 之一
    * [virtual-dom](https://github.com/Matt-Esch/virtual-dom)

### Snabbdom
* Snabbdom的核心
    * 使用h()函数创建 javascript 对象(vnode)描述真实DOM
    * init()设置模块，创建patch()
    * pathch() 比较新旧两个vnode
    * 把变化的内容更新到真实DOM树上
* 安装 `yarn add snabbdom`
* 导入
    * Snabbdom的官网demo中导入使用的是commonjs模块语法，我们使用ES6的模块化语法 import
    * ES6模块于Commonjs模块的差异
      `import {init, h, thunk } from snabbdom`
    * Snabbdom 的核心仅提供最基本的功能，只导出了三个函数init()、h()、thunk()
        * init()是一个高阶函数，返回patch()
        * h()返回虚拟节点 VNode，这个函数我们在使用 Vue.js 的时候见过
        ```javascript
        new Vue({
          router,
          store,
          render:h => h(App)
        }).$mount('#app')
        ```
        * thunk()是一种优化策略，可以在处理不可变数据时使用
* 注意：导入的时候不能使用 `import snabbdom from 'snabbdom'`
    * 原因：node_modules/src/snabbdom.ts 末尾导出使用的语法是export导出API，没有使用 export default 导出默认输出
    ```javascript
    export {h} from './h'
    export {thrnk} from './thrnk'
    export function init(modules:Array<Partial<Module>>, domApi?:DOMAPI) {}
    ```
### 模块
* Snabbdom 的和兴库并不能处理元素的属性、样式、事件等，如果需要处理的话可以使用模块
* 常用模块：官方提供了6个模块
    * attributes
        * 设置 DOM元素的属性，使用 setAttribute()
        * 处理布尔类型的属性
    * props
        * 和 attributes 模块相似，设置 DOM 元素的属性 element[attr] = value
        * 不处理布尔类型的属性
    * class
        * 切换类样式
        * 注意：给元素设置类样式是通过 sel 选择器
    * dataset
        * 设置 data-* 的自定义属性
    * eventlisteners
        * 注册和移除事件
    * style
        * 设置行内样式，支持动画
        * delayed/remove/destroy
* 模块使用：
    * 导入需要的模块
    * init()中注册模块
    * 使用 h() 函数创建vnode的时候，可以把第二个参数设置为对象，其它参数往后移
    
```javascript
import {init, h} from 'snabbdom'
// 1. 导入模块
import style from 'snabbdom/modules/style'
import eventlisteners from 'snabbdom/modules/eventlisteners'
// 2. 注册模块
let path = init([style, eventlisteners])
// 3. 使用 h() 函数的第二个参数传入模块需要的数据(对象)
let vnode = h('div', {
  style: {
    backgroundColor: '#eee',
  },
  on: {
    click: evnetHandler
  }
}, [
  h('h1', 'Hello Snabbdom'),
  h('p', '这是p标签')
])

function evnetHandler() {
  console.log('点击我了')
}

let app = document.querySelector('#app')

path(app, vnode)

```

### patch的整体过程
* patch(oldVnode, newVnode)
* 打补丁，把新节点中变化的内容渲染到真实DOM，最后返回新节点作为下一次处理的旧节点
* 对比新旧VNode是否相同节点(节点的key和sel相同)
* 如果不是相同节点，删除之前的内容，重新渲染
* 如果是相同节点，再判断新的VNode是否有text，如果有并且和oldVnode的text不同，直接更新文本内容
* 如果新的VNode有children，判断子节点是否有变化，判断子节点的过程使用的就是diff算法
* diff过程只进行同层级比较

![](./img/diff.jpg)

### updateChildren整体分析
* 功能
    * diff 算法的核心，对比新旧节点的children，更新 DOM
* 执行过程：
    * 要对比两颗树的差异，可以取第一颗树的每一个节点依次和第二颗树的每一个节点比较，但是这样的时间复杂度为O(n^3)
    * 在 DOM 操作的时候很少很少会把一个父节点更新到某一个子节点
    * 因此只需要找同级别的子节点依次比较，然后再找下一级别的节点比较，这样算法的时间复杂度为O(n)
    ![](./img/diff.jpg)
    * 在进行同级别节点比较的时候，首先会对新老节点数组的开始和结尾节点设置标记索引，遍历的过程中移动索引
    * 在对开始和结束节点比较的时候，总共有四种情况
        * oldStartVnode / newStartVnode (旧开始节点 / 新开始节点)
        * oldEndVnode / newEndVnode (旧结束节点 / 新结束节点)
        * oldStartVnode / newEndVnode (旧开始节点 / 新结束节点)
        * oldEndVnode/ newStartVnode (旧结束节点 / 新开始节点)
        
        ![](./img/diff_1.jpg)
    * 开始节点和结束节点比较，这两种情况类似
        * oldStartVnode / newStartVnode (旧开始节点 / 新开始节点)
        * oldEndVnode / newEndVnode (旧结束节点 / 新结束节点)
    * 如果 oldStartVnode 和 newStartVnode 是 sameVnode(key 和 sel 相同)
        * 调用 patchVnode() 对比和更新节点
        * 把旧开始和新开始索引往后移动 oldStartVnode++ / newStartVnode++
        
        ![](./img/diff_2.jpg)
    * oldStartVnode / newEndVnode(旧开始节点 / 新结束节点)相同
        * 调用 patchVnode() 对比和更新节点
        * 把 oldStartVnode 对应的 DOM 元素，移动到右边
        * 更新索引
        
        ![](./img/diff_3.jpg)
    * oldEndVnode / newStartVnode(旧结束节点 / 新开始节点)相同
        * 调用 patchVnode() 对比和更新节点
        * 把oldEndVnode 对应的 DOM 元素，移动到左边
        * 更新索引
        
        ![](./img/diff_4.jpg)
    * 如果不是以上四种情况
        * 遍历新节点，使用 newStartVnode 的 key 在老节点数组中找相同节点
        * 如果没有找到，说明 newStartVnode 是新节点
            * 创建新节点对应的 DOM 元素，插入到 DOM 树中
        * 如果找到了
            * 判断新节点和找到的老节点的 sel 选择器是否相同
            * 如果不相同，说明节点被修改了
                * 重新创建对应的 DOM 元素，插入到 DOM 树中
            * 如果相同，把 elmToMove 对应的 DOM 元素，移动到左边
            
        ![](./img/diff_5.jpg)
    * 循环结束
        * 当老节点的所有子节点先遍历完(oldStartIdx > oldEndIdx)，循环结束
        * 新节点的所有子节点先遍历完(newStartIdx > newEndIdx)，循环结束
    * 如果老节点的数组先遍历完(oldStartIdx > oldEndIdx)，说明新节点有剩余，把剩余节点批量插入到右边
    
        ![](./img/diff_6.jpg)
    * 如果新节点的数组先遍历完(newStartIdx > newEndIdx)，说明老节点有剩余，把剩余节点批量删除
    
        ![](./img/diff_7.jpg)
