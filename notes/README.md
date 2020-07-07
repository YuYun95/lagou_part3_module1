## 一、Vue-Router 原理实现

### Hash 模式和 History 模式的区别
* 表现形式的区别
    * Hash 模式域名后面带有'#'，# 后面的是路由地址，可以通过问号携带参数
    * History 模式就是正常的url地址，需要服务端配置支持
* 原理区别
    * Hash 模式是基于锚点，通过锚点值作为路由地址；以及 onhashchange 事件，地址发生变化是触发onhashchange
    * History 模式是基于 HTML5 中的History API
        * history.pushState()，路径会发生变化，向服务器发送请求，IE10以后才支持
        * history.replaceState() 不会向服务器发送请求，只会改变浏览器地址，并且把地址记录在历史记录

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
      current: '/' // 存储当前的路由地址，默认是‘/’
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

  initEvent() {
    // 浏览器前进 后退
    window.addEventListener('popstate', () => {
      this.data.current = window.location.pathname
    })
  }
}

```
